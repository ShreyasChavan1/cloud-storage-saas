import { api } from '@/lib/api'

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size: number
  modifiedAt: string
  mimeType?: string
}

export interface QuotaInfo {
  used: number
  available: number | 'unlimited' | 'unknown'
}

export interface StorageStats {
  totalFiles: number
  totalFolders: number
  largestFiles: FileEntry[]
  recentUploads: FileEntry[]
}

export const filesApi = {
  list: (path?: string) =>
    api.get<{ data: { entries: FileEntry[] } }>('/files', { params: { path } }).then((r) => r.data.data.entries),

  upload: (
    path: string | undefined,
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
    // Overrides the filename sent to the server — needed when a client-side
    // rename (e.g. "keep both" on a duplicate) doesn't match the browser
    // File object's own immutable `.name`.
    fileName?: string
  ) => {
    const formData = new FormData()
    formData.append('file', file, fileName ?? file.name)
    return api
      .post<{ data: { entry: FileEntry } }>('/files/upload', formData, {
        params: { path },
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      .then((r) => r.data.data.entry)
  },

  // Triggers a real browser download — the backend streams the file bytes,
  // this just turns that response into a saved file rather than returning
  // the blob to the caller.
  download: async (path: string, filename: string) => {
    const res = await api.get('/files/download', { params: { path }, responseType: 'blob' })
    const url = window.URL.createObjectURL(res.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  delete: (path: string) => api.delete('/files', { params: { path } }).then(() => undefined),

  rename: (path: string, newName: string) =>
    api.patch<{ data: { entry: FileEntry } }>('/files/rename', { path, newName }).then((r) => r.data.data.entry),

  createFolder: (path: string | undefined, name: string) =>
    api.post<{ data: { entry: FileEntry } }>('/files/folder', { path, name }).then((r) => r.data.data.entry),

  move: (from: string, to: string) =>
    api.post<{ data: { entry: FileEntry } }>('/files/move', { from, to }).then((r) => r.data.data.entry),

  copy: (from: string, to: string) =>
    api.post<{ data: { entry: FileEntry } }>('/files/copy', { from, to }).then((r) => r.data.data.entry),

  quota: () => api.get<{ data: QuotaInfo }>('/files/quota').then((r) => r.data.data),

  stats: () => api.get<{ data: StorageStats }>('/files/stats').then((r) => r.data.data),
}
