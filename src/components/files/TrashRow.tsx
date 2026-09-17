import { Folder, RotateCcw, Trash2 } from 'lucide-react'
import { TrashEntry } from '@/api/files'
import { fileKindMeta, kindFromName } from '@/lib/fileIcons'
import { formatBytes } from '@/lib/formatBytes'
import { cn } from '@/lib/cn'

function formatDeletedAt(deletedAt: string) {
  const seconds = Number(deletedAt)
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleDateString()
}

export function TrashRow({
  item,
  onRestore,
  onDeleteForever,
  busy,
}: {
  item: TrashEntry
  onRestore: () => void
  onDeleteForever: () => void
  busy?: boolean
}) {
  const isFolder = item.type === 'folder'
  const meta = !isFolder ? fileKindMeta[kindFromName(item.name)] : null
  const Icon = meta?.icon

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-50 dark:hover:bg-dark-surface2 sm:grid-cols-[1fr_180px_120px_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isFolder ? 'bg-brand-500/15' : meta!.bg)}>
          {isFolder ? (
            <Folder className="h-[18px] w-[18px] text-brand-500" strokeWidth={1.75} />
          ) : (
            Icon && <Icon className={cn('h-[18px] w-[18px]', meta!.fg)} strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{item.name}</p>
          <p className="truncate text-xs text-ink-400">Was in /{item.originalLocation}</p>
        </div>
      </div>
      <span className="hidden text-sm text-ink-400 sm:block">Deleted {formatDeletedAt(item.deletedAt)}</span>
      <span className="hidden text-sm text-ink-400 sm:block">{isFolder ? '—' : formatBytes(item.size)}</span>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label={`Restore ${item.name}`}
          disabled={busy}
          onClick={onRestore}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-dark-surface2"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${item.name} forever`}
          disabled={busy}
          onClick={onDeleteForever}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
