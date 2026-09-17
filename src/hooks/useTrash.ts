import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query'
import { trashApi, TrashEntry } from '@/api/files'
import { storageStatsQueryKey } from './useStorageStats'

export const trashQueryKey = ['files-trash'] as const

function invalidateStats(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: storageStatsQueryKey })
}

export function useTrash() {
  return useQuery({
    queryKey: trashQueryKey,
    queryFn: trashApi.list,
  })
}

export function useRestoreTrashItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trashApi.restore(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: trashQueryKey })
      const previous = queryClient.getQueryData<TrashEntry[]>(trashQueryKey)
      queryClient.setQueryData<TrashEntry[]>(trashQueryKey, (old) => old?.filter((item) => item.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(trashQueryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashQueryKey })
      invalidateStats(queryClient)
    },
  })
}

export function useDeleteTrashItemForever() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trashApi.deleteForever(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: trashQueryKey })
      const previous = queryClient.getQueryData<TrashEntry[]>(trashQueryKey)
      queryClient.setQueryData<TrashEntry[]>(trashQueryKey, (old) => old?.filter((item) => item.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(trashQueryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashQueryKey })
      invalidateStats(queryClient)
    },
  })
}

export function useEmptyTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: trashApi.empty,
    onSuccess: () => {
      queryClient.setQueryData<TrashEntry[]>(trashQueryKey, [])
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashQueryKey })
      invalidateStats(queryClient)
    },
  })
}
