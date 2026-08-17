import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { AxiosError } from 'axios'
import { UploadQueueProvider, useUploadQueue, UploadEntry } from './UploadQueueContext'
import { CollectedFile } from '@/lib/collectFileEntries'

vi.mock('@/api/files', () => ({
  filesApi: {
    list: vi.fn(),
    upload: vi.fn(),
    createFolder: vi.fn(),
  },
}))
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { filesApi } from '@/api/files'

const mockList = vi.mocked(filesApi.list)
const mockUpload = vi.mocked(filesApi.upload)
const mockCreateFolder = vi.mocked(filesApi.createFolder)

function makeFile(name: string): File {
  return new File(['x'], name)
}

// Lets a test control exactly when each upload call resolves/rejects,
// rather than racing real timers — mirrors how the real axios call would
// eventually settle, but on command.
function deferredUploadMock() {
  const pending = new Map<string, { resolve: () => void; reject: (err: unknown) => void; signal?: AbortSignal }>()

  mockUpload.mockImplementation(
    (_path: string | undefined, file: File, _onProgress?: (p: number) => void, signal?: AbortSignal, uploadName?: string) => {
      const key = uploadName ?? file.name
      return new Promise<{ name: string; path: string; type: 'file'; size: number; modifiedAt: string }>(
        (resolve, reject) => {
          pending.set(key, {
            resolve: () => resolve({ name: key, path: `/${key}`, type: 'file', size: 1, modifiedAt: '' }),
            reject,
            signal,
          })
          signal?.addEventListener('abort', () => reject(new Error('canceled')))
        }
      )
    }
  )

  return {
    resolve: (name: string) => pending.get(name)?.resolve(),
    reject: (name: string, err: unknown) => pending.get(name)?.reject(err),
    calledWith: (name: string) => mockUpload.mock.calls.some((c: unknown[]) => (c[4] ?? (c[1] as File).name) === name),
    callCountFor: (name: string) =>
      mockUpload.mock.calls.filter((c: unknown[]) => (c[4] ?? (c[1] as File).name) === name).length,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <UploadQueueProvider>{children}</UploadQueueProvider>
    </QueryClientProvider>
  )
}

function fileEntries(entries: ReturnType<typeof useUploadQueue>['entries']): UploadEntry[] {
  return entries.filter((e): e is UploadEntry => e.kind === 'file')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue([])
  mockCreateFolder.mockResolvedValue({ name: 'x', path: '/x', type: 'folder', size: 0, modifiedAt: '' })
})

describe('upload queue: basic flow', () => {
  it('queues a file, uploads it, then removes it after success', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [{ file: makeFile('a.png'), relativePath: 'a.png' }]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })

    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('uploading'))
    expect(fileEntries(result.current.entries)[0].folderGroupId).toBeUndefined()

    await act(async () => {
      deferred.resolve('a.png')
      await Promise.resolve()
    })

    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('success'))
  })
})

describe('upload queue: concurrency', () => {
  it('never runs more than MAX_CONCURRENT (3) uploads at once, and fills freed slots', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const names = ['a', 'b', 'c', 'd', 'e']
    const items: CollectedFile[] = names.map((n) => ({ file: makeFile(`${n}.png`), relativePath: `${n}.png` }))

    await act(async () => {
      result.current.enqueue(items, undefined)
    })

    await waitFor(() => {
      const uploading = fileEntries(result.current.entries).filter((e) => e.status === 'uploading')
      expect(uploading).toHaveLength(3)
    })

    const queuedBefore = fileEntries(result.current.entries).filter((e) => e.status === 'queued')
    expect(queuedBefore).toHaveLength(2)

    // Finish one of the three in-flight uploads — a 4th (previously
    // queued) one should start to take its place.
    await act(async () => {
      deferred.resolve('a.png')
      await Promise.resolve()
    })

    await waitFor(() => {
      const uploading = fileEntries(result.current.entries).filter((e) => e.status === 'uploading')
      expect(uploading).toHaveLength(3)
    })
    expect(mockUpload).toHaveBeenCalledTimes(4)
  })
})

