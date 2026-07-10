import { useAuth } from '@/context/AuthContext'
import { StorageCard } from '@/components/dashboard/StorageCard'
import { QuickUpload } from '@/components/dashboard/QuickUpload'
import { RecentFiles } from '@/components/dashboard/RecentFiles'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { UpgradeCard } from '@/components/dashboard/UpgradeCard'

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {firstName} 👋</h1>
        <p className="text-ink-500 dark:text-ink-400">Here's what's happening with your files today.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <StorageCard />
        <QuickUpload />
        <UpgradeCard />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentFiles />
        </div>
        <RecentActivity />
      </div>
    </div>
  )
}
