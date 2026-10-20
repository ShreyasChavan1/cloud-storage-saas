import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Shared by the Mobile App and Desktop App pages so the server address and
// the sign-in password wording are defined once. DVT Solutions' storage backend is
// a real Nextcloud account under the hood, so the official Nextcloud clients
// connect to it as-is.
export const NEXTCLOUD_SERVER_URL = 'https://cloud.dv-technologies.in'

export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className={`flex-1 truncate rounded-lg border border-line bg-surface-50 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-surface2 ${mono ? 'font-mono' : ''}`}>
          {value}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard?.writeText(value)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export function PasswordNote() {
  return (
    <div>
      <div className="text-xs font-medium text-ink-500 dark:text-ink-400">Password</div>
      <p className="mt-1 rounded-lg border border-line bg-surface-50 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-surface2">
        Use your regular DVT account password — the one you log into this site with.
      </p>
    </div>
  )
}
