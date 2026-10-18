import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useSupportContact, FALLBACK_CONTACT } from './useSupportContact'

const mockGetContact = vi.fn()
vi.mock('@/api/support', () => ({
  supportApi: { getContact: () => mockGetContact() },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useSupportContact', () => {
  it('shows nothing while loading, then the contact saved by the admin', async () => {
    mockGetContact.mockResolvedValue({ email: 'new@dvt.in', phone: '1112223334' })
    const { result } = renderHook(() => useSupportContact(), { wrapper: makeWrapper() })

    expect(result.current.contact).toBeNull()
    await waitFor(() => expect(result.current.contact).toEqual({ email: 'new@dvt.in', phone: '1112223334' }))
  })

  it('falls back to the default contact only when the request fails', async () => {
    mockGetContact.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useSupportContact(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.contact).toEqual(FALLBACK_CONTACT))
  })
})
