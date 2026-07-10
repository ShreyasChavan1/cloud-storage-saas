import { Folder, Star, Users } from 'lucide-react'
import { Entry } from '@/data/dummyData'
import { fileKindMeta } from '@/lib/fileIcons'
import { FileMenu } from './FileMenu'
import { cn } from '@/lib/cn'

export function EntryRow({ entry }: { entry: Entry }) {
  const isFolder = entry.type === 'folder'
  const meta = !isFolder ? fileKindMeta[entry.kind] : null
  const Icon = meta?.icon

  return (
    <div className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-50 dark:hover:bg-dark-surface2 sm:grid-cols-[1fr_120px_100px_40px]">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isFolder ? `${entry.color}/15` : meta!.bg
          )}
        >
          {isFolder ? (
            <Folder className={cn('h-[18px] w-[18px]', entry.color?.replace('bg-', 'text-'))} strokeWidth={1.75} />
          ) : (
            Icon && <Icon className={cn('h-[18px] w-[18px]', meta!.fg)} strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{entry.name}</p>
          {isFolder && <p className="text-xs text-ink-400">{entry.itemCount} items</p>}
        </div>
        {entry.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}
        {entry.type === 'file' && entry.shared && <Users className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
      </div>
      <span className="hidden text-sm text-ink-400 sm:block">{entry.modified}</span>
      <span className="hidden text-sm text-ink-400 sm:block">{entry.size}</span>
      <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <FileMenu entry={entry} />
      </div>
    </div>
  )
}
