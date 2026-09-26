import { useState } from 'react'
import { MoreVertical, Download, Pencil, FolderInput, Trash2, Star, Share2, History } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileEntry, filesApi } from '@/api/files'
import { useDeleteFile, useRenameFile, useMoveFile, useFavoriteFile } from '@/hooks/useFileMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { ShareDialog } from './ShareDialog'
import { VersionsDialog } from './VersionsDialog'

export function FileMenu({ entry, currentPath }: { entry: FileEntry; currentPath: string | undefined }) {
  const { showToast } = useToast()
  const deleteFile = useDeleteFile(currentPath)
  const renameFile = useRenameFile(currentPath)
  const moveFile = useMoveFile(currentPath)
  const favoriteFile = useFavoriteFile(currentPath)

  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [versions, setVersions] = useState(false)

  const handleDownload = async () => {
    try {
      await filesApi.download(entry.path, entry.name)
    } catch (err) {
      showToast(getErrorMessage(err, 'Download failed.'), 'error')
    }
  }

  const handleRename = (newName: string) => {
    renameFile.mutate(
      { path: entry.path, newName },
      {
        onSuccess: () => setRenaming(false),
        onError: (err) => {
          showToast(getErrorMessage(err, 'Rename failed.'), 'error')
          setRenaming(false)
        },
      }
    )
  }

  const handleMove = (destination: string) => {
    moveFile.mutate(
      { from: entry.path, to: destination },
      {
        onSuccess: () => {
          showToast(`Moved "${entry.name}".`)
          setMoving(false)
        },
        onError: (err) => {
          showToast(getErrorMessage(err, 'Move failed.'), 'error')
          setMoving(false)
        },
      }
    )
  }

  const handleDelete = () => {
    deleteFile.mutate(entry.path, {
      onSuccess: () => setDeleting(false),
      onError: (err) => {
        showToast(getErrorMessage(err, 'Delete failed.'), 'error')
        setDeleting(false)
      },
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
            ? [
              { label: 'Download', icon: <Download className="h-4 w-4" />, onSelect: handleDownload },
              { label: 'Share link', icon: <Share2 className="h-4 w-4" />, onSelect: () => setSharing(true) },
              { label: 'Version history', icon: <History className="h-4 w-4" />, onSelect: () => setVersions(true) },
            ] : []),
          { label: 'Rename', icon: <Pencil className="h-4 w-4" />, onSelect: () => setRenaming(true) },
          { label: 'Move', icon: <FolderInput className="h-4 w-4" />, onSelect: () => setMoving(true) },
          {
            label: entry.favorite ? 'Remove from favorites' : 'Favorite',
            icon: <Star className={entry.favorite ? 'h-4 w-4 fill-current text-amber-500' : 'h-4 w-4'} />,
            onSelect: () => favoriteFile.mutate(
              { path: entry.path, favorite: !entry.favorite },
              { onError: (err) => showToast(getErrorMessage(err, 'Favorite update failed.'), 'error') }
            ),
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
        loading={renameFile.isPending}
        onCancel={() => setRenaming(false)}
        onConfirm={handleRename}
      />

      <PromptDialog
        open={moving}
        title="Move"
        label="Destination path (e.g. /Documents)"
        initialValue={entry.path}
        confirmLabel="Move"
        loading={moveFile.isPending}
        onCancel={() => setMoving(false)}
        onConfirm={handleMove}
      />

      <ShareDialog open={sharing} path={entry.path} name={entry.name} onClose={()=>setSharing(false)} />
      <VersionsDialog open={versions} path={entry.path} name={entry.name} onClose={()=>setVersions(false)} />

      <ConfirmDialog
        open={deleting}
        title={`Delete "${entry.name}"?`}
        message={entry.type === 'folder' ? 'This will delete the folder and everything inside it.' : 'This cannot be undone.'}
        confirmLabel="Delete"
        danger
        loading={deleteFile.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
