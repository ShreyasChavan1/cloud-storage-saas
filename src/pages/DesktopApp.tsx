import { Monitor, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { CopyField, PasswordNote, NEXTCLOUD_SERVER_URL } from '@/components/app/NextcloudConnect'

// Nextcloud's official desktop sync client — same reasoning as the Mobile
// App page: the storage backend is a real Nextcloud account, so the official
// client works against it directly. These all point at Nextcloud's official
// download page; swap in a direct installer URL per platform here if wanted.
const NEXTCLOUD_DOWNLOAD_PAGE = 'https://nextcloud.com/install/#install-clients'
const WINDOWS_APP_URL = NEXTCLOUD_DOWNLOAD_PAGE
const MAC_APP_URL = NEXTCLOUD_DOWNLOAD_PAGE
const LINUX_APP_URL = NEXTCLOUD_DOWNLOAD_PAGE

const primaryLink =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-medium text-white hover:bg-accent-600'
const secondaryLink =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 text-sm font-medium text-ink-900 hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:text-white'

export default function DesktopApp() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900 dark:text-white">Desktop App</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Access your files from your computer using the official Nextcloud desktop app — your storage
          runs on Nextcloud under the hood, so the real Nextcloud app connects to it directly and your
          files appear in a normal folder on your computer.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Monitor className="h-4 w-4" />
          1. Install the app
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href={WINDOWS_APP_URL} target="_blank" rel="noreferrer" className={primaryLink}>
            <ExternalLink className="h-4 w-4" />
            Windows
          </a>
          <a href={MAC_APP_URL} target="_blank" rel="noreferrer" className={secondaryLink}>
            <ExternalLink className="h-4 w-4" />
            macOS
          </a>
          <a href={LINUX_APP_URL} target="_blank" rel="noreferrer" className={secondaryLink}>
            <ExternalLink className="h-4 w-4" />
            Linux (AppImage)
          </a>
        </div>
        <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
          Requires Windows 10 or newer (64-bit) or macOS 12 or newer. On Linux, a password manager such as
          GNOME Keyring or KWallet must be running so the app can stay signed in.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Monitor className="h-4 w-4" />
          2. Connect it to your account
        </div>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Open the app, choose "Log in to your Nextcloud", and enter these values exactly as shown.
          If your browser opens for sign-in, use the same username and password there.
        </p>
        <div className="mt-4 space-y-4">
          <CopyField label="Server address" value={NEXTCLOUD_SERVER_URL} />
          <CopyField label="Username" value={user?.id ?? ''} />
          <PasswordNote />
        </div>
      </Card>
    </div>
  )
}
