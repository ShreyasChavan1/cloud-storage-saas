import { useState } from 'react'
import { MoreVertical, Download, Pencil, FolderInput, Trash2, Star } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileEntry, filesApi } from '@/api/files'
import { useDeleteFile, useRenameFile, useMoveFile } from '@/hooks/useFileMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

export function FileMenu({ entry, currentPath }: { entry: FileEntry; currentPath: string | undefined }) {
  const { showToast } = useToast()
  const deleteFile = useDeleteFile(currentPath)
  const renameFile = useRenameFile(currentPath)
  const moveFile = useMoveFile(currentPath)

  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    try {
      await filesApi.download(entry.path, entry.name)
    } catch (err) {
      showToast(getErrorMessage(err, 'Download failed.'), 'error')
    }
  }

  const handleRename = (newName: string) => {
    setRenaming(false)
    renameFile.mutate(
      { path: entry.path, newName },
      {
        onError: (err) => showToast(getErrorMessage(err, 'Rename failed.'), 'error'),
      }
    )
  }

  const handleMove = (destination: string) => {
    setMoving(false)
    moveFile.mutate(
      { from: entry.path, to: destination },
      {
        onSuccess: () => showToast(`Moved "${entry.name}".`),
        onError: (err) => showToast(getErrorMessage(err, 'Move failed.'), 'error'),
      }
    )
  }

  const handleDelete = () => {
    setDeleting(false)
    deleteFile.mutate(entry.path, {
      onError: (err) => showToast(getErrorMessage(err, 'Delete failed.'), 'error'),
    })
  }

  return (
    <>
      <DropdownMenu
        trigger={
          <button
            className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface2 dark:hover:text-white"
            aria-label={`More actions for ${entry.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        }
        items={[
          ...(entry.type === 'file'
            ? [{ label: 'Download', icon: <Download className="h-4 w-4" />, onSelect: handleDownload }]
            : []),
          { label: 'Rename', icon: <Pencil className="h-4 w-4" />, onSelect: () => setRenaming(true) },
          { label: 'Move', icon: <FolderInput className="h-4 w-4" />, onSelect: () => setMoving(true) },
          {
            label: 'Favorite',
            icon: <Star className="h-4 w-4" />,
            disabled: true,
            onSelect: () => {},
          },
          { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, tone: 'danger', onSelect: () => setDeleting(true) },
        ]}
      />

      <PromptDialog
        open={renaming}
        title="Rename"
        label="New name"
        initialValue={entry.name}
        confirmLabel="Rename"
        onCancel={() => setRenaming(false)}
        onConfirm={handleRename}
      />

      <PromptDialog
        open={moving}
        title="Move"
        label="Destination path (e.g. /Documents)"
        initialValue={entry.path}
        confirmLabel="Move"
        onCancel={() => setMoving(false)}
        onConfirm={handleMove}
      />

      <ConfirmDialog
        open={deleting}
        title={`Delete "${entry.name}"?`}
        message={entry.type === 'folder' ? 'This will delete the folder and everything inside it.' : 'This cannot be undone.'}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
