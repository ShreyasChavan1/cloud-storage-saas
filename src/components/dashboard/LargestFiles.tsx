import { Link } from 'react-router-dom'
import { AlertCircle, HardDrive } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useStorageStats } from '@/hooks/useStorageStats'
import { fileKindMeta, kindFromName } from '@/lib/fileIcons'
import { formatBytes } from '@/lib/formatBytes'
import { dirname } from '@/lib/paths'
import { FileMenu } from '@/components/files/FileMenu'

export function LargestFiles() {
  const { data: stats, isLoading, isError } = useStorageStats()
  const largest = (stats?.largestFiles ?? []).slice(0, 5)
  const maxSize = largest[0]?.size ?? 0

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Largest files</h3>
        <Link to="/files" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-3 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-100 dark:bg-dark-surface2" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 flex flex-col items-center text-center text-sm text-danger">
          <AlertCircle className="mb-2 h-6 w-6" />
          Couldn't load storage breakdown.
        </div>
      ) : largest.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center text-sm text-ink-400">
          <HardDrive className="mb-2 h-6 w-6 text-ink-300" />
          No files yet.
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-line dark:divide-dark-border">
          {largest.map((file) => {
            const meta = fileKindMeta[kindFromName(file.name)]
            const Icon = meta.icon
            // Relative to the largest file in this list, purely so the
            // eye has something to compare against — not a % of quota.
            const relativePct = maxSize > 0 ? Math.max(6, Math.round((file.size / maxSize) * 100)) : 0
            return (
              <div key={file.path} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                  <Icon className={`h-[18px] w-[18px] ${meta.fg}`} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-white" title={file.path}>
                      {file.name}
                    </p>
                    <span className="shrink-0 text-xs font-medium text-ink-500 dark:text-ink-400">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-dark-surface2">
                    <div className="h-full rounded-full bg-brand-400" style={{ width: `${relativePct}%` }} />
                  </div>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <FileMenu entry={file} currentPath={dirname(file.path)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
