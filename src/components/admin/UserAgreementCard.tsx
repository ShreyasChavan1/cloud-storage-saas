import { FileSignature } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAdminUserAgreements } from '@/hooks/useAdminClientForms'

// Shows the acceptance evidence the Service Agreement asks DVT to retain:
// version, date/time, account email, event, and technical audit info.
export function UserAgreementCard({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useAdminUserAgreements(userId)

  return (
    <Card className="mt-5 p-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileSignature className="h-4 w-4" />
        Service Agreement acceptance
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-ink-400">Loading…</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-danger">Couldn't load acceptance records.</p>
      ) : data && data.length > 0 ? (
        <div className="mt-4 space-y-3">
          {data.map((a) => (
            <div key={a.id} className="rounded-xl border border-line p-3 text-sm dark:border-dark-border">
              <p className="font-medium">Version {a.version} · {a.event.toLowerCase()}</p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                {new Date(a.acceptedAt).toLocaleString()} · {a.email}
              </p>
              <p className="mt-0.5 break-all text-xs text-ink-400">
                IP {a.ipAddress ?? 'unknown'} · {a.userAgent ?? 'unknown device'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-400">
          No acceptance on record (account was created by an admin or before the agreement checkbox existed).
        </p>
      )}
    </Card>
  )
}
