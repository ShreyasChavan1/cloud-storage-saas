import { useState } from 'react'
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  FolderX,
} from 'lucide-react'
import { useUploadQueue, QueueEntry, UploadEntry } from '@/context/UploadQueueContext'
import { fileKindMeta } from '@/lib/fileIcons'
import { cn } from '@/lib/cn'

function ConflictRow({ entry }: { entry: Extract<QueueEntry, { kind: 'conflict' }> }) {
  const { resolveConflict } = useUploadQueue()
  return (
    <div className="border-b border-line px-4 py-3 last:border-0 dark:border-dark-border">
      <div className="flex items-start gap-2.5">
        {entry.isFolder ? (
          <Folder className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        ) : (
          <FolderX className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        )}
        <p className="min-w-0 flex-1 text-xs text-ink-700 dark:text-ink-300">
          <span className="font-medium text-ink-900 dark:text-white">"{entry.name}"</span> already exists here
          {entry.fileCount > 1 ? ` (${entry.fileCount} files)` : ''}.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
        <button
          onClick={() => resolveConflict(entry.id, 'replace')}
          className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
        >
          Replace
        </button>
        <button
          onClick={() => resolveConflict(entry.id, 'keep-both')}
          className="rounded-lg border border-line bg-surface-0 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface2 dark:text-ink-300"
        >
          Keep both
        </button>
        <button
          onClick={() => resolveConflict(entry.id, 'skip')}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-500 hover:bg-surface-100 dark:text-ink-400 dark:hover:bg-dark-surface2"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

function UploadRow({ entry, indent }: { entry: UploadEntry; indent?: boolean }) {
  const { cancelUpload, retryUpload, dismissUpload } = useUploadQueue()
  const meta = fileKindMeta[entry.fileKind]
  const Icon = meta.icon

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5', indent && 'pl-11')}>
      <div className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
        <Icon className={cn('h-4 w-4', meta.fg)} strokeWidth={1.75} />
        {entry.status === 'success' && (
          <CheckCircle2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-surface-0 text-success dark:bg-dark-surface" />
        )}
        {entry.status === 'error' && (
          <XCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-surface-0 text-danger dark:bg-dark-surface" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink-900 dark:text-white" title={entry.displayPath}>
          {entry.displayPath}
        </p>
        {entry.status === 'error' ? (
          <p className="mt-0.5 truncate text-[11px] text-danger" title={entry.error}>
            {entry.error ?? 'Upload failed.'}
          </p>
        ) : entry.status === 'canceled' ? (
          <p className="mt-0.5 text-[11px] text-ink-400">Canceled</p>
        ) : entry.status === 'queued' ? (
          <p className="mt-0.5 text-[11px] text-ink-400">Waiting…</p>
        ) : (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-dark-surface2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-200',
                entry.status === 'success' ? 'bg-success' : 'bg-brand-500'
              )}
              style={{ width: `${entry.percent}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {entry.status === 'uploading' && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        )}
        {(entry.status === 'error' || entry.status === 'canceled') && entry.retryable && (
          <button
            onClick={() => retryUpload(entry.id)}
            aria-label={`Retry uploading ${entry.displayPath}`}
            className="rounded-md p-1 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface2 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {(entry.status === 'uploading' || entry.status === 'queued') && (
          <button
            onClick={() => cancelUpload(entry.id)}
            aria-label={`Cancel uploading ${entry.displayPath}`}
            className="rounded-md p-1 text-ink-400 hover:bg-surface-100 hover:text-danger dark:hover:bg-dark-surface2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {(entry.status === 'error' || entry.status === 'canceled') && (
          <button
            onClick={() => dismissUpload(entry.id)}
            aria-label={`Dismiss ${entry.displayPath}`}
            className="rounded-md p-1 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface2 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// One row per uploaded folder, aggregating every file that came from it —
// a 200-file folder upload would otherwise be 200 individual rows. Shows
// a combined progress bar and expands to the per-file list on request.
function FolderGroupRow({ folderName, items }: { folderName: string; items: UploadEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const { cancelUpload } = useUploadQueue()

  const total = items.length
  const succeeded = items.filter((e) => e.status === 'success').length
  const failed = items.filter((e) => e.status === 'error').length
  const canceled = items.filter((e) => e.status === 'canceled').length
  const active = items.filter((e) => e.status === 'uploading' || e.status === 'queued')
  const overallPercent = Math.round(items.reduce((sum, e) => sum + e.percent, 0) / total)

  const statusLabel =
    active.length > 0
      ? `${succeeded}/${total} uploaded${failed > 0 ? ` · ${failed} failed` : ''}`
      : failed > 0 || canceled > 0
        ? `${succeeded}/${total} uploaded · ${failed + canceled} ${failed > 0 ? 'failed' : 'canceled'}`
        : `${total} file${total > 1 ? 's' : ''} uploaded`

  return (
    <div className="border-b border-line last:border-0 dark:border-dark-border">
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-50 dark:hover:bg-dark-surface2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15">
          <Folder className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink-900 dark:text-white" title={folderName}>
            {folderName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-dark-surface2">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-200',
                  failed > 0 ? 'bg-danger' : active.length === 0 ? 'bg-success' : 'bg-brand-500'
                )}
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] text-ink-400">{statusLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {active.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                active.forEach((item) => cancelUpload(item.id))
              }}
              aria-label={`Cancel remaining uploads in ${folderName}`}
              className="rounded-md p-1 text-ink-400 hover:bg-surface-100 hover:text-danger dark:hover:bg-dark-surface2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronRight className={cn('h-4 w-4 text-ink-400 transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-line pb-1 dark:divide-dark-border">
          {items.map((item) => (
            <UploadRow key={item.id} entry={item} indent />
          ))}
        </div>
      )}
    </div>
  )
}

export function UploadProgressPanel() {
  const { entries, cancelAll, clearFinished } = useUploadQueue()
  const [collapsed, setCollapsed] = useState(false)
  if (entries.length === 0) return null

  const fileEntries = entries.filter((e): e is UploadEntry => e.kind === 'file')
  const conflictEntries = entries.filter((e): e is Extract<QueueEntry, { kind: 'conflict' }> => e.kind === 'conflict')
  const activeCount = fileEntries.filter((e) => e.status === 'uploading' || e.status === 'queued').length
  const hasFinished = fileEntries.some((e) => e.status === 'success' || e.status === 'error' || e.status === 'canceled')
  const hasActiveOrConflicts = activeCount > 0 || conflictEntries.length > 0

  const activeItems = fileEntries.filter((e) => e.status === 'uploading' || e.status === 'queued')
  const overallPercent =
    activeItems.length > 0 ? Math.round(activeItems.reduce((sum, e) => sum + e.percent, 0) / activeItems.length) : 0

  // Fold consecutive-by-appearance files sharing a folderGroupId into one
  // row each, in the order their group first appeared — flat files render
  // individually as before.
  const renderedGroups = new Set<string>()
  const rows = fileEntries.map((entry) => {
    if (!entry.folderGroupId) return <UploadRow key={entry.id} entry={entry} />
    if (renderedGroups.has(entry.folderGroupId)) return null
    renderedGroups.add(entry.folderGroupId)
    const groupItems = fileEntries.filter((e) => e.folderGroupId === entry.folderGroupId)
    return <FolderGroupRow key={entry.folderGroupId} folderName={entry.folderName ?? 'Folder'} items={groupItems} />
  })

  return (
    <div className="fixed bottom-4 left-4 z-[90] w-80 overflow-hidden rounded-2xl border border-line bg-surface-0 shadow-soft dark:border-dark-border dark:bg-dark-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold dark:border-dark-border">
        <UploadCloud className="h-4 w-4 text-brand-500" />
        <span className="flex-1">
          {activeCount > 0
            ? `Uploading ${activeCount} item${activeCount > 1 ? 's' : ''}`
            : conflictEntries.length > 0
              ? 'Needs your input'
              : 'Uploads'}
        </span>
        {hasActiveOrConflicts && activeCount > 0 && (
          <button
            onClick={cancelAll}
            className="text-xs font-medium text-ink-400 hover:text-danger"
            title="Cancel all uploads"
          >
            Cancel all
          </button>
        )}
        {hasFinished && (
          <button
            onClick={clearFinished}
            className="text-xs font-medium text-ink-400 hover:text-ink-700 dark:hover:text-ink-300"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand upload panel' : 'Collapse upload panel'}
          className="rounded-md p-0.5 text-ink-400 hover:bg-surface-100 dark:hover:bg-dark-surface2"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {activeCount > 0 && (
        <div className="h-1 w-full bg-surface-100 dark:bg-dark-surface2">
          <div
            className="h-full bg-brand-500 transition-all duration-200"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      )}

      {!collapsed && (
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {conflictEntries.map((entry) => (
            <ConflictRow key={entry.id} entry={entry} />
          ))}
          <div className="divide-y divide-line dark:divide-dark-border">{rows}</div>
        </div>
      )}
    </div>
  )
}
