import type { FileStat, WebDAVClient } from 'webdav'
import { Readable } from 'stream'
import { createReadStream } from 'fs'
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// customRequest() hands back the raw response without checking its status,
// so every chunked-upload call goes through this to turn 4xx/5xx into the
// same WebDavError (with a statusCode) the rest of this service throws.
async function assertOk(res: { status: number; text?: () => Promise<string> }, what: string): Promise<void> {
  if (res.status >= 400) {
    // Nextcloud explains a rejection in the XML body (<s:message>...). Pull
    // that out so logs say WHY, not just the status code.
    let detail = ''
    try {
      const body = (await res.text?.()) ?? ''
      const match = /<s:message>([^<]*)<\/s:message>/.exec(body)
      detail = (match ? match[1] : body).replace(/\s+/g, ' ').trim().slice(0, 300)
    } catch {
      // body unreadable — the status code alone will have to do
    }
    const err = new Error(`${what} failed with status ${res.status}${detail ? `: ${detail}` : ''}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
}

const encodeDavPath = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

async function clientFor(nextcloudUsername: string, davPassword: string): Promise<WebDAVClient> {
  const { createClient } = await loadWebdav()
  const baseUrl = `${env.NEXTCLOUD_URL}/remote.php/dav/files/${encodeURIComponent(nextcloudUsername)}`
  return createClient(baseUrl, {
    username: nextcloudUsername,
    password: davPassword,
  })
}

// Nextcloud's chunked-upload API lives under its own DAV root
// (remote.php/dav/uploads/<user>), separate from the files root above.
async function uploadsClientFor(nextcloudUsername: string, davPassword: string): Promise<WebDAVClient> {
  const { createClient } = await loadWebdav()
  return createClient(`${env.NEXTCLOUD_URL}/remote.php/dav/uploads/${encodeURIComponent(nextcloudUsername)}`, {
    username: nextcloudUsername,
    password: davPassword,
  })
}

function destinationUrl(nextcloudUsername: string, destinationPath: string): string {
  return `${env.NEXTCLOUD_URL}/remote.php/dav/files/${encodeURIComponent(nextcloudUsername)}${encodeDavPath(destinationPath)}`
}

// Chunk names just need to sort in upload order.
const chunkName = (index: number) => String(index).padStart(5, '0')

// Wraps every WebDAV call so callers get one consistent error type instead
// of the client library's raw error shape — and so nothing about the
// request (which embeds the password via Basic Auth internally) ever
// leaks into a thrown message.
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const davErr = err as {
      status?: number
      statusCode?: number
      response?: { status?: number; statusCode?: number }
    }
    const statusCode = davErr.status ?? davErr.statusCode ?? davErr.response?.status ?? davErr.response?.statusCode
    let message = err instanceof Error ? err.message : 'WebDAV request failed'

    // The webdav library's own error only says "Invalid response: 413 ..." and
    // drops Nextcloud's explanation, which sits in the response body. Read it
    // (when there is one and it hasn't been consumed) so logs show the reason.
    const res = (err as { response?: { text?: () => Promise<string>; bodyUsed?: boolean } }).response
    if (res && typeof res.text === 'function' && !res.bodyUsed) {
      try {
        const body = await res.text()
        const match = /<s:message>([^<]*)<\/s:message>/.exec(body)
        const detail = (match ? match[1] : body).replace(/\s+/g, ' ').trim().slice(0, 300)
        if (detail) message = `${message} | ${detail}`
      } catch {
        // body unreadable — keep the original message
      }
    }
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

  // Streams a file that is already on local disk to Nextcloud instead of
  // holding it in RAM. The byte length is sent explicitly so the PUT goes out
  // with a Content-Length header rather than chunked transfer-encoding —
  // Nextcloud/Apache handle that far more reliably for very large files.
  async uploadFromFile(nextcloudUsername: string, davPassword: string, path: string, localPath: string, size: number): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      const body = createReadStream(localPath)
      // An unhandled 'error' event would be an uncaught exception, and
      // server.ts exits the whole process on those. The failure itself still
      // surfaces through the rejected PUT below.
      body.on('error', () => undefined)
      return client.putFileContents(path, body as any, { overwrite: true, contentLength: size })
    })
  },

  async uploadStream(nextcloudUsername: string, davPassword: string, path: string, data: NodeJS.ReadableStream): Promise<void> {
    await run(async () => {
      const client = await clientFor(nextcloudUsername, davPassword)
      return client.putFileContents(path, data as any, { overwrite: true })
    })
  },


  // ---- Chunked upload (Nextcloud chunking v2) -------------------------
  // The browser sends the file as many small requests instead of one huge
  // one, so no single request runs long enough to hit a proxy time limit.
  // Chunks are streamed straight through to Nextcloud — nothing is written
  // to this server's disk or held in memory.
  async startChunkedUpload(nextcloudUsername: string, davPassword: string, uploadId: string, destinationPath: string): Promise<void> {
    await run(async () => {
      const client = await uploadsClientFor(nextcloudUsername, davPassword)
      const res = await client.customRequest(`/${uploadId}`, {
        method: 'MKCOL',
        headers: { Destination: destinationUrl(nextcloudUsername, destinationPath) },
      } as any)
      await assertOk(res, 'Creating the upload session')
    })
  },

  async putUploadChunk(
    nextcloudUsername: string,
    davPassword: string,
    uploadId: string,
    index: number,
    destinationPath: string,
    totalSize: number,
    chunkLength: number,
    data: NodeJS.ReadableStream
  ): Promise<void> {
    await run(async () => {
      const client = await uploadsClientFor(nextcloudUsername, davPassword)
      return client.putFileContents(`/${uploadId}/${chunkName(index)}`, data as any, {
        overwrite: true,
        contentLength: chunkLength,
        headers: {
          'OC-Total-Length': String(totalSize),
          Destination: destinationUrl(nextcloudUsername, destinationPath),
        },
      } as any)
    })
  },

  // Tells Nextcloud to stitch the chunks together at the destination.
  async finishChunkedUpload(
    nextcloudUsername: string,
    davPassword: string,
    uploadId: string,
    destinationPath: string,
    totalSize: number
  ): Promise<void> {
    await run(async () => {
      const client = await uploadsClientFor(nextcloudUsername, davPassword)
      const res = await client.customRequest(`/${uploadId}/.file`, {
        method: 'MOVE',
        headers: {
          Destination: destinationUrl(nextcloudUsername, destinationPath),
          'OC-Total-Length': String(totalSize),
          Overwrite: 'T',
        },
      } as any)
      await assertOk(res, 'Assembling the uploaded file')
    })
  },

  async abortChunkedUpload(nextcloudUsername: string, davPassword: string, uploadId: string): Promise<void> {
    await run(async () => {
      const client = await uploadsClientFor(nextcloudUsername, davPassword)
      const res = await client.customRequest(`/${uploadId}`, { method: 'DELETE' } as any)
      if (res.status !== 404) await assertOk(res, 'Cancelling the upload')
    })
  },

  // Returns a live readable stream — the controller pipes this directly
  // into the HTTP response rather than buffering the whole file in memory.
  async downloadStream(nextcloudUsername: string, davPassword: string, path: string, signal?: AbortSignal): Promise<Readable> {
    const client = await clientFor(nextcloudUsername, davPassword)
    // `signal` lets the controller cut the Nextcloud connection when the
    // browser goes away — otherwise a half-read download keeps the file
    // locked on the Nextcloud side and later deletes fail with 423.
    return signal ? client.createReadStream(path, { signal } as any) : client.createReadStream(path)
  },

  // Nextcloud answers 423 (Locked) while another request still has the file
  // open — an upload that is finishing, or a download that was interrupted.
  // Those locks normally clear within seconds, so retry a few times before
  // giving up instead of failing the delete straight away.
  async deleteItem(nextcloudUsername: string, davPassword: string, path: string): Promise<void> {
    const retryDelaysMs = [1000, 2000, 4000]
    for (let attempt = 0; ; attempt += 1) {
      try {
        await run(async () => {
          const client = await clientFor(nextcloudUsername, davPassword)
          return client.deleteFile(path)
        })
        return
      } catch (err) {
        if (err instanceof WebDavError && err.statusCode === 423 && attempt < retryDelaysMs.length) {
          await sleep(retryDelaysMs[attempt])
          continue
        }
        throw err
      }
    }
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

  async getFileId(u:string,p:string,path:string):Promise<string>{return run(async()=>{const c=await clientFor(u,p);const r=await c.customRequest(path,{method:'PROPFIND',headers:{Depth:'0','Content-Type':'application/xml'},data:'<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>'} as any);const x=await r.text();const m=x.match(/<[^:>]*:fileid[^>]*>([^<]+)<\/[^:>]*:fileid>/i);if(!m)throw new Error('Nextcloud did not return a file id');return m[1]})},
  async listVersions(u:string,p:string,id:string){return run(async()=>{const {createClient}=await loadWebdav();const c=createClient(`${env.NEXTCLOUD_URL}/remote.php/dav/versions/${encodeURIComponent(u)}`,{username:u,password:p});const r=await c.customRequest(`/versions/${encodeURIComponent(id)}`,{method:'PROPFIND',headers:{Depth:'1'}} as any);const x=await r.text();return [...x.matchAll(/<[^:>]*:response[^>]*>([\s\S]*?)<\/[^:>]*:response>/gi)].map(m=>{const q=m[1],h=q.match(/<[^:>]*:href[^>]*>([\s\S]*?)<\/[^:>]*:href>/i)?.[1]||'',rev=decodeURIComponent(h.replace(/\/+$/,'').split('/').pop()||'');return {revision:rev,modifiedAt:q.match(/<[^:>]*:getlastmodified[^>]*>([\s\S]*?)<\/[^:>]*:getlastmodified>/i)?.[1]||'',size:Number(q.match(/<[^:>]*:getcontentlength[^>]*>([\s\S]*?)<\/[^:>]*:getcontentlength>/i)?.[1]||0)}}).filter(v=>/^\d+$/.test(v.revision)).sort((a,b)=>Number(b.revision)-Number(a.revision))})},
  async restoreVersion(u:string,p:string,id:string,rev:string){await run(async()=>{const {createClient}=await loadWebdav();const c=createClient(`${env.NEXTCLOUD_URL}/remote.php/dav/versions/${encodeURIComponent(u)}`,{username:u,password:p});await c.customRequest(`/versions/${encodeURIComponent(id)}/${encodeURIComponent(rev)}`,{method:'MOVE',headers:{Destination:`${env.NEXTCLOUD_URL}/remote.php/dav/versions/${encodeURIComponent(u)}/restore`}} as any)})},

  // Trashbin — a separate DAV root (remote.php/dav/trashbin/<user>/trash/),
  // same pattern as versions above. Nextcloud's own Deleted-files app is
  // what actually moves files here on every regular DELETE against the
  // files root (webDavService.deleteItem) — enabled by default on any
  // standard Nextcloud install, no server-side change needed for that
  // part. These three methods are purely about reading/managing what's
  // already there: list what's in trash, restore an item to its original
  // location, or purge one permanently.
  async listTrash(u:string,p:string){return run(async()=>{const {createClient}=await loadWebdav();const base=`${env.NEXTCLOUD_URL}/remote.php/dav/trashbin/${encodeURIComponent(u)}`;const c=createClient(base,{username:u,password:p});const r=await c.customRequest('/trash/',{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml'},data:'<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><d:displayname/><d:getcontentlength/><d:getlastmodified/><d:resourcetype/><oc:trashbin-original-location/><oc:trashbin-deletion-time/></d:prop></d:propfind>'} as any);const x=await r.text();return [...x.matchAll(/<[^:>]*:response[^>]*>([\s\S]*?)<\/[^:>]*:response>/gi)].map(m=>{const q=m[1];const h=q.match(/<[^:>]*:href[^>]*>([\s\S]*?)<\/[^:>]*:href>/i)?.[1]||'';const id=decodeURIComponent(h.replace(/\/+$/,'').split('/').pop()||'');const isFolder=/<[^:>]*:collection\b/i.test(q);return {id,name:q.match(/<[^:>]*:displayname[^>]*>([\s\S]*?)<\/[^:>]*:displayname>/i)?.[1]||id,originalLocation:q.match(/<[^:>]*:trashbin-original-location[^>]*>([\s\S]*?)<\/[^:>]*:trashbin-original-location>/i)?.[1]||'',deletedAt:q.match(/<[^:>]*:trashbin-deletion-time[^>]*>([\s\S]*?)<\/[^:>]*:trashbin-deletion-time>/i)?.[1]||'',type:(isFolder?'folder':'file') as 'file'|'folder',size:Number(q.match(/<[^:>]*:getcontentlength[^>]*>([\s\S]*?)<\/[^:>]*:getcontentlength>/i)?.[1]||0)}}).filter(v=>v.id && v.id!=='trash')})},

  async restoreTrashItem(u:string,p:string,id:string){await run(async()=>{const {createClient}=await loadWebdav();const base=`${env.NEXTCLOUD_URL}/remote.php/dav/trashbin/${encodeURIComponent(u)}`;const c=createClient(base,{username:u,password:p});await c.customRequest(`/trash/${encodeURIComponent(id)}`,{method:'MOVE',headers:{Destination:`${base}/restore/${encodeURIComponent(id)}`}} as any)})},

  async deleteTrashItem(u:string,p:string,id:string){await run(async()=>{const {createClient}=await loadWebdav();const base=`${env.NEXTCLOUD_URL}/remote.php/dav/trashbin/${encodeURIComponent(u)}`;const c=createClient(base,{username:u,password:p});await c.customRequest(`/trash/${encodeURIComponent(id)}`,{method:'DELETE'} as any)})},

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
