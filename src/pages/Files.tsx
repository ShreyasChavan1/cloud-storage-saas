import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Star, Trash2, Share2, FolderPlus, ChevronRight, AlertCircle } from 'lucide-react'
import { EntryCard } from '@/components/files/EntryCard'
import { EntryRow } from '@/components/files/EntryRow'
import { TrashRow } from '@/components/files/TrashRow'
import { UploadDropzone } from '@/components/files/UploadDropzone'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { Button } from '@/components/ui/Button'
import { useFiles } from '@/hooks/useFiles'
import { useCreateFolder } from '@/hooks/useFileMutations'
import { useTrash, useRestoreTrashItem, useDeleteTrashItemForever, useEmptyTrash } from '@/hooks/useTrash'
import { useQuery } from '@tanstack/react-query'
import { filesApi, FileEntry } from '@/api/files'
import { useDropToMove } from '@/hooks/useDropToMove'
import { useToast } from '@/context/ToastContext'
import { useUploadQueue } from '@/context/UploadQueueContext'
import { CollectedFile } from '@/lib/collectFileEntries'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { cn } from '@/lib/cn'
import { PreviewModal } from '@/components/files/PreviewModal'

const unsupportedViews: Record<string, { label: string; icon: typeof Star; note: string }> = {
  shared: { label: 'Shared with you', icon: Share2, note: "Sharing isn't wired up to the backend yet." },
}

function breadcrumbSegments(path: string | undefined) {
  if (!path || path === '/') return []
  return path.split('/').filter(Boolean)
}

// Defined at module scope (not inside Files()) so each breadcrumb segment
// keeps its own stable drag-over state across re-renders instead of being
// torn down and recreated every render.
function BreadcrumbButton({
  label,
  targetPath,
  currentPath,
  onClick,
}: {
  label: string
  targetPath: string | undefined
  currentPath: string | undefined
  onClick: () => void
}) {
  const { isDragOver, dropHandlers } = useDropToMove(targetPath, currentPath)
  return (
    <button
      onClick={onClick}
      {...dropHandlers}
      className={cn(
        'truncate rounded-md px-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400',
        isDragOver && 'bg-brand-50 text-brand-700 ring-2 ring-brand-300 dark:bg-brand-900/30 dark:text-brand-300'
      )}
    >
      {label}
    </button>
  )
}

