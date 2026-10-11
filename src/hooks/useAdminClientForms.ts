import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientFormsApi, ClientFormUpdate, ListClientFormsParams } from '@/api/clientForms'
import { agreementsApi } from '@/api/agreements'

export const clientFormQueryKeys = {
  list: (params: ListClientFormsParams) => ['admin', 'client-forms', 'list', params] as const,
  detail: (id: string) => ['admin', 'client-forms', 'detail', id] as const,
  userAgreements: (userId: string) => ['admin', 'users', userId, 'agreements'] as const,
}

export function useAdminClientForms(params: ListClientFormsParams) {
  return useQuery({
    queryKey: clientFormQueryKeys.list(params),
    queryFn: () => clientFormsApi.adminList(params),
    placeholderData: (previous) => previous,
  })
}

export function useAdminClientForm(id: string | undefined) {
  return useQuery({
    queryKey: clientFormQueryKeys.detail(id ?? ''),
    queryFn: () => clientFormsApi.adminGet(id!),
    enabled: !!id,
  })
}

export function useUpdateClientForm(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientFormUpdate) => clientFormsApi.adminUpdate(id, input),
    onSuccess: (form) => {
      queryClient.setQueryData(clientFormQueryKeys.detail(id), form)
      // Status/priority changes are visible in the dashboard list and its "new" count.
      queryClient.invalidateQueries({ queryKey: ['admin', 'client-forms', 'list'] })
    },
  })
}

export function useAdminUserAgreements(userId: string | undefined) {
  return useQuery({
    queryKey: clientFormQueryKeys.userAgreements(userId ?? ''),
    queryFn: () => agreementsApi.getForUser(userId!),
    enabled: !!userId,
  })
}
