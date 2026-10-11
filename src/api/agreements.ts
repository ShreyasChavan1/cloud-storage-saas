import { api } from '@/lib/api'

export interface AgreementAcceptanceRecord {
  id: string
  version: string
  event: string
  email: string
  ipAddress: string | null
  userAgent: string | null
  acceptedAt: string
}

export const agreementsApi = {
  // Admin only.
  getForUser: (userId: string) =>
    api
      .get<{ data: { agreements: AgreementAcceptanceRecord[] } }>(`/admin/users/${userId}/agreements`)
      .then((r) => r.data.data.agreements),
}
