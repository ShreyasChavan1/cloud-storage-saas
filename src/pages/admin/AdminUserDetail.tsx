import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  Ban,
  PlayCircle,
  Trash2,
  HardDrive,
  CreditCard,
  Radio,
  Files,
  AlertCircle,
  Monitor,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StorageRing } from '@/components/ui/StorageRing'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog'
import {
  useAdminUser,
  useAdminUserStorage,
  useAdminUserStorageBreakdown,
  useAdminUserPayments,
  useAdminUserSessions,
} from '@/hooks/useAdminUsers'
import { useSetUserStatus, useDeleteUser, useSetUserQuota, useRevokeSession } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { formatBytes } from '@/lib/formatBytes'

// Nextcloud writes a quota change immediately (confirmed: the agent's occ
// call is fully awaited before this backend ever reports success — see
// backend/README.md's Phase 10 section) but WebDAV can keep reporting the
// OLD value for a while afterward if the instance has a distributed cache
// (APCu/Redis) configured — that's Nextcloud's own caching, not something
// this app controls. Rather than let the UI silently look like nothing
// happened, this polls for the new value to actually land and says so
// while it waits.
const QUOTA_POLL_INTERVAL_MS = 3000
const QUOTA_POLL_TIMEOUT_MS = 60000
// Generous on purpose — Nextcloud's own GB interpretation (binary vs.
// decimal) can land a few MB off from this app's own 1024-based
// formatBytes, and that's a rounding difference, not a "didn't work" case.
const QUOTA_MATCH_TOLERANCE_BYTES = 64 * 1024 * 1024

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: user, isLoading, isError } = useAdminUser(userId)

  const [pendingQuota, setPendingQuota] = useState<{ targetTotalBytes: number; startedAt: number } | null>(null)
  const {
    data: quota,
    isLoading: quotaLoading,
    isError: quotaError,
    refetch: refetchQuota,
    isFetching: quotaFetching,
  } = useAdminUserStorage(userId, { refetchIntervalMs: pendingQuota ? QUOTA_POLL_INTERVAL_MS : undefined })

  const { data: breakdown } = useAdminUserStorageBreakdown(userId)
  const { data: payments } = useAdminUserPayments(userId)
  const { data: sessions } = useAdminUserSessions(userId)

  const setStatus = useSetUserStatus()
  const deleteUser = useDeleteUser()
  const setQuota = useSetUserQuota()
  const revokeSession = useRevokeSession(userId ?? '')

  const [resetOpen, setResetOpen] = useState(false)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [quotaPromptOpen, setQuotaPromptOpen] = useState(false)

  // Stops the poll once the fetched total lands on the target (within
  // tolerance) or QUOTA_POLL_TIMEOUT_MS passes — whichever comes first. A
  // timeout doesn't mean it failed (the occ write already succeeded), just
  // that Nextcloud's cache is taking longer than usual; the "Check again"
  // button below covers that case manually.
  useEffect(() => {
    if (!pendingQuota || !quota) return
    const knownTotal =
      typeof quota.available === 'number' ? quota.used + quota.available : undefined
    const matched = knownTotal !== undefined && Math.abs(knownTotal - pendingQuota.targetTotalBytes) < QUOTA_MATCH_TOLERANCE_BYTES
    const timedOut = Date.now() - pendingQuota.startedAt > QUOTA_POLL_TIMEOUT_MS
    if (matched || timedOut) setPendingQuota(null)
  }, [quota, pendingQuota])

  if (!userId) return null

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-10 text-center text-sm text-ink-400">Loading...</div>
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-5xl p-10 text-center text-sm text-danger">
        Couldn't load this user. They may have been deleted.
      </div>
    )
  }

  const usedBytes = quota?.used ?? 0
  const hasKnownLimit = typeof quota?.available === 'number'
  const totalBytes = hasKnownLimit ? usedBytes + (quota!.available as number) : undefined
  // Only used to pre-fill the quota prompt with a sensible starting point
  // — Nextcloud's own byte/GB rounding means this is an approximation of
  // what's actually configured, not a value this page treats as exact.
  const approxCurrentGb = totalBytes !== undefined ? Math.round(totalBytes / 1024 ** 3) : undefined

  const handleToggleStatus = () => {
    const next = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setStatus.mutate(
      { id: user.id, status: next },
      {
        onSuccess: () => {
          showToast(next === 'SUSPENDED' ? 'User suspended' : 'User reactivated')
          setStatusConfirmOpen(false)
        },
        onError: (err) => {
          showToast(getErrorMessage(err), 'error')
          setStatusConfirmOpen(false)
        },
      }
    )
  }

  const handleDelete = () => {
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        showToast(`Deleted ${user.email}`)
        navigate('/admin')
      },
      onError: (err) => {
        showToast(getErrorMessage(err), 'error')
        setDeleteConfirmOpen(false)
      },
    })
  }

  const handleSetQuota = (value: string) => {
    const gb = Number(value)
    if (!Number.isFinite(gb) || gb <= 0) {
      showToast('Enter a positive number of GB', 'error')
      return
    }
    const rounded = Math.round(gb)
    setQuota.mutate(
      { id: user.id, storageLimitGb: rounded },
      {
        onSuccess: () => {
          showToast(`Quota set to ${rounded} GB — Nextcloud can take a moment to catch up, see below`)
          setQuotaPromptOpen(false)
          // 1024-based to match formatBytes' own units — see the
          // QUOTA_MATCH_TOLERANCE_BYTES comment above for why this is
          // compared with tolerance, not exact equality.
          setPendingQuota({ targetTotalBytes: rounded * 1024 ** 3, startedAt: Date.now() })
        },
        onError: (err) => {
          showToast(getErrorMessage(err), 'error')
          setQuotaPromptOpen(false)
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to admin
      </Link>

      <Card className="mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar initials={user.avatarInitials} className="h-14 w-14 text-lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-ink-900 dark:text-white">{user.name}</h1>
                <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>{user.role}</Badge>
                <Badge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{user.email}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {user.plan ?? 'No plan'} · Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
              <KeyRound className="h-4 w-4" />
              Reset password
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setStatusConfirmOpen(true)}>
              {user.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <HardDrive className="h-4 w-4 text-ink-400" />
              Storage usage
            </h3>
            {!quotaLoading && totalBytes !== undefined && <StorageRing value={usedBytes} max={totalBytes} size={56} />}
          </div>

          {quotaError ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4" />
              Couldn't load storage usage.
            </div>
          ) : quotaLoading ? (
            <div className="mt-4 h-7 w-32 animate-pulse rounded bg-surface-100 dark:bg-dark-surface2" />
          ) : (
            <>
              <p className="mt-4 font-display text-2xl font-bold">
                {formatBytes(usedBytes)}
                {totalBytes !== undefined && (
                  <span className="text-base font-medium text-ink-400"> / {formatBytes(totalBytes)}</span>
                )}
              </p>
              {totalBytes !== undefined && <ProgressBar value={usedBytes} max={totalBytes} className="mt-3" />}
              {breakdown && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
                  <Files className="h-3.5 w-3.5" />
                  {breakdown.totalFiles.toLocaleString()} file{breakdown.totalFiles === 1 ? '' : 's'} in{' '}
                  {breakdown.totalFolders.toLocaleString()} folder{breakdown.totalFolders === 1 ? '' : 's'}
                </p>
              )}
              {pendingQuota && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Waiting for Nextcloud to reflect the new quota — this can take a minute, not something wrong on
                  this side.
                </p>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setQuotaPromptOpen(true)}>
              Adjust quota
            </Button>
            {/* Manual fallback: useful once the 60s auto-poll above gives
                up, or any time an admin just wants to double-check without
                waiting on the interval. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchQuota()}
              loading={quotaFetching && !pendingQuota}
              aria-label="Check storage usage again"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check again
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="h-4 w-4 text-ink-400" />
            Payments
          </h3>
          {payments && payments.length > 0 ? (
            <div className="mt-4 flex flex-col divide-y divide-line dark:divide-dark-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0">
                  <div>
                    <p className="font-medium text-ink-900 dark:text-white">
                      ${p.amount} · {p.provider}
                    </p>
                    <p className="text-xs text-ink-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge
                    tone={
                      p.status === 'SUCCEEDED' ? 'success' : p.status === 'FAILED' ? 'danger' : 'warning'
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center text-center">
              <CreditCard className="mb-2 h-6 w-6 text-ink-300" />
              <p className="text-sm text-ink-400">
                No payment history. No payment gateway is integrated yet, so this is always empty for now.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Radio className="h-4 w-4 text-ink-400" />
          Active sessions
        </h3>
        {sessions && sessions.length > 0 ? (
          <div className="mt-4 flex flex-col divide-y divide-line dark:divide-dark-border">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Monitor className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-900 dark:text-white">
                      {s.userAgent ?? 'Unknown device'}
                    </p>
                    <p className="text-xs text-ink-400">
                      {s.ipAddress ?? 'Unknown IP'} · signed in {new Date(s.createdAt).toLocaleString()} · expires{' '}
                      {new Date(s.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    revokeSession.mutate(s.id, {
                      onSuccess: () => showToast('Session revoked'),
                      onError: (err) => showToast(getErrorMessage(err), 'error'),
                    })
                  }
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">No active sessions.</p>
        )}
      </Card>

      <ResetPasswordDialog open={resetOpen} userId={user.id} userEmail={user.email} onClose={() => setResetOpen(false)} />

      <ConfirmDialog
        open={statusConfirmOpen}
        title={user.status === 'ACTIVE' ? 'Suspend user?' : 'Reactivate user?'}
        message={
          user.status === 'ACTIVE'
            ? `${user.email} will be signed out everywhere and unable to log back in until reactivated.`
            : `${user.email} will be able to log in again.`
        }
        confirmLabel={user.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        danger={user.status === 'ACTIVE'}
        onCancel={() => setStatusConfirmOpen(false)}
        onConfirm={handleToggleStatus}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete user?"
        message={`This permanently deletes ${user.email}'s account, including their Nextcloud storage account and all their files. This can't be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <PromptDialog
        open={quotaPromptOpen}
        title="Adjust storage quota"
        label="New quota (GB)"
        initialValue={approxCurrentGb !== undefined ? String(approxCurrentGb) : ''}
        confirmLabel="Update quota"
        onCancel={() => setQuotaPromptOpen(false)}
        onConfirm={handleSetQuota}
      />
    </div>
  )
}
