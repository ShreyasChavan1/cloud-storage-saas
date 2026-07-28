import { useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi, FileEntry } from '@/api/files'
import { filesQueryKey } from './useFiles'

export function useUploadFile(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  const key = filesQueryKey(currentPath)
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      filesApi.upload(currentPath, file, onProgress),
    // Not optimistic — the server response carries the real stat (size,
    // etag, etc.) that a client-side guess can't reliably produce, and the
    // upload progress bar already gives immediate feedback during the wait.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteFile(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  const key = filesQueryKey(currentPath)
  return useMutation({
    mutationFn: (path: string) => filesApi.delete(path),
    onMutate: async (path) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FileEntry[]>(key)
      queryClient.setQueryData<FileEntry[]>(key, (old) => old?.filter((e) => e.path !== path))
      return { previous }
    },
    onError: (_err, _path, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useRenameFile(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  const key = filesQueryKey(currentPath)
  return useMutation({
    mutationFn: ({ path, newName }: { path: string; newName: string }) => filesApi.rename(path, newName),
    onMutate: async ({ path, newName }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FileEntry[]>(key)
      queryClient.setQueryData<FileEntry[]>(key, (old) =>
        old?.map((e) => (e.path === path ? { ...e, name: newName } : e))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useCreateFolder(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  const key = filesQueryKey(currentPath)
  return useMutation({
    mutationFn: (name: string) => filesApi.createFolder(currentPath, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useMoveFile(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => filesApi.move(from, to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: filesQueryKey(currentPath) }),
  })
}

export function useCopyFile(currentPath: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => filesApi.copy(from, to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: filesQueryKey(currentPath) }),
  })
}
