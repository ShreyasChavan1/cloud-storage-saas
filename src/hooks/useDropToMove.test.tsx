import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { ToastProvider } from '@/context/ToastContext'
import { useDropToMove } from './useDropToMove'

vi.mock('@/api/files', () => ({
  filesApi: {
    move: vi.fn(),
    list: vi.fn(),
  },
}))
import { filesApi } from '@/api/files'
const mockMove = vi.mocked(filesApi.move)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}

// A minimal fake DataTransfer carrying our custom drag payload — matches
// what setDragEntry() would have written onto a real drag event.
function fakeDataTransfer(entry: { path: string; name: string; type: 'file' | 'folder' } | null) {
  const store = new Map<string, string>()
  if (entry) {
    store.set('application/x-nimbus-entry', JSON.stringify(entry))
    store.set('text/plain', entry.path)
  }
  return {
    types: Array.from(store.keys()),
    getData: (type: string) => store.get(type) ?? '',
    setData: () => {},
    dropEffect: 'none',
  } as unknown as DataTransfer
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMove.mockResolvedValue({ name: 'a.png', path: '/Trip/a.png', type: 'file', size: 1, modifiedAt: '' })
})

describe('useDropToMove', () => {
  it('moves a dragged file into the target folder', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/a.png', name: 'a.png', type: 'file' })

    await act(async () => {
      // @ts-expect-error minimal fake event, only dataTransfer is used
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    await waitFor(() => expect(mockMove).toHaveBeenCalledWith('/a.png', '/Trip/a.png'))
  })

  it('does nothing when dropped onto itself', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip/a.png', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip/a.png', name: 'a.png', type: 'file' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    expect(mockMove).not.toHaveBeenCalled()
  })

  it('does nothing when dropped back onto the folder it is already in', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip/a.png', name: 'a.png', type: 'file' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    expect(mockMove).not.toHaveBeenCalled()
  })

  it('refuses to move a folder into its own descendant', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip/Day 1', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip', name: 'Trip', type: 'folder' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    expect(mockMove).not.toHaveBeenCalled()
  })

  it('refuses to move a folder onto itself', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip', name: 'Trip', type: 'folder' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    expect(mockMove).not.toHaveBeenCalled()
  })

  it('allows moving a folder into an unrelated folder', async () => {
    const { result } = renderHook(() => useDropToMove('/Archive', undefined), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip', name: 'Trip', type: 'folder' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    await waitFor(() => expect(mockMove).toHaveBeenCalledWith('/Trip', '/Archive/Trip'))
  })

  it('ignores a drop with no drag payload (e.g. an OS file drag, not one of our entries)', async () => {
    const { result } = renderHook(() => useDropToMove('/Trip', undefined), { wrapper })
    const dt = fakeDataTransfer(null)

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    expect(mockMove).not.toHaveBeenCalled()
  })

  it('moving to root (undefined target) sends the bare filename as the destination', async () => {
    const { result } = renderHook(() => useDropToMove(undefined, '/Trip'), { wrapper })
    const dt = fakeDataTransfer({ path: '/Trip/a.png', name: 'a.png', type: 'file' })

    await act(async () => {
      // @ts-expect-error minimal fake event
      result.current.dropHandlers.onDrop({ dataTransfer: dt, preventDefault: () => {} })
    })

    await waitFor(() => expect(mockMove).toHaveBeenCalledWith('/Trip/a.png', '/a.png'))
  })
})
