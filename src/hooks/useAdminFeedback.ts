import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedbackApi, ListFeedbackParams } from '@/api/feedback'

export const feedbackQueryKeys = {
  list: (params: ListFeedbackParams) => ['admin', 'feedback', 'list', params] as const,
}

export function useAdminFeedback(params: ListFeedbackParams) {
  return useQuery({
    queryKey: feedbackQueryKeys.list(params),
    queryFn: () => feedbackApi.adminList(params),
    placeholderData: (previous) => previous,
  })
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => feedbackApi.adminDelete(id),
    // The list, the total and the average all change.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}
