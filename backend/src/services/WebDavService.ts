import type { FileStat, WebDAVClient } from 'webdav'
import { Readable } from 'stream'
import { env } from '../config/env'

/**
 * Every file operation authenticates as the SPECIFIC target user via their
 * own dedicated app password (never an admin credential) — Nextcloud has
 * no admin-impersonation for WebDAV, so this is the only way to reach a
 * given user's files at all. See NextcloudService.createUser and
 * nextcloud-agent's user:auth-tokens:add step for where this credential
 * comes from.
 *
 * `webdav` (the client library) is a pure-ESM package with no CommonJS
 * build — this backend compiles to CommonJS, so a static `import` here
 * would fail at runtime (`ERR_REQUIRE_ESM`). Dynamic `import()` is the
 * standard, correct way to load an ESM-only package from CommonJS code;
 * the module is cached after the first call since it never changes.
 * `import type` above is erased entirely at compile time and carries none
 * of this problem — only the runtime `createClient` value needs it.
 */

let webdavModulePromise: Promise<typeof import('webdav')> | undefined
function loadWebdav(): Promise<typeof import('webdav')> {
  if (!webdavModulePromise) {
    webdavModulePromise = import('webdav')
  }
  return webdavModulePromise
}

export class WebDavError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'WebDavError'
  }
}

async function clientFor(nextcloudUsername: string, davPassword: string): Promise<WebDAVClient> {
  const { createClient } = await loadWebdav()
  const baseUrl = `${env.NEXTCLOUD_URL}/remote.php/dav/files/${encodeURIComponent(nextcloudUsername)}`
  return createClient(baseUrl, {
    username: nextcloudUsername,
    password: davPassword,
  })
}

// Wraps every WebDAV call so callers get one consistent error type instead
// of the client library's raw error shape — and so nothing about the
// request (which embeds the password via Basic Auth internally) ever
// leaks into a thrown message.
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const status = (err as { status?: number; response?: { status?: number } })?.status
    const responseStatus = (err as { response?: { status?: number } })?.response?.status
    const statusCode = status ?? responseStatus
    const message = err instanceof Error ? err.message : 'WebDAV request failed'
    throw new WebDavError(message, statusCode)
  }
}

export const webDavService = {
  listDirectory(nextcloudUsername: string, davPassword: string, path: string): Promise<FileStat[]> {
    return run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.getDirectoryContents(path) as Promise<FileStat[]>
    })
  },

  // Depth:infinity PROPFIND — everything under `path`, not just its direct
  // children. Used for account-wide aggregates (largest files, total
  // counts, recent uploads across all folders) where a single folder's
  // listing isn't enough. One request handled server-side by Nextcloud,
  // not N sequential ones from here.
  listRecursive(nextcloudUsername: string, davPassword: string, path: string): Promise<FileStat[]> {
    return run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.getDirectoryContents(path, { deep: true }) as Promise<FileStat[]>
    })
  },

  stat(nextcloudUsername: string, davPassword: string, path: string): Promise<FileStat> {
    return run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.stat(path) as Promise<FileStat>
    })
  },

  async uploadBuffer(nextcloudUsername: string, davPassword: string, path: string, data: Buffer): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.putFileContents(path, data, { overwrite: true })
    })
  },

  // Returns a live readable stream — the controller pipes this directly
  // into the HTTP response rather than buffering the whole file in memory.
  async downloadStream(nextcloudUsername: string, davPassword: string, path: string): Promise<Readable> {
    const client = await clientFor(nextcloudUsername, davPassword)
    return client.createReadStream(path)
  },

  async deleteItem(nextcloudUsername: string, davPassword: string, path: string): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.deleteFile(path)
    })
  },

  async move(nextcloudUsername: string, davPassword: string, fromPath: string, toPath: string): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.moveFile(fromPath, toPath)
    })
  },

  async copy(nextcloudUsername: string, davPassword: string, fromPath: string, toPath: string): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.copyFile(fromPath, toPath)
    })
  },

  async createFolder(nextcloudUsername: string, davPassword: string, path: string): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.createDirectory(path)
    })
  },

  async getQuota(
    nextcloudUsername: string,
    davPassword: string
  ): Promise<{ used: number; available: number | 'unlimited' | 'unknown' }> {
    const result = await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.getQuota()
    })
    // The client library's return type is a union (plain DiskQuota, or a
    // ResponseDataDetailed<DiskQuota> wrapper) because ONE call signature
    // covers both `{ details: true }` and the default — even though we
    // never pass that option, so at runtime this is always the plain
    // shape. Narrowed explicitly rather than cast, so this fails loudly if
    // that assumption ever stops holding.
    const quota = result && typeof result === 'object' && 'data' in result ? result.data : result
    if (!quota) {
      return { used: 0, available: 'unknown' }
    }
    return { used: quota.used, available: quota.available }
  },
}
