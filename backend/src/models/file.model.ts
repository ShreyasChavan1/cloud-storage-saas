import { FileStat } from 'webdav'

export interface FileEntryDTO {
  name: string
  path: string
  type: 'file' | 'folder'
  size: number
  modifiedAt: string
  mimeType?: string
}

export function toFileEntryDTO(stat: FileStat): FileEntryDTO {
  return {
    name: stat.basename,
    path: stat.filename,
    type: stat.type === 'directory' ? 'folder' : 'file',
    size: stat.size,
    modifiedAt: new Date(stat.lastmod).toISOString(),
    ...(stat.mime ? { mimeType: stat.mime } : {}),
  }
}

export interface StorageStatsDTO {
  totalFiles: number
  totalFolders: number
  largestFiles: FileEntryDTO[]
  recentUploads: FileEntryDTO[]
}

const LARGEST_FILES_LIMIT = 10
const RECENT_UPLOADS_LIMIT = 10

// Pure aggregation over an already-fetched recursive listing — kept
// separate from the WebDAV call itself so it's trivially unit-testable
// without mocking any I/O, and reusable if another caller ever needs the
// same rollup from a listing it already has.
export function toStorageStatsDTO(stats: FileStat[]): StorageStatsDTO {
  const files = stats.filter((s) => s.type === 'file').map(toFileEntryDTO)
  const folderCount = stats.filter((s) => s.type === 'directory').length

  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, LARGEST_FILES_LIMIT)
  const recentUploads = [...files]
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    .slice(0, RECENT_UPLOADS_LIMIT)

  return {
    totalFiles: files.length,
    totalFolders: folderCount,
    largestFiles,
    recentUploads,
  }
}
