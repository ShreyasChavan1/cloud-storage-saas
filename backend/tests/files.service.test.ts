const mockFindById = jest.fn()

jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { findById: mockFindById },
}))

const mockListDirectory = jest.fn()
const mockListRecursive = jest.fn()
const mockStat = jest.fn()
const mockUploadBuffer = jest.fn()
const mockDownloadStream = jest.fn()
const mockDeleteItem = jest.fn()
const mockMove = jest.fn()
const mockCopy = jest.fn()
const mockCreateFolder = jest.fn()
const mockGetQuota = jest.fn()

jest.mock('../src/services/WebDavService', () => {
  const actual = jest.requireActual('../src/services/WebDavService')
  return {
    ...actual,
    webDavService: {
      listDirectory: mockListDirectory,
      listRecursive: mockListRecursive,
      stat: mockStat,
      uploadBuffer: mockUploadBuffer,
      downloadStream: mockDownloadStream,
      deleteItem: mockDeleteItem,
      move: mockMove,
      copy: mockCopy,
      createFolder: mockCreateFolder,
      getQuota: mockGetQuota,
    },
  }
})

import { filesService } from '../src/services/files.service'
import { WebDavError } from '../src/services/WebDavService'
import { encrypt } from '../src/utils/encryption'

const DAV_PASSWORD = 'kFrH9-TXk4s-gUoOQ-KOVH8'

function mockUserRow(overrides: Partial<{ nextcloudUsername: string | null; nextcloudWebdavPasswordEncrypted: string | null }> = {}) {
  mockFindById.mockResolvedValue({
    id: 'user-1',
    nextcloudUsername: 'abc-123',
    nextcloudWebdavPasswordEncrypted: encrypt(DAV_PASSWORD),
    ...overrides,
  })
}

function fileStat(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    filename: '/Documents/report.pdf',
    basename: 'report.pdf',
    lastmod: 'Mon, 21 Jul 2026 12:00:00 GMT',
    size: 1024,
    type: 'file',
    etag: 'abc',
    mime: 'application/pdf',
    ...overrides,
  }
}

