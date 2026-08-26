import { useQuery } from '@tanstack/react-query'
import { adminApi, ListUsersParams } from '@/api/admin'

// Centralized here (rather than inlined at each useQuery call) so
// useAdminMutations.ts can invalidate the exact same keys these produce
// without the two files having to agree on the shape by convention alone.
export const adminQueryKeys = {
  overview: ['admin', 'overview'] as const,
  users: (params: ListUsersParams) => ['admin', 'users', params] as const,
  user: (id: string) => ['admin', 'users', id] as const,
  storage: (id: string) => ['admin', 'users', id, 'storage'] as const,
  storageBreakdown: (id: string) => ['admin', 'users', id, 'storage-breakdown'] as const,
  payments: (id: string) => ['admin', 'users', id, 'payments'] as const,
  sessions: (id: string) => ['admin', 'users', id, 'sessions'] as const,
}

export function useAdminOverview() {
  return useQuery({
    queryKey: adminQueryKeys.overview,
    queryFn: adminApi.overview,
  })
}

// Plans change rarely (an admin action outside this UI entirely — there's
// still no create/edit-plan route), so a longer staleTime avoids
// re-fetching this every time the create-user dialog opens.
export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'] as const,
    queryFn: adminApi.listPlans,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: () => adminApi.listUsers(params),
    // Keeps the previous page's rows on screen while a new page/search
    // loads, rather than flashing an empty table on every keystroke or
    // page click — this table is the one place in the app that pages.
    placeholderData: (previous) => previous,
  })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: adminQueryKeys.user(id ?? ''),
    queryFn: () => adminApi.getUser(id!),
    enabled: !!id,
  })
}

// Same 5-minute staleTime reasoning as the user's own useStorageStats —
// this hits the identical account-wide Depth:infinity WebDAV scan on the
// backend (filesService.stats), just for someone else's account.
const STORAGE_STALE_TIME_MS = 5 * 60 * 1000

export function useAdminUserStorage(id: string | undefined, options?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: adminQueryKeys.storage(id ?? ''),
    queryFn: () => adminApi.getUserStorage(id!),
    enabled: !!id,
    // Only used while polling for a just-submitted quota change to land —
    // see AdminUserDetail.tsx. `undefined`/`false` behaves exactly as
    // before for every other caller.
    refetchInterval: options?.refetchIntervalMs,
  })
}

export function useAdminUserStorageBreakdown(id: string | undefined) {
  return useQuery({
    queryKey: adminQueryKeys.storageBreakdown(id ?? ''),
    queryFn: () => adminApi.getUserStorageBreakdown(id!),
    enabled: !!id,
    staleTime: STORAGE_STALE_TIME_MS,
  })
}

export function useAdminUserPayments(id: string | undefined) {
  return useQuery({
    queryKey: adminQueryKeys.payments(id ?? ''),
    queryFn: () => adminApi.getUserPayments(id!),
    enabled: !!id,
  })
}

export function useAdminUserSessions(id: string | undefined) {
  return useQuery({
    queryKey: adminQueryKeys.sessions(id ?? ''),
    queryFn: () => adminApi.getUserSessions(id!),
    enabled: !!id,
  })
}
