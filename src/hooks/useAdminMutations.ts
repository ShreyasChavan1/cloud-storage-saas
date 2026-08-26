import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, CreateUserInput } from '@/api/admin'
import { adminQueryKeys } from './useAdminUsers'

// Broad-but-cheap: every mutation below changes something the users list
// or the overview counts could reasonably reflect (a new user, a status
// flip, a deletion), so all of them invalidate both rather than trying to
// track which specific list/overview combination actually needs it —
// these are small, infrequent admin actions, not a hot path worth
// optimizing invalidation granularity for.
function invalidateUsersAndOverview(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.createUser(input),
    onSuccess: () => invalidateUsersAndOverview(queryClient),
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi.setStatus(id, status),
    onSuccess: (user) => {
      queryClient.setQueryData(adminQueryKeys.user(user.id), user)
      invalidateUsersAndOverview(queryClient)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: adminQueryKeys.user(id) })
      invalidateUsersAndOverview(queryClient)
    },
  })
}

export function useResetUserPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) => adminApi.resetPassword(id, password),
    // A reset revokes every session for that user (see
    // admin.service.ts's resetPassword) — the sessions list would go
    // stale otherwise.
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.sessions(id) })
    },
  })
}

export function useSetUserQuota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storageLimitGb }: { id: string; storageLimitGb: number }) =>
      adminApi.setQuota(id, storageLimitGb),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.storage(id) })
    },
  })
}

export function useRevokeSession(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => adminApi.revokeSession(userId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.sessions(userId) })
    },
  })
}
