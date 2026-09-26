import { Users, UserCheck, UserX, ShieldCheck, Radio, Database, Loader2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { SupportContactCard } from '@/components/admin/SupportContactCard'
import { useAdminOverview, useAdminStorageOverview } from '@/hooks/useAdminUsers'
import { formatBytes } from '@/lib/formatBytes'

const cards = [
  { key: 'totalUsers', label: 'Total users', icon: Users },
  { key: 'activeUsers', label: 'Active', icon: UserCheck },
  { key: 'suspendedUsers', label: 'Suspended', icon: UserX },
  { key: 'adminCount', label: 'Admins', icon: ShieldCheck },
  { key: 'activeSessions', label: 'Active sessions', icon: Radio },
] as const

export default function AdminDashboard() {
  const { data: overview, isLoading, isError } = useAdminOverview()
  const { data: storage, isLoading: storageLoading, isFetching: storageFetching, isError: storageError } = useAdminStorageOverview()

  return (
    <div className="mx-auto max-w-7xl animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin</h1>
        <p className="text-ink-500 dark:text-ink-400">Manage accounts, quotas, and access across Nimbus.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center gap-2 text-ink-400">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900 dark:text-white">
              {isLoading ? '—' : isError ? '?' : overview?.[key]}
            </p>
          </Card>
        ))}

        <Card className="p-5">
          <div className="flex items-center gap-2 text-ink-400">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Total storage used</span>
            {storageFetching && !storageLoading && <Loader2 className="h-3 w-3 animate-spin text-ink-300" />}
          </div>
          {storageLoading ? (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
              <span className="text-sm text-ink-400">Adding up every account…</span>
            </div>
          ) : storageError ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4" />
              Couldn't load
            </p>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900 dark:text-white">
                {formatBytes(storage!.totalUsedBytes)}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Across {storage!.provisionedUsers} account{storage!.provisionedUsers === 1 ? '' : 's'}
                {storage!.failedUsers > 0 && ` (${storage!.failedUsers} unreachable)`}
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <AdminUsersTable />
      </div>
    </div>
  )
}
