import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Star, Trash2, Share2, Folder as FolderIcon } from 'lucide-react'
import { EntryCard } from '@/components/files/EntryCard'
import { EntryRow } from '@/components/files/EntryRow'
import { UploadDropzone } from '@/components/files/UploadDropzone'
import { allEntries } from '@/data/dummyData'
import { cn } from '@/lib/cn'

const viewMeta: Record<string, { label: string; icon: typeof FolderIcon }> = {
  all: { label: 'All files', icon: FolderIcon },
  shared: { label: 'Shared with you', icon: Share2 },
  favorites: { label: 'Favorites', icon: Star },
  trash: { label: 'Trash', icon: Trash2 },
}

export default function Files() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') ?? 'all'
  const { label, icon: ViewIcon } = viewMeta[view] ?? viewMeta.all

  const entries = useMemo(() => {
    if (view === 'favorites') return allEntries.filter((e) => e.favorite)
    if (view === 'shared') return allEntries.filter((e) => e.type === 'file' && e.shared)
    if (view === 'trash') return []
    return allEntries
  }, [view])

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ViewIcon className="h-5 w-5 text-ink-400" />
          <h1 className="text-2xl font-bold">{label}</h1>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-0 p-1 dark:border-dark-border dark:bg-dark-surface">
          <button
            onClick={() => setLayout('grid')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              layout === 'grid' ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-surface-100 dark:hover:bg-dark-surface2'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              layout === 'list' ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-surface-100 dark:hover:bg-dark-surface2'
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'all' && (
        <div className="mt-5">
          <UploadDropzone />
        </div>
      )}

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center dark:border-dark-border">
            <Trash2 className="h-10 w-10 text-ink-300" />
            <p className="mt-3 font-medium text-ink-700 dark:text-ink-300">Nothing here yet</p>
            <p className="text-sm text-ink-400">Items you {view === 'trash' ? 'delete' : 'add'} will show up here.</p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
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
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
