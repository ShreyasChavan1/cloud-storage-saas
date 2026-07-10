import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StorageRing } from '@/components/ui/StorageRing'
import { storage } from '@/data/dummyData'

export function StorageCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Storage used</h3>
        <StorageRing value={storage.usedGB} max={storage.totalGB} size={64} />
      </div>

      <p className="mt-4 font-display text-2xl font-bold">
        {storage.usedGB}GB <span className="text-base font-medium text-ink-400">/ {storage.totalGB}GB</span>
      </p>
      <ProgressBar value={storage.usedGB} max={storage.totalGB} className="mt-3" />

      <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
        {storage.totalGB - storage.usedGB}GB left on your Pro plan.
      </p>

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