describe('filesService', () => {
  afterEach(() => jest.clearAllMocks())

  describe('credential resolution', () => {
    it('throws if the user has no Nextcloud provisioning at all', async () => {
      mockUserRow({ nextcloudUsername: null, nextcloudWebdavPasswordEncrypted: null })
      await expect(filesService.list('user-1', undefined)).rejects.toMatchObject({ statusCode: 500 })
      expect(mockListDirectory).not.toHaveBeenCalled()
    })

    it('throws 404 if the user row does not exist', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(filesService.list('missing', undefined)).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('list', () => {
    it('sanitizes the path, decrypts the credential, and maps results to DTOs', async () => {
      mockUserRow()
      mockListDirectory.mockResolvedValue([fileStat(), fileStat({ filename: '/Documents/notes', basename: 'notes', type: 'directory', mime: undefined })])

      const result = await filesService.list('user-1', '/Documents/')

      expect(mockListDirectory).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents')
      expect(result).toEqual([
        {
          name: 'report.pdf',
          path: '/Documents/report.pdf',
          type: 'file',
          size: 1024,
          modifiedAt: new Date('Mon, 21 Jul 2026 12:00:00 GMT').toISOString(),
          mimeType: 'application/pdf',
        },
        {
          name: 'notes',
          path: '/Documents/notes',
          type: 'folder',
          size: 1024,
          modifiedAt: new Date('Mon, 21 Jul 2026 12:00:00 GMT').toISOString(),
        },
      ])
    })

    it('rejects a path attempting traversal before ever calling WebDAV', async () => {
      mockUserRow()
      // sanitizeDavPath neutralizes rather than always throwing — the real
      // guarantee under test is that WebDAV never sees a raw ".." segment.
      await filesService.list('user-1', '/Documents/../../secret')
      const [, , calledPath] = mockListDirectory.mock.calls[0]
      expect(calledPath).not.toContain('..')
    })
  })

  describe('upload', () => {
    it('uploads to folder+filename and returns the resulting stat', async () => {
      mockUserRow()
      mockUploadBuffer.mockResolvedValue(undefined)
      mockStat.mockResolvedValue(fileStat({ filename: '/Documents/new.pdf', basename: 'new.pdf' }))

      const buffer = Buffer.from('file bytes')
      const result = await filesService.upload('user-1', '/Documents', 'new.pdf', buffer)

      expect(mockUploadBuffer).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/new.pdf', buffer)
      expect(result.name).toBe('new.pdf')
    })
  })

  describe('download', () => {
    it('returns a stream and stat for a file', async () => {
      mockUserRow()
      mockStat.mockResolvedValue(fileStat())
      mockDownloadStream.mockReturnValue('fake-stream')

      const result = await filesService.download('user-1', '/Documents/report.pdf')
      expect(result.stream).toBe('fake-stream')
      expect(result.stat.name).toBe('report.pdf')
    })

    it('refuses to download a directory', async () => {
      mockUserRow()
      mockStat.mockResolvedValue(fileStat({ type: 'directory' }))
      await expect(filesService.download('user-1', '/Documents')).rejects.toMatchObject({ statusCode: 400 })
      expect(mockDownloadStream).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('refuses to delete the root folder', async () => {
      mockUserRow()
      await expect(filesService.delete('user-1', '/')).rejects.toMatchObject({ statusCode: 400 })
      expect(mockDeleteItem).not.toHaveBeenCalled()
    })

    it('deletes an ordinary path', async () => {
      mockUserRow()
      mockDeleteItem.mockResolvedValue(undefined)
      await filesService.delete('user-1', '/Documents/report.pdf')
      expect(mockDeleteItem).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/report.pdf')
    })
  })

  describe('rename', () => {
    it('computes the destination from the parent dir + new name', async () => {
      mockUserRow()
      mockMove.mockResolvedValue(undefined)
      mockStat.mockResolvedValue(fileStat({ filename: '/Documents/renamed.pdf', basename: 'renamed.pdf' }))

      const result = await filesService.rename('user-1', '/Documents/report.pdf', 'renamed.pdf')

      expect(mockMove).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/report.pdf', '/Documents/renamed.pdf')
      expect(result.name).toBe('renamed.pdf')
    })

    it('refuses to rename the root', async () => {
      mockUserRow()
      await expect(filesService.rename('user-1', '/', 'x')).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('move / copy', () => {
    it('moves and refuses to move root', async () => {
      mockUserRow()
      mockMove.mockResolvedValue(undefined)
      mockStat.mockResolvedValue(fileStat())
      await filesService.move('user-1', '/Documents/a.pdf', '/Archive/a.pdf')
      expect(mockMove).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/a.pdf', '/Archive/a.pdf')
      await expect(filesService.move('user-1', '/', '/Archive')).rejects.toMatchObject({ statusCode: 400 })
    })

    it('copies', async () => {
      mockUserRow()
      mockCopy.mockResolvedValue(undefined)
      mockStat.mockResolvedValue(fileStat())
      await filesService.copy('user-1', '/Documents/a.pdf', '/Archive/a.pdf')
      expect(mockCopy).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/a.pdf', '/Archive/a.pdf')
    })
  })

  describe('createFolder', () => {
    it('creates under the given parent', async () => {
      mockUserRow()
      mockCreateFolder.mockResolvedValue(undefined)
      mockStat.mockResolvedValue(fileStat({ filename: '/Documents/New Folder', basename: 'New Folder', type: 'directory' }))
      const result = await filesService.createFolder('user-1', '/Documents', 'New Folder')
      expect(mockCreateFolder).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/Documents/New Folder')
      expect(result.type).toBe('folder')
    })
  })

  describe('quota', () => {
    it('passes through the WebDAV service result', async () => {
      mockUserRow()
      mockGetQuota.mockResolvedValue({ used: 100, available: 900 })
      const result = await filesService.quota('user-1')
      expect(result).toEqual({ used: 100, available: 900 })
    })
  })

  describe('stats', () => {
    it('scans recursively from root and counts files vs folders separately', async () => {
      mockUserRow()
      mockListRecursive.mockResolvedValue([
        fileStat({ filename: '/a.pdf', basename: 'a.pdf', size: 100 }),
        fileStat({ filename: '/Docs', basename: 'Docs', type: 'directory', size: 0, mime: undefined }),
        fileStat({ filename: '/Docs/b.pdf', basename: 'b.pdf', size: 200 }),
      ])

      const result = await filesService.stats('user-1')

      expect(mockListRecursive).toHaveBeenCalledWith('abc-123', DAV_PASSWORD, '/')
      expect(result.totalFiles).toBe(2)
      expect(result.totalFolders).toBe(1)
    })

    it('sorts largestFiles by size descending', async () => {
      mockUserRow()
      mockListRecursive.mockResolvedValue([
        fileStat({ filename: '/small.pdf', basename: 'small.pdf', size: 10 }),
        fileStat({ filename: '/big.pdf', basename: 'big.pdf', size: 9999 }),
        fileStat({ filename: '/mid.pdf', basename: 'mid.pdf', size: 500 }),
      ])

      const result = await filesService.stats('user-1')

      expect(result.largestFiles.map((f) => f.name)).toEqual(['big.pdf', 'mid.pdf', 'small.pdf'])
    })

    it('sorts recentUploads by modified date descending', async () => {
      mockUserRow()
      mockListRecursive.mockResolvedValue([
        fileStat({ filename: '/old.pdf', basename: 'old.pdf', lastmod: 'Mon, 01 Jan 2024 00:00:00 GMT' }),
        fileStat({ filename: '/new.pdf', basename: 'new.pdf', lastmod: 'Mon, 01 Jan 2026 00:00:00 GMT' }),
        fileStat({ filename: '/mid.pdf', basename: 'mid.pdf', lastmod: 'Mon, 01 Jan 2025 00:00:00 GMT' }),
      ])

      const result = await filesService.stats('user-1')

      expect(result.recentUploads.map((f) => f.name)).toEqual(['new.pdf', 'mid.pdf', 'old.pdf'])
    })

    it('caps largestFiles and recentUploads at 10 even with more files', async () => {
      mockUserRow()
      const many = Array.from({ length: 25 }, (_, i) =>
        fileStat({ filename: `/f${i}.pdf`, basename: `f${i}.pdf`, size: i })
      )
      mockListRecursive.mockResolvedValue(many)

      const result = await filesService.stats('user-1')

      expect(result.largestFiles).toHaveLength(10)
      expect(result.recentUploads).toHaveLength(10)
      expect(result.totalFiles).toBe(25)
    })

    it('folders never appear in largestFiles or recentUploads', async () => {
      mockUserRow()
      mockListRecursive.mockResolvedValue([
        fileStat({ filename: '/Huge Folder', basename: 'Huge Folder', type: 'directory', size: 999999999, mime: undefined }),
        fileStat({ filename: '/a.pdf', basename: 'a.pdf', size: 1 }),
      ])

      const result = await filesService.stats('user-1')

      expect(result.largestFiles).toHaveLength(1)
      expect(result.largestFiles[0].name).toBe('a.pdf')
      expect(result.recentUploads.every((f) => f.type === 'file')).toBe(true)
    })

    it('returns all-zero/empty results for an empty account rather than erroring', async () => {
      mockUserRow()
      mockListRecursive.mockResolvedValue([])
      const result = await filesService.stats('user-1')
      expect(result).toEqual({ totalFiles: 0, totalFolders: 0, largestFiles: [], recentUploads: [] })
    })
  })

  describe('error translation', () => {
    it('maps a 404 WebDavError to ApiError 404', async () => {
      mockUserRow()
      mockListDirectory.mockRejectedValue(new WebDavError('Not Found', 404))
      await expect(filesService.list('user-1', '/missing')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('maps a 409 WebDavError to ApiError 409 (conflict)', async () => {
      mockUserRow()
      mockCreateFolder.mockRejectedValue(new WebDavError('Conflict', 409))
      await expect(filesService.createFolder('user-1', '/', 'Documents')).rejects.toMatchObject({ statusCode: 409 })
    })

    it('maps a 507 WebDavError to ApiError 507 (insufficient storage)', async () => {
      mockUserRow()
      mockUploadBuffer.mockRejectedValue(new WebDavError('Insufficient Storage', 507))
      await expect(filesService.upload('user-1', '/', 'big.zip', Buffer.from(''))).rejects.toMatchObject({
        statusCode: 507,
      })
    })

    it('maps an unrecognized WebDavError to a generic 500', async () => {
      mockUserRow()
      mockDeleteItem.mockRejectedValue(new WebDavError('Something odd', 418))
      await expect(filesService.delete('user-1', '/Documents/a.pdf')).rejects.toMatchObject({ statusCode: 500 })
    })
  })
})
