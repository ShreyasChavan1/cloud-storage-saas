import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Star, Trash2, Share2, FolderPlus, ChevronRight, AlertCircle } from 'lucide-react'
import { EntryCard } from '@/components/files/EntryCard'
import { EntryRow } from '@/components/files/EntryRow'
import { UploadDropzone } from '@/components/files/UploadDropzone'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { Button } from '@/components/ui/Button'
import { useFiles } from '@/hooks/useFiles'
import { useUploadFile, useCreateFolder } from '@/hooks/useFileMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { cn } from '@/lib/cn'

// Favorites, Shared, and Trash have no backend support at all — Phase 6
// only ever built plain directory listing (no favorite-flag, sharing, or
// trash endpoints exist). Showing an honest "not available yet" state here
// is the alternative to either hiding these entry points or faking data.
const unsupportedViews: Record<string, { label: string; icon: typeof Star; note: string }> = {
  favorites: { label: 'Favorites', icon: Star, note: "Favoriting isn't wired up to the backend yet." },
  shared: { label: 'Shared with you', icon: Share2, note: "Sharing isn't wired up to the backend yet." },
  trash: { label: 'Trash', icon: Trash2, note: "Trash isn't wired up to the backend yet — deleted items are gone for now." },
}

function breadcrumbSegments(path: string | undefined) {
  if (!path || path === '/') return []
  return path.split('/').filter(Boolean)
}

export default function Files() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()

  const view = searchParams.get('view') ?? 'all'
  const currentPath = searchParams.get('path') ?? undefined
  const search = searchParams.get('search') ?? ''

  const { data: entries, isLoading, isError, refetch } = useFiles(view === 'all' ? currentPath : undefined)
  const uploadFile = useUploadFile(currentPath)
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

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      uploadFile.mutate(
        { file },
        {
          onSuccess: () => showToast(`Uploaded "${file.name}".`),
          onError: (err) => showToast(getErrorMessage(err, `Failed to upload "${file.name}".`), 'error'),
        }
      )
    })
  }

  const handleCreateFolder = (name: string) => {
    setCreatingFolder(false)
    createFolder.mutate(name, {
      onSuccess: () => showToast(`Created folder "${name}".`),
      onError: (err) => showToast(getErrorMessage(err, 'Could not create folder.'), 'error'),
    })
  }

  if (view !== 'all') {
    const info = unsupportedViews[view] ?? unsupportedViews.trash
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

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1 text-2xl font-bold">
          <button onClick={() => openFolder('/')} className="hover:text-brand-600 dark:hover:text-brand-400">
            All files
          </button>
          {segments.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" />
              <button onClick={() => goToBreadcrumb(i)} className="truncate hover:text-brand-600 dark:hover:text-brand-400">
                {segment}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCreatingFolder(true)}>
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
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

      <div className="mt-5">
        <UploadDropzone onFilesSelected={handleFilesSelected} />
      </div>

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
              <EntryCard key={entry.path} entry={entry} currentPath={currentPath} onOpen={() => openFolder(entry.path)} />
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
                <EntryRow key={entry.path} entry={entry} currentPath={currentPath} onOpen={() => openFolder(entry.path)} />
              ))}
            </div>
          </div>
        )}
      </div>

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
