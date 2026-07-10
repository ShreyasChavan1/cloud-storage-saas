import { Folder, Star, Users } from 'lucide-react'
import { Entry } from '@/data/dummyData'
import { fileKindMeta } from '@/lib/fileIcons'
import { FileMenu } from './FileMenu'
import { cn } from '@/lib/cn'

export function EntryCard({ entry }: { entry: Entry }) {
  const isFolder = entry.type === 'folder'
  const meta = !isFolder ? fileKindMeta[entry.kind] : null
  const Icon = meta?.icon

  return (
    <div className="group relative flex flex-col rounded-2xl border border-line bg-surface-0 p-4 shadow-softer transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-dark-border dark:bg-dark-surface">
      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <FileMenu entry={entry} />
      </div>

      {entry.favorite && (
        <Star className="absolute left-3 top-3 h-4 w-4 fill-gold text-gold" />
      )}

      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center self-center rounded-2xl',
          isFolder ? `${entry.color}/15` : meta!.bg
        )}
      >
        {isFolder ? (
          <Folder className={cn('h-7 w-7', entry.color?.replace('bg-', 'text-'))} strokeWidth={1.75} />
        ) : (
          Icon && <Icon className={cn('h-7 w-7', meta!.fg)} strokeWidth={1.75} />
        )}
      </div>

      <p className="mt-3 truncate text-center text-sm font-medium text-ink-900 dark:text-white" title={entry.name}>
        {entry.name}
      </p>

      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <span>{isFolder ? `${entry.itemCount} items` : entry.size}</span>
        <span>·</span>
        <span>{entry.modified}</span>
        {entry.type === 'file' && entry.shared && <Users className="h-3 w-3" />}
      </div>
    </div>
  )
}
