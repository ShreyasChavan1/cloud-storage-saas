import { useCallback, useState, DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMoveFile } from '@/hooks/useFileMutations'
import { filesQueryKey } from '@/hooks/useFiles'
import { useToast } from '@/context/ToastContext'
import { getDragEntry, hasDragEntry } from '@/lib/dragEntry'
import { joinPath, dirname, isUnderDir } from '@/lib/paths'
import { getErrorMessage } from '@/lib/getErrorMessage'

// Makes a folder (a card/row, or a breadcrumb segment) a valid "drop here
// to move" target. `targetPath` is where the dropped item should end up;
// `currentPath` is the folder currently being viewed (so the listing
// refetches correctly regardless of which one the drop landed on).
export function useDropToMove(targetPath: string | undefined, currentPath: string | undefined) {
  const [isDragOver, setIsDragOver] = useState(false)
  const moveFile = useMoveFile(currentPath)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const onDragOver = useCallback((e: DragEvent) => {
    if (!hasDragEntry(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragOver(false), [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      setIsDragOver(false)
      const dragged = getDragEntry(e.dataTransfer)
      if (!dragged) return
      e.preventDefault()

      if (dragged.path === targetPath) return // dropped onto itself
      if (dirname(dragged.path) === targetPath) return // already there — no-op
      if (dragged.type === 'folder' && isUnderDir(targetPath, dragged.path)) {
        showToast("Can't move a folder into itself.", 'error')
        return
      }

      const to = joinPath(targetPath, dragged.name)
      moveFile.mutate(
        { from: dragged.path, to },
        {
          onSuccess: () => {
            showToast(`Moved "${dragged.name}".`)
            queryClient.invalidateQueries({ queryKey: filesQueryKey(targetPath) })
          },
          onError: (err) => showToast(getErrorMessage(err, 'Move failed.'), 'error'),
        }
      )
    },
    [moveFile, queryClient, showToast, targetPath]
  )

  return { isDragOver, dropHandlers: { onDragOver, onDragLeave, onDrop } }
}
