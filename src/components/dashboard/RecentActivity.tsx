import { Activity } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// There is no activity-log endpoint anywhere in the backend — none of
// Phases 1-6 built one. Rather than fabricate fake upload/share/delete
// events the way the old dummy data did, this card just says so honestly.
export function RecentActivity() {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Recent activity</h3>
      <div className="mt-8 flex flex-col items-center text-center">
        <Activity className="mb-2 h-6 w-6 text-ink-300" />
        <p className="text-sm text-ink-400">Activity tracking isn't available yet.</p>
      </div>
    </Card>
  )
}