function TrashView() {
  const { data: items, isLoading, isError, refetch } = useTrash()
  const restore = useRestoreTrashItem()
  const deleteForever = useDeleteTrashItemForever()
  const emptyTrash = useEmptyTrash()
  const { showToast } = useToast()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleRestore = (id: string, name: string) => {
    setPendingId(id)
    restore.mutate(id, {
      onSuccess: () => showToast(`Restored "${name}".`),
      onError: (err) => showToast(getErrorMessage(err, 'Could not restore item.'), 'error'),
      onSettled: () => setPendingId(null),
    })
  }

  const handleDeleteForever = (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    setPendingId(id)
    deleteForever.mutate(id, {
      onSuccess: () => showToast(`Deleted "${name}" permanently.`),
      onError: (err) => showToast(getErrorMessage(err, 'Could not delete item.'), 'error'),
      onSettled: () => setPendingId(null),
    })
  }

  const handleEmptyTrash = () => {
    if (!window.confirm('Empty trash? Everything in it will be permanently deleted. This cannot be undone.')) return
    emptyTrash.mutate(undefined, {
      onSuccess: () => showToast('Trash emptied.'),
      onError: (err) => showToast(getErrorMessage(err, 'Could not empty trash.'), 'error'),
    })
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-ink-400" />
          <h1 className="text-2xl font-bold">Trash</h1>
        </div>
        {!!items?.length && (
          <Button variant="secondary" size="sm" onClick={handleEmptyTrash} loading={emptyTrash.isPending}>
            Empty trash
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-400">Items are recoverable here until they're permanently deleted.</p>

      {isError ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
          <AlertCircle className="h-10 w-10 text-ink-300" />
          <p className="mt-3 max-w-sm text-sm text-ink-400">Could not load trash.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-line bg-surface-0 dark:border-dark-border dark:bg-dark-surface" />)}
        </div>
      ) : !items?.length ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
          <Trash2 className="h-10 w-10 text-ink-300" />
          <p className="mt-3 max-w-sm text-sm text-ink-400">Trash is empty.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-1">
          {items.map((item) => (
            <TrashRow
              key={item.id}
              item={item}
              restoring={pendingId === item.id && restore.isPending}
              deletingForever={pendingId === item.id && deleteForever.isPending}
              onRestore={() => handleRestore(item.id, item.name)}
              onDeleteForever={() => handleDeleteForever(item.id, item.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Files() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const { enqueue } = useUploadQueue()

  const view = searchParams.get('view') ?? 'all'
  const currentPath = searchParams.get('path') ?? undefined
  const search = searchParams.get('search') ?? ''

  const { data: folderEntries, isLoading: folderLoading, isError: folderError, refetch: refetchFolder } = useFiles(view === 'all' ? currentPath : undefined)
  const { data: favoriteEntries, isLoading: favoritesLoading, isError: favoritesError, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: filesApi.favorites,
    enabled: view === 'favorites',
  })
  const entries = view === 'favorites' ? favoriteEntries : folderEntries
  const isLoading = view === 'favorites' ? favoritesLoading : folderLoading
  const isError = view === 'favorites' ? favoritesError : folderError
  const refetch = view === 'favorites' ? refetchFavorites : refetchFolder
  const createFolder = useCreateFolder(currentPath)

  const filteredEntries = useMemo(() => {
    if (!entries) return entries
    if (!search.trim()) return entries
    const term = search.trim().toLowerCase()
    return entries.filter((e) => e.name.toLowerCase().includes(term))
  }, [entries, search])

  const openFolder = (path: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('path', path)
      next.delete('search')
      return next
    })
  }

  const goToBreadcrumb = (index: number) => {
    const segments = breadcrumbSegments(currentPath)
    const target = '/' + segments.slice(0, index + 1).join('/')
    openFolder(target)
  }

  const handleItemsSelected = (items: CollectedFile[]) => {
    enqueue(items, currentPath)
  }

  const handleCreateFolder = (name: string) => {
    setCreatingFolder(false)
    createFolder.mutate(name, {
      onSuccess: () => showToast(`Created folder "${name}".`),
      onError: (err) => showToast(getErrorMessage(err, 'Could not create folder.'), 'error'),
    })
  }

  if (view === 'trash') {
    return <TrashView />
  }

  if (view !== 'all' && view !== 'favorites') {
    const info = unsupportedViews[view] ?? unsupportedViews.shared
    return (
      <div className="mx-auto max-w-7xl animate-fade-up">
        <div className="flex items-center gap-2">
          <info.icon className="h-5 w-5 text-ink-400" />
          <h1 className="text-2xl font-bold">{info.label}</h1>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
          <info.icon className="h-10 w-10 text-ink-300" />
          <p className="mt-3 max-w-sm text-sm text-ink-400">{info.note}</p>
        </div>
      </div>
    )
  }

  const segments = breadcrumbSegments(currentPath)
  const isFavoritesView = view === 'favorites'

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1 text-2xl font-bold">
          {isFavoritesView ? (
            <><Star className="h-5 w-5 text-amber-500" /><span>Favorites</span></>
          ) : (
            <BreadcrumbButton label="All files" targetPath={undefined} currentPath={currentPath} onClick={() => openFolder('/')} />
          )}
          {segments.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" />
              <BreadcrumbButton
                label={segment}
                targetPath={'/' + segments.slice(0, i + 1).join('/')}
                currentPath={currentPath}
                onClick={() => goToBreadcrumb(i)}
              />
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFavoritesView && <Button variant="secondary" size="sm" onClick={() => setCreatingFolder(true)}>
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-0 p-1 dark:border-dark-border dark:bg-dark-surface">
            <button
              onClick={() => setLayout('grid')}
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', layout === 'grid' ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-surface-100 dark:hover:bg-dark-surface2')}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', layout === 'list' ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-surface-100 dark:hover:bg-dark-surface2')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {search && (
        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          Showing results for "{search}" in this folder.{' '}
          <button onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('search'); return n })} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Clear
          </button>
        </p>
      )}

      {!isFavoritesView && (
        <div className="mt-5">
          <UploadDropzone onItemsSelected={handleItemsSelected} />
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-line bg-surface-100 dark:border-dark-border dark:bg-dark-surface2" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
            <AlertCircle className="h-10 w-10 text-danger" />
            <p className="mt-3 font-medium text-ink-700 dark:text-ink-300">Couldn't load this folder</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !filteredEntries || filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
            <FolderPlus className="h-10 w-10 text-ink-300" />
            <p className="mt-3 font-medium text-ink-700 dark:text-ink-300">{search ? 'No matches in this folder' : 'Nothing here yet'}</p>
            <p className="text-sm text-ink-400">{search ? 'Try a different search term.' : 'Items you add will show up here.'}</p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredEntries.map((entry) => (
              <EntryCard key={entry.path} entry={entry} currentPath={currentPath} onOpen={() => openFolder(entry.path)} onPreview={() => setPreviewEntry(entry)} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-0 dark:border-dark-border dark:bg-dark-surface">
            <div className="hidden grid-cols-[1fr_120px_100px_40px] gap-4 border-b border-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-400 dark:border-dark-border sm:grid">
              <span>Name</span>
              <span>Modified</span>
              <span>Size</span>
              <span />
            </div>
            <div className="divide-y divide-line dark:divide-dark-border">
              {filteredEntries.map((entry) => (
                <EntryRow key={entry.path} entry={entry} currentPath={currentPath} onOpen={() => openFolder(entry.path)} onPreview={() => setPreviewEntry(entry)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <PreviewModal entry={previewEntry} onClose={() => setPreviewEntry(null)} />

      <PromptDialog
        open={creatingFolder}
        title="New folder"
        label="Folder name"
        confirmLabel="Create"
        onCancel={() => setCreatingFolder(false)}
        onConfirm={handleCreateFolder}
      />
    </div>
  )
}
