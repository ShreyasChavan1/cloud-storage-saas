import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react'
import { useUploadQueue } from '@/context/UploadQueueContext'
import { cn } from '@/lib/cn'

export function UploadProgressPanel() {
  const { uploads } = useUploadQueue()
  if (uploads.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-[90] w-72 overflow-hidden rounded-2xl border border-line bg-surface-0 shadow-soft dark:border-dark-border dark:bg-dark-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold dark:border-dark-border">
        <UploadCloud className="h-4 w-4 text-brand-500" />
        Uploading {uploads.filter((u) => u.status === 'uploading').length || uploads.length} file
        {uploads.length > 1 ? 's' : ''}
      </div>
      <div className="max-h-64 overflow-y-auto scrollbar-thin">
        {uploads.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            {item.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : item.status === 'error' ? (
              <XCircle className="h-4 w-4 shrink-0 text-danger" />
            ) : (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink-900 dark:text-white" title={item.name}>
                {item.name}
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-dark-surface2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-200',
                    item.status === 'error' ? 'bg-danger' : item.status === 'success' ? 'bg-success' : 'bg-brand-500'
                  )}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
