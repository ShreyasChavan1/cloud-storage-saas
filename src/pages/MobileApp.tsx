import { useState } from 'react'
import { Smartphone, Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

// Nextcloud's own official client — Nimbus's storage backend is a real
// Nextcloud account under the hood (see backend/README.md), so the
// official app works against it as-is. No Nimbus-specific app needed.
const NEXTCLOUD_SERVER_URL = 'https://cloud.dv-technologies.in'
const IOS_APP_URL = 'https://apps.apple.com/app/nextcloud/id1125420102'
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.nextcloud.client'
const FDROID_APP_URL = 'https://f-droid.org/packages/com.nextcloud.client/'

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
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

export default function MobileApp() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900 dark:text-white">Mobile App</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Access your Nimbus files from your phone using the official Nextcloud app — your storage
          runs on Nextcloud under the hood, so the real Nextcloud app connects to it directly.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4" />
          1. Install the app
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href={IOS_APP_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-medium text-white hover:bg-accent-600">
            <ExternalLink className="h-4 w-4" />
            iOS (App Store)
          </a>
          <a href={ANDROID_APP_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 text-sm font-medium text-ink-900 hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:text-white">
            <ExternalLink className="h-4 w-4" />
            Android (Google Play)
          </a>
          <a href={FDROID_APP_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 text-sm font-medium text-ink-900 hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:text-white">
            <ExternalLink className="h-4 w-4" />
            Android (F-Droid)
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4" />
          2. Connect it to your account
        </div>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Open the app, choose "Log in to your server", and enter these three values exactly as shown.
        </p>
        <div className="mt-4 space-y-4">
          <CopyField label="Server address" value={NEXTCLOUD_SERVER_URL} />
          <CopyField label="Username" value={user?.id ?? ''} />
          <div>
            <div className="text-xs font-medium text-ink-500 dark:text-ink-400">Password</div>
            <p className="mt-1 rounded-lg border border-line bg-surface-50 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-surface2">
              Use your regular Nimbus account password — the one you log into this site with.
            </p>
          </div>
        </div>
      </Card>

      {/* <Card className="border-amber-300 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">This server address uses HTTP, not HTTPS.</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">
              Your login and files travel unencrypted between your phone and the server. The iOS
              app may refuse to connect at all over a plain HTTP address, and Android will show a
              security warning before letting you proceed. If you run into either of those, the
              server needs HTTPS enabled before mobile access will work reliably — this isn't
              something to fix from the phone side.
            </p>
          </div>
        </div>
      </Card> */}
    </div>
  )
}
