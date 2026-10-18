import { useQuery } from '@tanstack/react-query'
import { supportApi, SupportContact } from '@/api/support'

export const supportContactQueryKey = ['support', 'contact'] as const

// Only ever shown when the request FAILS (backend unreachable), so a visitor
// still sees some way to reach us. Never shown while loading — otherwise the
// old address would flash on screen before the real one arrives.
export const FALLBACK_CONTACT: SupportContact = {
  email: 'dvtechnologies2026@gmail.com',
  phone: '9665579916',
}

// The public contact details are edited in the admin dashboard ("Support
// Contact") and stored on the backend. Every page that shows an email or
// phone number must read it through here instead of typing it in, otherwise
// it keeps showing the old value after the admin changes it.
export function useSupportContact() {
  const query = useQuery({
    queryKey: supportContactQueryKey,
    queryFn: supportApi.getContact,
    staleTime: 60_000,
  })
  const contact: SupportContact | null = query.data ?? (query.isError ? FALLBACK_CONTACT : null)
  return { contact, isLoading: query.isPending }
}
