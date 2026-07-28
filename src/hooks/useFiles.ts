import { useQuery } from '@tanstack/react-query'
import { filesApi } from '@/api/files'

export function filesQueryKey(path: string | undefined) {
  return ['files', path ?? '/'] as const
}

export function useFiles(path: string | undefined) {
  return useQuery({
    queryKey: filesQueryKey(path),
    queryFn: () => filesApi.list(path),
  })
}
