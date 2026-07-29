import { createContext, useCallback, useContext, useState, ReactNode } from 'react'

export interface UploadItem {
  id: string
  name: string
  percent: number
  status: 'uploading' | 'success' | 'error'
}

interface UploadQueueContextValue {
  uploads: UploadItem[]
  startUpload: (name: string) => string
  updateProgress: (id: string, percent: number) => void
  finishUpload: (id: string, status: 'success' | 'error') => void
}

const UploadQueueContext = createContext<UploadQueueContextValue | undefined>(undefined)

let nextId = 0
// How long a finished item (success or error) stays visible before it's
// removed from the tray — long enough to notice, short enough not to clutter.
const REMOVE_DELAY_MS = 2500

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([])

  const startUpload = useCallback((name: string) => {
    const id = String(nextId++)
    setUploads((items) => [...items, { id, name, percent: 0, status: 'uploading' }])
    return id
  }, [])

  const updateProgress = useCallback((id: string, percent: number) => {
    setUploads((items) => items.map((item) => (item.id === id ? { ...item, percent } : item)))
  }, [])

  const finishUpload = useCallback((id: string, status: 'success' | 'error') => {
    setUploads((items) => items.map((item) => (item.id === id ? { ...item, status, percent: 100 } : item)))
    setTimeout(() => {
      setUploads((items) => items.filter((item) => item.id !== id))
    }, REMOVE_DELAY_MS)
  }, [])

  return (
    <UploadQueueContext.Provider value={{ uploads, startUpload, updateProgress, finishUpload }}>
      {children}
    </UploadQueueContext.Provider>
  )
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider')
  return ctx
}
