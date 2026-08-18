import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { UploadQueueProvider, useUploadQueue } from './UploadQueueContext'
import { UploadDropzone } from '@/components/files/UploadDropzone'
import { UploadProgressPanel } from '@/components/files/UploadProgressPanel'
import { ToastProvider } from '@/context/ToastContext'

// This suite deliberately does NOT call enqueue() directly like the other
// upload-queue tests do — it renders the *real* UploadDropzone and fires a
// *real* DOM drop event, to catch bugs that only show up in the actual
// wiring (event → traversal → enqueue → API), which calling enqueue()
// directly would never exercise.

vi.mock('@/api/files', () => ({
  filesApi: {
    list: vi.fn(),
    upload: vi.fn(),
    createFolder: vi.fn(),
  },
}))
import { filesApi } from '@/api/files'
const mockList = vi.mocked(filesApi.list)
const mockUpload = vi.mocked(filesApi.upload)
const mockCreateFolder = vi.mocked(filesApi.createFolder)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <UploadQueueProvider>{children}</UploadQueueProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

function makeFile(name: string): File {
  return new File(['x'], name)
}

// Fakes exactly what a real browser folder drag produces.
function fakeFileEntry(name: string, fullPath: string, file: File) {
  return { isFile: true, isDirectory: false, name, fullPath, file: (ok: (f: File) => void) => ok(file) }
}
function fakeDirEntry(name: string, fullPath: string, children: unknown[]) {
  let read = false
  return {
    isFile: false,
    isDirectory: true,
    name,
    fullPath,
    createReader: () => ({
      readEntries: (ok: (entries: unknown[]) => void) => {
        if (read) return ok([])
        read = true
        ok(children)
      },
    }),
  }
}
function fakeDropEvent(topEntry: unknown) {
  return { dataTransfer: { items: [{ webkitGetAsEntry: () => topEntry }], files: [], types: ['Files'] } }
}

function findDropzoneRoot() {
  // The dropzone's onDrop handler is on the OUTERMOST div; the visible
  // text sits two levels deeper. Walking up from the text to the nearest
  // div, then one more level, reaches the real drop target.
  return screen.getByText(/drag & drop files or folders here/i).closest('div')!.parentElement!
}

function FullPipeline() {
  const { enqueue } = useUploadQueue()
  return (
    <>
      <UploadDropzone onItemsSelected={(items) => enqueue(items, undefined)} />
      <UploadProgressPanel />
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue([])
  mockCreateFolder.mockResolvedValue({ name: 'x', path: '/x', type: 'folder', size: 0, modifiedAt: '' })
  mockUpload.mockResolvedValue({ name: 'x', path: '/x', type: 'file', size: 1, modifiedAt: '' })
})

describe('end-to-end: real folder drag-and-drop', () => {
  it('a real folder drop results in createFolder + upload calls with correct arguments', async () => {
    const a = makeFile('a.png')
    const b = makeFile('b.png')
    const folderEntry = fakeDirEntry('Trip', '/Trip', [
      fakeFileEntry('a.png', '/Trip/a.png', a),
      fakeDirEntry('Day 1', '/Trip/Day 1', [fakeFileEntry('b.png', '/Trip/Day 1/b.png', b)]),
    ])

    render(<FullPipeline />, { wrapper })
    fireEvent.drop(findDropzoneRoot(), fakeDropEvent(folderEntry))

    await waitFor(() => expect(mockCreateFolder).toHaveBeenCalledWith(undefined, 'Trip'))
    await waitFor(() => expect(mockCreateFolder).toHaveBeenCalledWith('/Trip', 'Day 1'))
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2))

    const uploadCalls = mockUpload.mock.calls
    expect(uploadCalls.some((c) => c[0] === '/Trip' && (c[4] ?? (c[1] as File).name) === 'a.png')).toBe(true)
    expect(uploadCalls.some((c) => c[0] === '/Trip/Day 1' && (c[4] ?? (c[1] as File).name) === 'b.png')).toBe(true)

    await waitFor(() => expect(screen.getByText('Trip')).toBeTruthy())
  })

  it('a single file drop (not a folder) uploads directly with no folder creation', async () => {
    const a = makeFile('photo.png')
    const fileEntry = fakeFileEntry('photo.png', '/photo.png', a)

    render(<FullPipeline />, { wrapper })
    fireEvent.drop(findDropzoneRoot(), fakeDropEvent(fileEntry))

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1))
    expect(mockCreateFolder).not.toHaveBeenCalled()
    expect(mockUpload.mock.calls[0][0]).toBeUndefined() // root
  })

  it('a drop with no usable entries shows an error toast instead of doing nothing silently', async () => {
    render(<FullPipeline />, { wrapper })
    // No webkitGetAsEntry at all and an empty files list — the "nothing
    // could be read" branch this whole investigation was chasing.
    fireEvent.drop(findDropzoneRoot(), { dataTransfer: { items: [], files: [], types: [] } })

    await waitFor(() => expect(screen.getByText(/couldn't read/i)).toBeTruthy())
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
