import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ReactNode } from 'react'
import { ToastProvider } from '@/context/ToastContext'
import { AdminUsersTable } from './AdminUsersTable'

vi.mock('@/api/admin', () => ({
  adminApi: {
    listUsers: vi.fn(),
    listPlans: vi.fn(),
    createUser: vi.fn(),
    setStatus: vi.fn(),
    deleteUser: vi.fn(),
    resetPassword: vi.fn(),
  },
}))
import { adminApi } from '@/api/admin'
const mockListUsers = vi.mocked(adminApi.listUsers)
const mockListPlans = vi.mocked(adminApi.listPlans)
const mockCreateUser = vi.mocked(adminApi.createUser)
const mockSetStatus = vi.mocked(adminApi.setStatus)
const mockDeleteUser = vi.mocked(adminApi.deleteUser)

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

const sampleUser = (overrides: Partial<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED' }> = {}) => ({
  id: 'user-1',
  name: 'Asha Kapoor',
  email: 'asha@example.com',
  avatarInitials: 'AK',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  plan: 'Pro',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockListPlans.mockResolvedValue([])
})

describe('AdminUsersTable', () => {
  it('renders users returned by the backend', async () => {
    mockListUsers.mockResolvedValue({ users: [sampleUser()], total: 1, page: 1, limit: 15 })

    render(<AdminUsersTable />, { wrapper })

    await waitFor(() => expect(screen.getByText('Asha Kapoor')).toBeTruthy())
    expect(screen.getByText('asha@example.com')).toBeTruthy()
  })

  it('shows an empty state when no users match', async () => {
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, limit: 15 })
    render(<AdminUsersTable />, { wrapper })
    await waitFor(() => expect(screen.getByText(/no users match/i)).toBeTruthy())
  })

  it('re-queries with the typed search term after debouncing', async () => {
    mockListUsers.mockResolvedValue({ users: [sampleUser()], total: 1, page: 1, limit: 15 })
    render(<AdminUsersTable />, { wrapper })
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText(/search by name or email/i), { target: { value: 'asha' } })

    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(expect.objectContaining({ search: 'asha' }))
    )
  })

  it('suspends a user only after the confirmation dialog is accepted', async () => {
    mockListUsers.mockResolvedValue({ users: [sampleUser()], total: 1, page: 1, limit: 15 })
    mockSetStatus.mockResolvedValue(sampleUser({ status: 'SUSPENDED' }))

    render(<AdminUsersTable />, { wrapper })
    await waitFor(() => expect(screen.getByText('Asha Kapoor')).toBeTruthy())

    fireEvent.click(screen.getByLabelText(/actions for asha kapoor/i))
    fireEvent.click(screen.getByText('Suspend'))

    // Confirmation dialog is up, but nothing has been called yet.
    expect(screen.getByText(/will be signed out everywhere/i)).toBeTruthy()
    expect(mockSetStatus).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByText('Suspend')[screen.getAllByText('Suspend').length - 1])

    await waitFor(() => expect(mockSetStatus).toHaveBeenCalledWith('user-1', 'SUSPENDED'))
  })

  it('deletes a user only after the confirmation dialog is accepted', async () => {
    mockListUsers.mockResolvedValue({ users: [sampleUser()], total: 1, page: 1, limit: 15 })
    mockDeleteUser.mockResolvedValue(undefined)

    render(<AdminUsersTable />, { wrapper })
    await waitFor(() => expect(screen.getByText('Asha Kapoor')).toBeTruthy())

    fireEvent.click(screen.getByLabelText(/actions for asha kapoor/i))
    fireEvent.click(screen.getByText('Delete'))
    expect(mockDeleteUser).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByText('Delete')[screen.getAllByText('Delete').length - 1])

    await waitFor(() => expect(mockDeleteUser).toHaveBeenCalledWith('user-1'))
  })

  it('creates a user with the submitted form values', async () => {
    mockListUsers.mockResolvedValue({ users: [], total: 0, page: 1, limit: 15 })
    mockCreateUser.mockResolvedValue(sampleUser({ email: 'new@example.com' }))

    render(<AdminUsersTable />, { wrapper })
    fireEvent.click(screen.getByText('Create user'))

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'New Person' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/initial password/i), { target: { value: 'supersecret123' } })

    fireEvent.click(screen.getByText('Create user', { selector: 'button[type="submit"]' }))

    await waitFor(() =>
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Person', email: 'new@example.com', password: 'supersecret123' })
      )
    )
  })
})
