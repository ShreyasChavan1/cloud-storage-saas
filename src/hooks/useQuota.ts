import { useQuery } from '@tanstack/react-query'
import { filesApi } from '@/api/files'

export function useQuota() {
  return useQuery({
    queryKey: ['quota'],
    queryFn: filesApi.quota,
  })
}
