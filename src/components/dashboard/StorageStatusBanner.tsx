import { AlertTriangle, CreditCard, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuota } from '@/hooks/useQuota'
import { useSubscription } from '@/hooks/useSubscription'
import { formatBytes } from '@/lib/formatBytes'

export function StorageStatusBanner() {
  const { data: quota } = useQuota()
  const { data: subscription } = useSubscription()

  if (!quota || !subscription || subscription.plan.toLowerCase() === 'free' && subscription.status === 'ACTIVE') return null

  const limitBytes = subscription.storageLimitGb * 1024 * 1024 * 1024
  const overQuota = quota.used > limitBytes
  const pastDue = subscription.status === 'PAST_DUE'
  const canceling = subscription.cancelAtPeriodEnd

  if (!overQuota && !pastDue && !canceling) return null

  if (overQuota) {
    return (
      <div className="mb-5 rounded-2xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-900/50 dark:bg-accent-900/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900 dark:text-white">Your storage is over the Free plan limit</p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
              You are using {formatBytes(quota.used)} while your current plan allows {formatBytes(limitBytes)}. Your existing files are safe, but new uploads are disabled until you delete files or upgrade.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">
                <CreditCard className="h-3.5 w-3.5" /> Upgrade plan
              </Link>
              <Link to="/files" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-white dark:border-dark-border dark:text-ink-200 dark:hover:bg-dark-surface2">
                <Trash2 className="h-3.5 w-3.5" /> Manage files
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (pastDue) {
    return (
      <div className="mb-5 rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">Your subscription payment needs attention</p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
              We could not confirm your latest renewal payment. Your paid storage remains available during the billing grace period. Update your payment or renew your plan to avoid losing upload access.
            </p>
            <Link to="/pricing" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">
              <CreditCard className="h-3.5 w-3.5" /> Renew plan
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (canceling) {
    return (
      <div className="mb-5 rounded-2xl border border-line bg-surface-50 p-4 dark:border-dark-border dark:bg-dark-surface2">
        <p className="font-semibold text-ink-900 dark:text-white">Your subscription is set to end at the current billing period</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">You keep your current plan and storage until {new Date(subscription.renewalDate).toLocaleDateString()} and will not be charged for the next period.</p>
      </div>
    )
  }

  return null
}