describe('upload queue: retry', () => {
  it('marks a failed upload as retryable and re-queues it on retryUpload', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [{ file: makeFile('a.png'), relativePath: 'a.png' }]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })
    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('uploading'))

    await act(async () => {
      deferred.reject('a.png', new Error('network blip'))
      await Promise.resolve()
    })

    await waitFor(() => {
      const entry = fileEntries(result.current.entries)[0]
      expect(entry?.status).toBe('error')
      expect(entry?.retryable).toBe(true)
    })

    await act(async () => {
      result.current.retryUpload(fileEntries(result.current.entries)[0].id)
    })

    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('uploading'))
    expect(mockUpload).toHaveBeenCalledTimes(2)

    await act(async () => {
      deferred.resolve('a.png')
      await Promise.resolve()
    })
    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('success'))
  })

  it('does not offer retry for a non-retryable (409) failure', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [{ file: makeFile('a.png'), relativePath: 'a.png' }]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })
    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('uploading'))

    const err = new AxiosError('conflict')
    err.response = { status: 409 } as AxiosError['response']
    await act(async () => {
      deferred.reject('a.png', err)
      await Promise.resolve()
    })

    await waitFor(() => {
      const entry = fileEntries(result.current.entries)[0]
      expect(entry?.status).toBe('error')
      expect(entry?.retryable).toBe(false)
    })
  })
})

describe('upload queue: cancel', () => {
  it('aborts an in-flight upload and marks it canceled', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [{ file: makeFile('a.png'), relativePath: 'a.png' }]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })
    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('uploading'))

    await act(async () => {
      result.current.cancelUpload(fileEntries(result.current.entries)[0].id)
      await Promise.resolve()
    })

    await waitFor(() => expect(fileEntries(result.current.entries)[0]?.status).toBe('canceled'))
    void deferred // referenced only to keep the mock alive for this test's upload() call
  })

  it('canceling a still-queued item frees a slot for the next one without ever calling upload for it', async () => {
    deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const names = ['a', 'b', 'c', 'd']
    const items: CollectedFile[] = names.map((n) => ({ file: makeFile(`${n}.png`), relativePath: `${n}.png` }))
    await act(async () => {
      result.current.enqueue(items, undefined)
    })

    await waitFor(() => {
      expect(fileEntries(result.current.entries).filter((e) => e.status === 'uploading')).toHaveLength(3)
    })
    const queued = fileEntries(result.current.entries).find((e) => e.status === 'queued')!
    expect(queued.name).toBe('d.png')

    await act(async () => {
      result.current.cancelUpload(queued.id)
    })

    expect(fileEntries(result.current.entries).find((e) => e.id === queued.id)?.status).toBe('canceled')
    expect(mockUpload).toHaveBeenCalledTimes(3) // never started for 'd'
  })
})

