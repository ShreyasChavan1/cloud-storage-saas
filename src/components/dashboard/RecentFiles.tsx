import { Link } from 'react-router-dom'
import { AlertCircle, FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useFiles } from '@/hooks/useFiles'
import { fileKindMeta, kindFromName } from '@/lib/fileIcons'
import { formatBytes } from '@/lib/formatBytes'
import { FileMenu } from '@/components/files/FileMenu'

// There's no dedicated "recent files" endpoint in the backend — this is
// the root folder's real listing, sorted by modified date client-side.
// It won't surface recently-touched files buried in subfolders, unlike a
// true recent-activity feed would.
export function RecentFiles() {
  const { data: entries, isLoading, isError } = useFiles(undefined)

  const recent = (entries ?? [])
    .filter((e) => e.type === 'file')
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    .slice(0, 5)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent files</h3>
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
          Couldn't load recent files.
        </div>
      ) : recent.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center text-sm text-ink-400">
          <FileText className="mb-2 h-6 w-6 text-ink-300" />
          No files yet — upload something to see it here.
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-line dark:divide-dark-border">
          {recent.map((file) => {
            const meta = fileKindMeta[kindFromName(file.name)]
            const Icon = meta.icon
            return (
              <div key={file.path} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                  <Icon className={`h-[18px] w-[18px] ${meta.fg}`} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-ink-400">
                    {formatBytes(file.size)} · {new Date(file.modifiedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <FileMenu entry={file} currentPath={undefined} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
