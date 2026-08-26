import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ReactNode } from 'react'
import { ToastProvider } from '@/context/ToastContext'
import AdminUserDetail from './AdminUserDetail'

vi.mock('@/api/admin', () => ({
  adminApi: {
    getUser: vi.fn(),
    getUserStorage: vi.fn(),
    getUserStorageBreakdown: vi.fn(),
    getUserPayments: vi.fn(),
    getUserSessions: vi.fn(),
    setQuota: vi.fn(),
    setStatus: vi.fn(),
    deleteUser: vi.fn(),
    resetPassword: vi.fn(),
  },
}))
import { adminApi } from '@/api/admin'
const mockGetUser = vi.mocked(adminApi.getUser)
const mockGetUserStorage = vi.mocked(adminApi.getUserStorage)
const mockSetQuota = vi.mocked(adminApi.setQuota)

const sampleUser = {
  id: 'user-1',
  name: 'Asha Kapoor',
  email: 'asha@example.com',
  avatarInitials: 'AK',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  plan: 'Pro',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const GB = 1024 ** 3

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/users/user-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/admin/users/:userId" element={children} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue(sampleUser)
  vi.mocked(adminApi.getUserStorageBreakdown).mockResolvedValue({
    totalFiles: 0,
    totalFolders: 0,
    largestFiles: [],
    recentUploads: [],
  })
  vi.mocked(adminApi.getUserPayments).mockResolvedValue([])
  vi.mocked(adminApi.getUserSessions).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AdminUserDetail quota sync indicator', () => {
  it(
    'shows a syncing indicator after a quota update until the new value actually lands',
    async () => {
      // Old quota: 5GB total. getUserStorage keeps returning the OLD
      // value until we flip it below — simulating Nextcloud's own
      // caching lag rather than an instant update. Real timers here
      // (not vi.useFakeTimers) because this needs to span the hook's
      // real refetchInterval scheduling inside React Query itself.
      let currentTotalGb = 5
      mockGetUserStorage.mockImplementation(async () => ({
        used: 1 * GB,
        available: (currentTotalGb - 1) * GB,
      }))
      mockSetQuota.mockResolvedValue(undefined)

      render(<AdminUserDetail />, { wrapper })

      await waitFor(() => expect(screen.getByText('Asha Kapoor')).toBeTruthy())
      await waitFor(() => expect(screen.getByText(/5(\.0)? GB/)).toBeTruthy())

      fireEvent.click(screen.getByText('Adjust quota'))
      const input = await screen.findByLabelText(/new quota/i)
      fireEvent.change(input, { target: { value: '15' } })
      fireEvent.click(screen.getByText('Update quota'))

      await waitFor(() => expect(mockSetQuota).toHaveBeenCalledWith('user-1', 15))

      // Still reporting the old (5GB) total right after the mutation's
      // own immediate refetch — the indicator should be up.
      await waitFor(() => expect(screen.getByText(/waiting for nextcloud/i)).toBeTruthy())

      // Nextcloud "catches up" now — the next poll tick (every 3s) should
      // see 15GB and clear the indicator.
      currentTotalGb = 15
      await waitFor(() => expect(screen.queryByText(/waiting for nextcloud/i)).toBeNull(), {
        timeout: 8000,
      })
      await waitFor(() => expect(screen.getByText(/15(\.0)? GB/)).toBeTruthy())
    },
    12000
  )

  it('lets an admin manually re-check via the "Check again" button', async () => {
    mockGetUserStorage.mockResolvedValue({ used: 1 * GB, available: 4 * GB })

    render(<AdminUserDetail />, { wrapper })
    await waitFor(() => expect(screen.getByText('Asha Kapoor')).toBeTruthy())

    const callsBefore = mockGetUserStorage.mock.calls.length
    fireEvent.click(screen.getByText('Check again'))

    await waitFor(() => expect(mockGetUserStorage.mock.calls.length).toBeGreaterThan(callsBefore))
  })
})
