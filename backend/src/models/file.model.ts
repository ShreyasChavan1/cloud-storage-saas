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
