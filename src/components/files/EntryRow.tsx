import { useState, DragEvent } from 'react'
import { Folder } from 'lucide-react'
import { FileEntry } from '@/api/files'
import { fileKindMeta, kindFromName } from '@/lib/fileIcons'
import { formatBytes } from '@/lib/formatBytes'
import { setDragEntry } from '@/lib/dragEntry'
import { useDropToMove } from '@/hooks/useDropToMove'
import { FileMenu } from './FileMenu'
import { cn } from '@/lib/cn'

export function EntryRow({ entry, currentPath, onOpen }: { entry: FileEntry; currentPath: string | undefined; onOpen?: () => void }) {
  const isFolder = entry.type === 'folder'
  const meta = !isFolder ? fileKindMeta[kindFromName(entry.name)] : null
  const Icon = meta?.icon
  const [isDragging, setIsDragging] = useState(false)

  const { isDragOver, dropHandlers } = useDropToMove(isFolder ? entry.path : undefined, currentPath)

  const handleDragStart = (e: DragEvent) => {
    setDragEntry(e.dataTransfer, { path: entry.path, name: entry.name, type: entry.type })
    setIsDragging(true)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={isFolder ? onOpen : undefined}
      {...(isFolder ? dropHandlers : {})}
      className={cn(
        'group grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-50 dark:hover:bg-dark-surface2 sm:grid-cols-[1fr_120px_100px_40px]',
        isFolder && 'cursor-pointer',
        isDragging && 'opacity-40',
        isDragOver && 'bg-brand-50 ring-2 ring-inset ring-brand-400 dark:bg-brand-900/20'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isFolder ? 'bg-brand-500/15' : meta!.bg)}>
          {isFolder ? (
            <Folder className="h-[18px] w-[18px] text-brand-500" strokeWidth={1.75} />
          ) : (
            Icon && <Icon className={cn('h-[18px] w-[18px]', meta!.fg)} strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{entry.name}</p>
          {isFolder && <p className="text-xs text-ink-400">Folder</p>}
        </div>
      </div>
      <span className="hidden text-sm text-ink-400 sm:block">{new Date(entry.modifiedAt).toLocaleDateString()}</span>
      <span className="hidden text-sm text-ink-400 sm:block">{isFolder ? '—' : formatBytes(entry.size)}</span>
      <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <FileMenu entry={entry} currentPath={currentPath} />
      </div>
    </div>
  )
}
