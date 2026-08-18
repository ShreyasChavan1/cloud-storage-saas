import { Link } from 'react-router-dom'
import { Sparkles, AlertCircle, Files } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StorageRing } from '@/components/ui/StorageRing'
import { useQuota } from '@/hooks/useQuota'
import { useStorageStats } from '@/hooks/useStorageStats'
import { formatBytes } from '@/lib/formatBytes'

export function StorageCard() {
  const { data: quota, isLoading, isError } = useQuota()
  const { data: stats } = useStorageStats()

  const usedBytes = quota?.used ?? 0
  const hasKnownLimit = typeof quota?.available === 'number'
  const totalBytes = hasKnownLimit ? usedBytes + (quota!.available as number) : undefined

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Storage used</h3>
        {isLoading ? (
          <div className="h-16 w-16 animate-pulse rounded-full bg-surface-100 dark:bg-dark-surface2" />
        ) : totalBytes !== undefined ? (
          <StorageRing value={usedBytes} max={totalBytes} size={64} />
        ) : null}
      </div>

      {isError ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          Couldn't load storage usage.
        </div>
      ) : isLoading ? (
        <div className="mt-4 h-7 w-32 animate-pulse rounded bg-surface-100 dark:bg-dark-surface2" />
      ) : (
        <>
          <p className="mt-4 font-display text-2xl font-bold">
            {formatBytes(usedBytes)}
            {totalBytes !== undefined && <span className="text-base font-medium text-ink-400"> / {formatBytes(totalBytes)}</span>}
          </p>
          {totalBytes !== undefined && <ProgressBar value={usedBytes} max={totalBytes} className="mt-3" />}
          <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
            {totalBytes !== undefined
              ? `${formatBytes(totalBytes - usedBytes)} left on your plan.`
              : "Storage limit isn't reported for this plan."}
          </p>
          {stats && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
              <Files className="h-3.5 w-3.5" />
              {stats.totalFiles.toLocaleString()} file{stats.totalFiles === 1 ? '' : 's'} in{' '}
              {stats.totalFolders.toLocaleString()} folder{stats.totalFolders === 1 ? '' : 's'}
            </p>
          )}
        </>
      )}

      <Link
        to="/pricing"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade for more space
      </Link>
    </Card>
  )
}
