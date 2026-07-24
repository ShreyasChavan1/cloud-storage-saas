import { posix } from 'path'
import { userRepository } from '../repositories/user.repository'
import { webDavService, WebDavError } from './WebDavService'
import { sanitizeDavPath } from '../utils/davPath'
import { decrypt } from '../utils/encryption'
import { ApiError } from '../utils/ApiError'
import { toFileEntryDTO, FileEntryDTO } from '../models/file.model'

interface DavCredentials {
  nextcloudUsername: string
  davPassword: string
}

async function getUserDavCredentials(userId: string): Promise<DavCredentials> {
  const user = await userRepository.findById(userId)
  if (!user) throw ApiError.notFound('User not found')
  if (!user.nextcloudUsername || !user.nextcloudWebdavPasswordEncrypted) {
    // Shouldn't happen in practice — registration always provisions both
    // together or rolls back entirely — but fail clearly if it ever does,
    // rather than passing `undefined` into a WebDAV request.
    throw ApiError.internal('This account has no storage backend provisioned')
  }
  return {
    nextcloudUsername: user.nextcloudUsername,
    davPassword: decrypt(user.nextcloudWebdavPasswordEncrypted),
  }
}

// Translates the WebDAV client's error shape into this API's ApiError
// conventions — never rethrows the raw error (which could, in principle,
// have Basic Auth details attached somewhere in its internals).
function translateWebDavError(err: unknown): never {
  if (err instanceof WebDavError) {
    if (err.statusCode === 404) throw ApiError.notFound('File or folder not found')
    if (err.statusCode === 409 || err.statusCode === 412) {
      throw ApiError.conflict('A conflicting item already exists at that location')
    }
    if (err.statusCode === 507) throw ApiError.insufficientStorage()
  }
  throw ApiError.internal('File storage request failed')
}

export const filesService = {
  async list(userId: string, rawPath: string | undefined): Promise<FileEntryDTO[]> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const path = sanitizeDavPath(rawPath)
    try {
      const entries = await webDavService.listDirectory(nextcloudUsername, davPassword, path)
      return entries.map(toFileEntryDTO)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async upload(
    userId: string,
    rawPath: string | undefined,
    filename: string,
    data: Buffer
  ): Promise<FileEntryDTO> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const folder = sanitizeDavPath(rawPath)
    const destination = sanitizeDavPath(posix.join(folder, filename))
    try {
      await webDavService.uploadBuffer(nextcloudUsername, davPassword, destination, data)
      const stat = await webDavService.stat(nextcloudUsername, davPassword, destination)
      return toFileEntryDTO(stat)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async download(
    userId: string,
    rawPath: string
  ): Promise<{ stream: NodeJS.ReadableStream; stat: FileEntryDTO }> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const path = sanitizeDavPath(rawPath)
    try {
      const stat = await webDavService.stat(nextcloudUsername, davPassword, path)
      if (stat.type === 'directory') {
        throw ApiError.badRequest('Cannot download a folder directly')
      }
      const stream = await webDavService.downloadStream(nextcloudUsername, davPassword, path)
      return { stream, stat: toFileEntryDTO(stat) }
    } catch (err) {
      if (err instanceof ApiError) throw err
      translateWebDavError(err)
    }
  },

  async delete(userId: string, rawPath: string): Promise<void> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const path = sanitizeDavPath(rawPath)
    if (path === '/') throw ApiError.badRequest('Cannot delete the root folder')
    try {
      await webDavService.deleteItem(nextcloudUsername, davPassword, path)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async rename(userId: string, rawPath: string, newName: string): Promise<FileEntryDTO> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const path = sanitizeDavPath(rawPath)
    if (path === '/') throw ApiError.badRequest('Cannot rename the root folder')

    const parent = posix.dirname(path)
    const destination = sanitizeDavPath(posix.join(parent, newName))
    try {
      await webDavService.move(nextcloudUsername, davPassword, path, destination)
      const stat = await webDavService.stat(nextcloudUsername, davPassword, destination)
      return toFileEntryDTO(stat)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async createFolder(userId: string, rawPath: string | undefined, name: string): Promise<FileEntryDTO> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const parent = sanitizeDavPath(rawPath)
    const destination = sanitizeDavPath(posix.join(parent, name))
    try {
      await webDavService.createFolder(nextcloudUsername, davPassword, destination)
      const stat = await webDavService.stat(nextcloudUsername, davPassword, destination)
      return toFileEntryDTO(stat)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async move(userId: string, fromRaw: string, toRaw: string): Promise<FileEntryDTO> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const from = sanitizeDavPath(fromRaw)
    const to = sanitizeDavPath(toRaw)
    if (from === '/') throw ApiError.badRequest('Cannot move the root folder')
    try {
      await webDavService.move(nextcloudUsername, davPassword, from, to)
      const stat = await webDavService.stat(nextcloudUsername, davPassword, to)
      return toFileEntryDTO(stat)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async copy(userId: string, fromRaw: string, toRaw: string): Promise<FileEntryDTO> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    const from = sanitizeDavPath(fromRaw)
    const to = sanitizeDavPath(toRaw)
    if (from === '/') throw ApiError.badRequest('Cannot copy the root folder')
    try {
      await webDavService.copy(nextcloudUsername, davPassword, from, to)
      const stat = await webDavService.stat(nextcloudUsername, davPassword, to)
      return toFileEntryDTO(stat)
    } catch (err) {
      translateWebDavError(err)
    }
  },

  async quota(userId: string): Promise<{ used: number; available: number | 'unlimited' | 'unknown' }> {
    const { nextcloudUsername, davPassword } = await getUserDavCredentials(userId)
    try {
      return await webDavService.getQuota(nextcloudUsername, davPassword)
    } catch (err) {
      translateWebDavError(err)
    }
  },
}
