import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MoreVertical, ChevronLeft, ChevronRight, UserPlus, KeyRound, Ban, PlayCircle, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CreateUserDialog } from './CreateUserDialog'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useSetUserStatus, useDeleteUser } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { AdminUser } from '@/api/admin'

const PAGE_SIZE = 15

// No debounce utility exists elsewhere in this codebase yet, so this is
// kept local rather than introducing a new shared one for a single caller.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function AdminUsersTable() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  useEffect(() => setPage(1), [search, statusFilter])

  const { data, isLoading, isError } = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter || undefined,
  })

  const setStatus = useSetUserStatus()
  const deleteUser = useDeleteUser()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  const handleConfirmStatus = () => {
    if (!statusTarget) return
    const next = statusTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setStatus.mutate(
      { id: statusTarget.id, status: next },
      {
        onSuccess: () => {
          showToast(next === 'SUSPENDED' ? `Suspended ${statusTarget.email}` : `Reactivated ${statusTarget.email}`)
          setStatusTarget(null)
        },
        onError: (err) => {
          showToast(getErrorMessage(err), 'error')
          setStatusTarget(null)
        },
      }
    )
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        showToast(`Deleted ${deleteTarget.email}`)
        setDeleteTarget(null)
      },
      onError: (err) => {
        showToast(getErrorMessage(err), 'error')
        setDeleteTarget(null)
      },
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Users</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <UserPlus className="h-4 w-4" />
          Create user
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-surface-50 pl-10 pr-3 text-sm outline-none transition-colors focus:border-brand-500 focus:bg-surface-0 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:focus:ring-brand-900/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-xl border border-line bg-surface-0 px-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line dark:border-dark-border">
        <div className="hidden grid-cols-[1fr_100px_110px_140px_40px] gap-4 border-b border-line bg-surface-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-400 dark:border-dark-border dark:bg-dark-surface2 sm:grid">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Plan</span>
          <span />
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-ink-400">Loading users...</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-danger">Couldn't load users. Please try again.</div>
        ) : data && data.users.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-400">No users match this search.</div>
        ) : (
          <div className="divide-y divide-line dark:divide-dark-border">
            {data?.users.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-dark-surface2 sm:grid-cols-[1fr_100px_110px_140px_40px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={u.avatarInitials} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-xs text-ink-400">{u.email}</p>
                  </div>
                </div>
                <span className="hidden sm:block">
                  <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>{u.role}</Badge>
                </span>
                <span className="hidden sm:block">
                  <Badge tone={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge>
                </span>
                <span className="hidden truncate text-sm text-ink-500 dark:text-ink-400 sm:block">
                  {u.plan ?? '—'}
                </span>
                <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                  <DropdownMenu
                    trigger={
                      <button
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface dark:hover:text-white"
                        aria-label={`Actions for ${u.name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                    items={[
                      {
                        label: 'Reset password',
                        icon: <KeyRound className="h-4 w-4" />,
                        onSelect: () => setResetTarget(u),
                      },
                      {
                        label: u.status === 'ACTIVE' ? 'Suspend' : 'Activate',
                        icon:
                          u.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />,
                        onSelect: () => setStatusTarget(u),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 className="h-4 w-4" />,
                        tone: 'danger',
                        onSelect: () => setDeleteTarget(u),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500 dark:text-ink-400">
          <span>
            {data.total} user{data.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {resetTarget && (
        <ResetPasswordDialog
          open
          userId={resetTarget.id}
          userEmail={resetTarget.email}
          onClose={() => setResetTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'ACTIVE' ? 'Suspend user?' : 'Reactivate user?'}
        message={
          statusTarget?.status === 'ACTIVE'
            ? `${statusTarget?.email} will be signed out everywhere and unable to log back in until reactivated.`
            : `${statusTarget?.email} will be able to log in again.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        danger={statusTarget?.status === 'ACTIVE'}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleConfirmStatus}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user?"
        message={`This permanently deletes ${deleteTarget?.email}'s account, including their Nextcloud storage account and all their files. This can't be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  )
}
