import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { recentFiles } from '@/data/dummyData'
import { fileKindMeta } from '@/lib/fileIcons'
import { FileMenu } from '@/components/files/FileMenu'

export function RecentFiles() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent files</h3>
        <Link to="/files" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          View all
        </Link>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-line dark:divide-dark-border">
        {recentFiles.map((file) => {
          const meta = fileKindMeta[file.kind]
          const Icon = meta.icon
          return (
            <div key={file.id} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                <Icon className={`h-[18px] w-[18px] ${meta.fg}`} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-ink-400">
                  {file.size} · {file.modified}
                </p>
              </div>
              <div className="opacity-0 transition-opacity group-hover:opacity-100">
                <FileMenu entry={file} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
