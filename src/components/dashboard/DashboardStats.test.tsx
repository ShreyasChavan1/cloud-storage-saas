import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ReactNode } from 'react'
import { ToastProvider } from '@/context/ToastContext'
import { RecentFiles } from './RecentFiles'
import { LargestFiles } from './LargestFiles'
import { StorageCard } from './StorageCard'

vi.mock('@/api/files', () => ({
  filesApi: {
    stats: vi.fn(),
    quota: vi.fn(),
  },
}))
import { filesApi } from '@/api/files'
const mockStats = vi.mocked(filesApi.stats)
const mockQuota = vi.mocked(filesApi.quota)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ToastProvider>{children}</ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const sampleFile = (overrides: Partial<{ name: string; path: string; size: number; modifiedAt: string }> = {}) => ({
  name: 'photo.png',
  path: '/Trip/photo.png',
  type: 'file' as const,
  size: 1024,
  modifiedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

beforeEach(() => vi.clearAllMocks())

describe('RecentFiles (account-wide)', () => {
  it('renders files from anywhere in the tree, not just root', async () => {
    mockStats.mockResolvedValue({
      totalFiles: 2,
      totalFolders: 1,
      largestFiles: [],
      recentUploads: [
        sampleFile({ name: 'nested.png', path: '/Trip/Day 1/nested.png' }),
        sampleFile({ name: 'root.png', path: '/root.png' }),
      ],
    })

    render(<RecentFiles />, { wrapper })

    await waitFor(() => expect(screen.getByText('nested.png')).toBeTruthy())
    expect(screen.getByText('root.png')).toBeTruthy()
  })

  it('shows an empty state when there are no uploads yet', async () => {
    mockStats.mockResolvedValue({ totalFiles: 0, totalFolders: 0, largestFiles: [], recentUploads: [] })
    render(<RecentFiles />, { wrapper })
    await waitFor(() => expect(screen.getByText(/no files yet/i)).toBeTruthy())
  })

  it('shows an error state if the stats request fails', async () => {
    mockStats.mockRejectedValue(new Error('network error'))
    render(<RecentFiles />, { wrapper })
    await waitFor(() => expect(screen.getByText(/couldn't load recent uploads/i)).toBeTruthy())
  })
})

describe('LargestFiles', () => {
  it('renders files sorted by size as provided by the backend, with their sizes', async () => {
    mockStats.mockResolvedValue({
      totalFiles: 2,
      totalFolders: 0,
      largestFiles: [
        sampleFile({ name: 'huge.zip', path: '/huge.zip', size: 5_000_000 }),
        sampleFile({ name: 'small.txt', path: '/small.txt', size: 100 }),
      ],
      recentUploads: [],
    })

    render(<LargestFiles />, { wrapper })

    await waitFor(() => expect(screen.getByText('huge.zip')).toBeTruthy())
    expect(screen.getByText('small.txt')).toBeTruthy()
    expect(screen.getByText('4.8 MB')).toBeTruthy()
  })

  it('shows an empty state when there are no files yet', async () => {
    mockStats.mockResolvedValue({ totalFiles: 0, totalFolders: 0, largestFiles: [], recentUploads: [] })
    render(<LargestFiles />, { wrapper })
    await waitFor(() => expect(screen.getByText(/no files yet/i)).toBeTruthy())
  })
})

describe('StorageCard totals', () => {
  it('shows the total file/folder count once stats load', async () => {
    mockQuota.mockResolvedValue({ used: 1_000_000, available: 9_000_000 })
    mockStats.mockResolvedValue({ totalFiles: 42, totalFolders: 7, largestFiles: [], recentUploads: [] })

    render(<StorageCard />, { wrapper })

    await waitFor(() => expect(screen.getByText(/42 files in 7 folders/i)).toBeTruthy())
  })

  it('singularizes correctly for exactly 1 file / 1 folder', async () => {
    mockQuota.mockResolvedValue({ used: 100, available: 900 })
    mockStats.mockResolvedValue({ totalFiles: 1, totalFolders: 1, largestFiles: [], recentUploads: [] })

    render(<StorageCard />, { wrapper })

    await waitFor(() => expect(screen.getByText(/1 file in 1 folder/i)).toBeTruthy())
  })

  it('does not render the file-count line before stats have loaded', () => {
    mockQuota.mockResolvedValue({ used: 100, available: 900 })
    mockStats.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<StorageCard />, { wrapper })
    expect(screen.queryByText(/files in/i)).toBeNull()
  })
})
