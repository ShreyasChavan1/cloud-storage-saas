import { Upload, Share2, Trash2, Pencil, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { recentActivity, ActivityItem } from '@/data/dummyData'

const iconMap: Record<ActivityItem['kind'], { icon: typeof Upload; className: string }> = {
  upload: { icon: Upload, className: 'bg-blue-50 text-brand-600 dark:bg-brand-900/30' },
  share: { icon: Share2, className: 'bg-green-50 text-success dark:bg-green-900/20' },
  delete: { icon: Trash2, className: 'bg-red-50 text-danger dark:bg-red-900/20' },
  edit: { icon: Pencil, className: 'bg-amber-50 text-warning dark:bg-amber-900/20' },
  comment: { icon: MessageSquare, className: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20' },
}

export function RecentActivity() {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Recent activity</h3>

      <div className="mt-4 flex flex-col gap-4">
        {recentActivity.map((item) => {
          const { icon: Icon, className } = iconMap[item.kind]
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <p className="text-sm leading-snug text-ink-700 dark:text-ink-300">
                <span className="font-medium text-ink-900 dark:text-white">{item.actor}</span> {item.action}{' '}
                <span className="font-medium text-ink-900 dark:text-white">{item.target}</span>
                <span className="ml-1.5 text-xs text-ink-400">{item.time}</span>
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