describe('upload queue: duplicate detection', () => {
  it('surfaces a conflict instead of uploading when the name already exists', async () => {
    mockList.mockResolvedValue([{ name: 'a.png', path: '/a.png', type: 'file', size: 1, modifiedAt: '' }])
    deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [{ file: makeFile('a.png'), relativePath: 'a.png' }]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].kind).toBe('conflict')
    })
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('"skip" drops the file without ever uploading it', async () => {
    mockList.mockResolvedValue([{ name: 'a.png', path: '/a.png', type: 'file', size: 1, modifiedAt: '' }])
    deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    await act(async () => {
      result.current.enqueue([{ file: makeFile('a.png'), relativePath: 'a.png' }], undefined)
    })
    await waitFor(() => expect(result.current.entries).toHaveLength(1))

    await act(async () => {
      result.current.resolveConflict(result.current.entries[0].id, 'skip')
    })

    expect(result.current.entries).toHaveLength(0)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('"replace" uploads with the original (colliding) name', async () => {
    mockList.mockResolvedValue([{ name: 'a.png', path: '/a.png', type: 'file', size: 1, modifiedAt: '' }])
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    await act(async () => {
      result.current.enqueue([{ file: makeFile('a.png'), relativePath: 'a.png' }], undefined)
    })
    await waitFor(() => expect(result.current.entries).toHaveLength(1))

    await act(async () => {
      result.current.resolveConflict(result.current.entries[0].id, 'replace')
    })

    await waitFor(() => expect(deferred.calledWith('a.png')).toBe(true))
  })

  it('"keep both" uploads under a renamed name, not the original collision', async () => {
    mockList.mockResolvedValue([{ name: 'a.png', path: '/a.png', type: 'file', size: 1, modifiedAt: '' }])
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    await act(async () => {
      result.current.enqueue([{ file: makeFile('a.png'), relativePath: 'a.png' }], undefined)
    })
    await waitFor(() => expect(result.current.entries).toHaveLength(1))

    await act(async () => {
      result.current.resolveConflict(result.current.entries[0].id, 'keep-both')
    })

    await waitFor(() => {
      const entry = fileEntries(result.current.entries)[0]
      expect(entry?.displayPath).toBe('a (1).png')
    })
    // The critical assertion: the server-facing upload call must carry the
    // renamed name, not the browser File object's original "a.png" — a
    // prior version of this code silently uploaded under the old name.
    expect(deferred.calledWith('a (1).png')).toBe(true)
    expect(deferred.calledWith('a.png')).toBe(false)
  })
})

describe('upload queue: folder uploads', () => {
  it('creates the implied folder structure before uploading nested files', async () => {
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    const items: CollectedFile[] = [
      { file: makeFile('a.png'), relativePath: 'Trip/a.png' },
      { file: makeFile('b.png'), relativePath: 'Trip/Day 1/b.png' },
    ]
    await act(async () => {
      result.current.enqueue(items, undefined)
    })

    await waitFor(() => expect(fileEntries(result.current.entries)).toHaveLength(2))

    expect(mockCreateFolder).toHaveBeenCalledWith(undefined, 'Trip')
    expect(mockCreateFolder).toHaveBeenCalledWith('/Trip', 'Day 1')
    // Parent must be created before the child.
    const tripCallIndex = mockCreateFolder.mock.calls.findIndex((c: unknown[]) => c[1] === 'Trip')
    const dayCallIndex = mockCreateFolder.mock.calls.findIndex((c: unknown[]) => c[1] === 'Day 1')
    expect(tripCallIndex).toBeLessThan(dayCallIndex)

    const nested = fileEntries(result.current.entries).find((e) => e.name === 'b.png')
    expect(nested?.displayPath).toBe('Trip/Day 1/b.png')
    expect(nested?.isFolderItem).toBe(true)

    // Both files came from the same "Trip" folder upload — the panel
    // needs a shared groupId to aggregate them into one row.
    const top = fileEntries(result.current.entries).find((e) => e.name === 'a.png')
    expect(top?.folderName).toBe('Trip')
    expect(nested?.folderName).toBe('Trip')
    expect(top?.folderGroupId).toBeDefined()
    expect(top?.folderGroupId).toBe(nested?.folderGroupId)

    await act(async () => {
      deferred.resolve('a.png')
      deferred.resolve('b.png')
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(fileEntries(result.current.entries).every((e) => e.status === 'success')).toBe(true)
    })
  })

  it('treats a 409 from createFolder as "already exists" and still uploads into it', async () => {
    const conflict = new AxiosError('exists')
    conflict.response = { status: 409 } as AxiosError['response']
    mockCreateFolder.mockRejectedValueOnce(conflict)
    const deferred = deferredUploadMock()
    const { result } = renderHook(() => useUploadQueue(), { wrapper })

    await act(async () => {
      result.current.enqueue([{ file: makeFile('a.png'), relativePath: 'Trip/a.png' }], undefined)
    })

    await waitFor(() => expect(fileEntries(result.current.entries)).toHaveLength(1))
    expect(fileEntries(result.current.entries)[0].status).toBe('uploading')
    void deferred
  })
})
