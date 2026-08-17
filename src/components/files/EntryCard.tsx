import { useState, DragEvent } from 'react'
import { Folder } from 'lucide-react'
import { FileEntry } from '@/api/files'
import { fileKindMeta, kindFromName } from '@/lib/fileIcons'
import { formatBytes } from '@/lib/formatBytes'
import { setDragEntry } from '@/lib/dragEntry'
import { useDropToMove } from '@/hooks/useDropToMove'
import { FileMenu } from './FileMenu'
import { cn } from '@/lib/cn'

export function EntryCard({ entry, currentPath, onOpen }: { entry: FileEntry; currentPath: string | undefined; onOpen?: () => void }) {
  const isFolder = entry.type === 'folder'
  const meta = !isFolder ? fileKindMeta[kindFromName(entry.name)] : null
  const Icon = meta?.icon
  const [isDragging, setIsDragging] = useState(false)

  // Only folders accept drops (you can't drag a file "into" another file).
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
        'group relative flex flex-col rounded-2xl border border-line bg-surface-0 p-4 shadow-softer transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-dark-border dark:bg-dark-surface',
        isFolder && 'cursor-pointer',
        isDragging && 'opacity-40',
        isDragOver && 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-900/20'
      )}
    >
      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <FileMenu entry={entry} currentPath={currentPath} />
      </div>

      <div className={cn('flex h-16 w-16 items-center justify-center self-center rounded-2xl', isFolder ? 'bg-brand-500/15' : meta!.bg)}>
        {isFolder ? (
          <Folder className="h-7 w-7 text-brand-500" strokeWidth={1.75} />
        ) : (
          Icon && <Icon className={cn('h-7 w-7', meta!.fg)} strokeWidth={1.75} />
        )}
      </div>

      <p className="mt-3 truncate text-center text-sm font-medium text-ink-900 dark:text-white" title={entry.name}>
        {entry.name}
      </p>

      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <span>{isFolder ? 'Folder' : formatBytes(entry.size)}</span>
        <span>·</span>
        <span>{new Date(entry.modifiedAt).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
