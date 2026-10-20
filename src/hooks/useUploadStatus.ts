import { useQuery } from '@tanstack/react-query'
import { filesApi } from '@/api/files'

export const uploadStatusQueryKey = ['upload-status'] as const

// Short staleTime: this decides whether the upload controls are enabled, and
// it has to notice quickly after the user frees space or renews their plan.
export function useUploadStatus() {
  return useQuery({
    queryKey: uploadStatusQueryKey,
    queryFn: filesApi.uploadStatus,
    staleTime: 15_000,
  })
}
