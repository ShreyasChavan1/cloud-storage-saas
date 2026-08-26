import { api } from '@/lib/api'
import { AuthUser } from './auth'
import { QuotaInfo, StorageStats } from './files'

export type AdminUser = AuthUser & {
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
}

export interface AdminUsersPage {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface AdminOverview {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  adminCount: number
  activeSessions: number
}

export interface AdminPayment {
  id: string
  amount: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
  provider: string
  providerPaymentId: string | null
  createdAt: string
}

export interface AdminSession {
  id: string
  createdAt: string
  expiresAt: string
  userAgent: string | null
  ipAddress: string | null
}

export interface AdminPlan {
  id: string
  name: string
  storageLimitGb: number
  price: string
}

export interface ListUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: 'USER' | 'ADMIN'
  status?: 'ACTIVE' | 'SUSPENDED'
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: 'USER' | 'ADMIN'
  planId?: string
}

// Every call here unwraps the backend's { success, data } envelope once —
// same convention as api/auth.ts, api/user.ts, api/files.ts. Every one of
// these requires an ACTIVE ADMIN session; a non-admin gets a 403 from
// requireAdmin before any of this ever runs (see
// backend/src/middleware/admin.middleware.ts).
export const adminApi = {
  overview: () => api.get<{ data: AdminOverview }>('/admin/overview').then((r) => r.data.data),

  // Backs the "create user" dialog's plan dropdown. planRepository.findAll
  // already existed (Phase 3) but had no route until Phase 10 needed one
  // — see backend/README.md.
  listPlans: () => api.get<{ data: { plans: AdminPlan[] } }>('/admin/plans').then((r) => r.data.data.plans),

  listUsers: (params: ListUsersParams) =>
    api.get<{ data: AdminUsersPage }>('/admin/users', { params }).then((r) => r.data.data),

  getUser: (id: string) => api.get<{ data: { user: AdminUser } }>(`/admin/users/${id}`).then((r) => r.data.data.user),

  createUser: (input: CreateUserInput) =>
    api.post<{ data: { user: AdminUser } }>('/admin/users', input).then((r) => r.data.data.user),

  setStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api
      .patch<{ data: { user: AdminUser } }>(`/admin/users/${id}/status`, { status })
      .then((r) => r.data.data.user),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then(() => undefined),

  // Returns `{}` when the caller supplied their own password (nothing to
  // hand back), or `{ temporaryPassword }` when the backend generated one
  // — see admin.service.ts's resetPassword for why it's safe to return
  // the plaintext here (an authenticated admin action) but not from the
  // public forgot-password flow.
  resetPassword: (id: string, password?: string) =>
    api
      .post<{ data: { temporaryPassword?: string } }>(`/admin/users/${id}/reset-password`, { password })
      .then((r) => r.data.data),

  setQuota: (id: string, storageLimitGb: number) =>
    api.patch(`/admin/users/${id}/quota`, { storageLimitGb }).then(() => undefined),

  // Same QuotaInfo/StorageStats shapes the user's own dashboard uses (see
  // api/files.ts) — this is the same underlying data, just fetched for
  // someone else by an admin.
  getUserStorage: (id: string) => api.get<{ data: QuotaInfo }>(`/admin/users/${id}/storage`).then((r) => r.data.data),

  getUserStorageBreakdown: (id: string) =>
    api.get<{ data: StorageStats }>(`/admin/users/${id}/storage/breakdown`).then((r) => r.data.data),

  getUserPayments: (id: string) =>
    api.get<{ data: { payments: AdminPayment[] } }>(`/admin/users/${id}/payments`).then((r) => r.data.data.payments),

  getUserSessions: (id: string) =>
    api.get<{ data: { sessions: AdminSession[] } }>(`/admin/users/${id}/sessions`).then((r) => r.data.data.sessions),

  revokeSession: (id: string, sessionId: string) =>
    api.delete(`/admin/users/${id}/sessions/${sessionId}`).then(() => undefined),
}
