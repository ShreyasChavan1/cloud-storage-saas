import { api } from '@/lib/api'

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size: number
  modifiedAt: string
  mimeType?: string
  favorite?: boolean
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

  favorites: () =>
    api.get<{ data: { entries: FileEntry[] } }>('/files/favorites').then((r) => r.data.data.entries),

  setFavorite: (path: string, favorite: boolean) =>
    api.put<{ data: { favorite: { path: string; favorite: boolean } } }>('/files/favorite', { path, favorite }).then((r) => r.data.data.favorite),

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

  // Large files are sent as many small requests instead of one huge one, so
  // no single request runs long enough for a proxy (Railway, Cloudflare...) to
  // cut it off. The backend streams each piece straight through to Nextcloud,
  // which stitches them together when we call "complete".
  uploadChunked: async (
    path: string | undefined,
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
    fileName?: string
  ) => {
    const filename = fileName ?? file.name
    const session = await api.post<{ data: { uploadId: string; chunkSize: number } }>(
      '/files/upload/session',
      { path, filename, size: file.size },
      { signal }
    )
    const { uploadId, chunkSize } = session.data.data
    const totalChunks = Math.ceil(file.size / chunkSize)
    let sentBytes = 0
    let completing = false

    try {
      for (let i = 0; i < totalChunks; i += 1) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const piece = file.slice(start, end)

        // A dropped connection mid-chunk shouldn't throw away the whole
        // upload — retry just this piece a few times. Re-sending a chunk
        // simply overwrites it on the server.
        for (let attempt = 1; ; attempt += 1) {
          try {
            await api.put(`/files/upload/session/${uploadId}/chunk/${i + 1}`, piece, {
              params: { path, filename, size: file.size },
              headers: { 'Content-Type': 'application/octet-stream' },
              signal,
              onUploadProgress: (evt) => {
                // Hold at 99% until the very last byte is accepted.
                const done = sentBytes + (evt.loaded ?? 0)
                onProgress?.(Math.min(99, Math.round((done / file.size) * 100)))
              },
            })
            break
          } catch (err) {
            const status = (err as { response?: { status?: number } }).response?.status
            const retryable = status === undefined || status >= 500 || status === 408 || status === 429
            if (signal?.aborted || !retryable || attempt >= 3) throw err
            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
          }
        }

        sentBytes = end
        onProgress?.(sentBytes >= file.size ? 100 : Math.min(99, Math.round((sentBytes / file.size) * 100)))
      }

      completing = true
      const res = await api.post<{ data: { entry: FileEntry } }>(
        `/files/upload/session/${uploadId}/complete`,
        { path, filename, size: file.size },
        { signal }
      )
      return res.data.data.entry
    } catch (err) {
      // Clean up the half-finished upload on the server — but never once the
      // final "assemble" step has started: that request may still be running
      // on the server even if our connection to it dropped.
      if (!completing) {
        void api.delete(`/files/upload/session/${uploadId}`).catch(() => undefined)
      }
      throw err
    }
  },

  // Triggers a real browser download — the backend streams the file bytes,
  // this just turns that response into a saved file rather than returning
  // the blob to the caller.
  preview: async (path: string, signal?: AbortSignal) => {
    const res = await api.get('/files/preview', { params: { path }, responseType: 'blob', signal })
    return res.data as Blob
  },

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
export const versionsApi={list:(path:string)=>api.get('/files/versions',{params:{path}}).then(r=>r.data.data),restore:(path:string,revision:string)=>api.post('/files/versions/restore',{path,revision}).then(r=>r.data.data.entry)}

export interface TrashEntry {
  id: string
  name: string
  originalLocation: string
  deletedAt: string
  type: 'file' | 'folder'
  size: number
}

export const trashApi = {
  list: () => api.get<{ data: { items: TrashEntry[] } }>('/files/trash').then((r) => r.data.data.items),
  restore: (id: string) => api.post(`/files/trash/${encodeURIComponent(id)}/restore`).then(() => undefined),
  deleteForever: (id: string) => api.delete(`/files/trash/${encodeURIComponent(id)}`).then(() => undefined),
  empty: () => api.delete('/files/trash').then(() => undefined),
}
