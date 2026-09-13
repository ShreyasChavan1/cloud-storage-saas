import { useState, useEffect, useRef } from 'react'
import { User, Lock, Palette, CreditCard, Bell, Video, Copy, Download, Monitor, Terminal, RefreshCw } from 'lucide-react'
import { cctvApi, CctvDevice } from '@/api/cctv'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { cn } from '@/lib/cn'
import { paymentsApi } from '@/api/payments'
import { userApi } from '@/api/user'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'cctv', label: 'CCTV', icon: Video },
]

export default function Settings() {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [active, setActive] = useState('profile')
  const [canceling, setCanceling] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [notifications, setNotifications] = useState({ fileShared: true, comments: true, storageAlmostFull: true, productUpdates: true })
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [cctvDevices, setCctvDevices] = useState<CctvDevice[]>([])
  const [cctvLoading, setCctvLoading] = useState(false)
  const [cctvName, setCctvName] = useState('')
  const [newCctvEnrollment, setNewCctvEnrollment] = useState<{ id: string; name: string; code: string } | null>(null)
  const [editingCctvId, setEditingCctvId] = useState<string | null>(null)
  const [copiedEnrollment, setCopiedEnrollment] = useState(false)
  const [cctvConfig, setCctvConfig] = useState({ nvrHost: '', nvrUsername: '', nvrPassword: '', segmentSeconds: 300, uploadPollSeconds: 15 })
  const [cctvCameras, setCctvCameras] = useState([{ name: 'Camera 01', rtspUrl: '', enabled: true }])

  const { data: profile, isLoading: profileLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  useEffect(() => {
    if (active === 'cctv') cctvApi.list().then(setCctvDevices).catch(() => showToast('Could not load CCTV devices.', 'error'))
    if (active === 'notifications') userApi.getNotifications().then(setNotifications).catch(() => showToast('Could not load notification preferences.', 'error'))
  }, [active])

  const [name, setName] = useState('')
  useEffect(() => {
    if (profile) setName(profile.name)
  }, [profile])

  const handleSaveProfile = () => {
    updateProfile.mutate(name, {
      onSuccess: () => showToast('Profile updated.'),
      onError: (err) => showToast(getErrorMessage(err, 'Could not update profile.'), 'error'),
    })
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
      <p className="mt-1 text-ink-500 dark:text-ink-400">Manage your account, security and preferences.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active === tab.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-surface-100 dark:text-ink-400 dark:hover:bg-dark-surface2'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div>
          {active === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="mt-5 flex items-center gap-4">
                <Avatar initials={user?.avatarInitials ?? 'NB'} avatarUrl={user?.avatarUrl} className="h-16 w-16 text-lg" />
                <div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    setAvatarSaving(true); try { const refreshed = await userApi.uploadAvatar(file); setUser(refreshed); showToast('Profile photo updated.') } catch (err) { showToast(getErrorMessage(err, 'Could not update profile photo.'), 'error') } finally { setAvatarSaving(false); e.target.value = '' }
                  }} />
                  <Button variant="secondary" size="sm" loading={avatarSaving} onClick={() => fileInputRef.current?.click()}>Change photo</Button>
                  {user?.avatarUrl && <Button variant="ghost" size="sm" onClick={async () => { try { const refreshed = await userApi.removeAvatar(); setUser(refreshed); showToast('Profile photo removed.') } catch (err) { showToast(getErrorMessage(err, 'Could not remove profile photo.'), 'error') } }}>Remove</Button>}
                  <p className="mt-1.5 text-xs text-ink-400">PNG, JPG, WEBP or GIF up to 2 MB.</p>
                </div>
              </div>
              {profileLoading ? (
                <div className="mt-6 h-20 animate-pulse rounded-xl bg-surface-100 dark:bg-dark-surface2" />
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="Email" type="email" value={profile?.email ?? ''} disabled title="Email changes aren't supported yet" />
                </div>
              )}
              <Button className="mt-6" loading={updateProfile.isPending} onClick={handleSaveProfile}>
                Save changes
              </Button>
            </Card>
          )}

          {active === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Update your Nimbus password. Your storage account password is updated at the same time.</p>
              <div className="mt-5 flex flex-col gap-4 max-w-sm">
                <Input label="Current password" type="password" placeholder="••••••••" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
                <Input label="New password" type="password" placeholder="At least 8 characters" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
                <Input label="Confirm new password" type="password" placeholder="Repeat new password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button className="mt-6" loading={passwordSaving} onClick={async () => {
                if (passwords.next.length < 8) return showToast('New password must be at least 8 characters.', 'error')
                if (passwords.next !== passwords.confirm) return showToast('Passwords do not match.', 'error')
                setPasswordSaving(true); try { await userApi.changePassword(passwords.current, passwords.next); setPasswords({ current: '', next: '', confirm: '' }); showToast('Password updated. Please sign in again.') } catch (err) { showToast(getErrorMessage(err, 'Could not update password.'), 'error') } finally { setPasswordSaving(false) }
              }}>Update password</Button>

              <div className="mt-7 rounded-xl border border-line p-4 dark:border-dark-border">
                <p className="font-medium text-ink-900 dark:text-white">Storage connection</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">If your password changed outside Nimbus and your files stop loading, refresh the dedicated Nextcloud WebDAV credential without changing your login password.</p>
                <Button variant="secondary" size="sm" className="mt-3" disabled={!passwords.current || passwordSaving} onClick={async () => {
                  setPasswordSaving(true); try { await userApi.repairWebdav(passwords.current); showToast('Storage connection repaired.'); setPasswords(p => ({ ...p, current: '' })) } catch (err) { showToast(getErrorMessage(err, 'Could not repair the storage connection.'), 'error') } finally { setPasswordSaving(false) }
                }}>Repair storage connection</Button>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-line pt-6 dark:border-dark-border">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">Two-factor authentication</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">Not available yet.</p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Enable
                </Button>
              </div>
            </Card>
          )}

          {active === 'appearance' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-line p-4 dark:border-dark-border">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">Dark mode</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">Switch between light and dark themes.</p>
                </div>
                <ThemeToggle />
              </div>
            </Card>
          )}

          {active === 'billing' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Billing</h2>
              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-brand-50 p-4 dark:bg-brand-900/20">
                <div>
                  <p className="font-medium text-brand-700 dark:text-brand-300">{user?.plan ?? 'Free'} plan</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{user?.plan && user.plan.toLowerCase() !== 'free' ? 'Autopay subscription and storage entitlement.' : 'Your current free plan.'}</p>
                </div>
                {user?.plan && user.plan.toLowerCase() !== 'free' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={canceling}
                    onClick={async () => {
                      if (!window.confirm('Cancel autopay at the end of your current billing period?')) return
                      setCanceling(true)
                      try {
                        await paymentsApi.cancelSubscription(true)
                        const refreshed = await userApi.getProfile()
                        setUser(refreshed)
                        showToast('Autopay cancellation scheduled for the end of your billing period.')
                      } catch (err) {
                        showToast(getErrorMessage(err, 'Could not schedule subscription cancellation.'), 'error')
                      } finally {
                        setCanceling(false)
                      }
                    }}
                  >
                    Cancel at period end
                  </Button>
                )}
              </div>
              <div className="mt-5 rounded-xl border border-line p-4 dark:border-dark-border">
                <p className="font-medium text-ink-900 dark:text-white">Recurring billing</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Your payment is handled securely by Razorpay. Future charges are processed automatically according to the plan you authorized.</p>
              </div>
              <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">Detailed payment history will be added to this section later.</p>
            </Card>
          )}

          {active === 'cctv' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">CCTV / NVR cloud backup</h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Connect an NVR on your local network. Nimbus stores completed camera recordings in your cloud storage automatically. The gateway makes the outbound connection, so your camera or NVR does not need to be exposed to the internet.</p>

              <div className="mt-5 rounded-xl border border-line bg-surface-50 p-4 dark:border-dark-border dark:bg-dark-surface2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Monitor className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Install the Nimbus NVR Gateway</p>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Install it on a Windows PC or Linux server that can reach your NVR on the local network. Docker is not required.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href="/nvr-gateway/nimbus-nvr-gateway-windows.zip" download className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-medium text-white hover:bg-accent-600"><Download className="h-4 w-4" />Windows installer</a>
                      <a href="/nvr-gateway/nimbus-nvr-gateway-linux.zip" download className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-0 px-3 text-sm font-medium text-ink-900 hover:bg-surface-50 dark:border-dark-border dark:bg-dark-surface dark:text-white"><Download className="h-4 w-4" />Linux installer</a>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-surface-0 p-3 dark:border-dark-border dark:bg-dark-surface"><div className="flex items-center gap-2 text-sm font-medium"><Terminal className="h-4 w-4" />Windows</div><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Run <code>install.ps1</code> as Administrator. The installer registers the gateway to start automatically with Windows.</p></div>
                  <div className="rounded-lg border border-line bg-surface-0 p-3 dark:border-dark-border dark:bg-dark-surface"><div className="flex items-center gap-2 text-sm font-medium"><Terminal className="h-4 w-4" />Linux</div><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Run <code>sudo ./install.sh</code>. The installer registers a systemd service and starts it automatically.</p></div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-line p-4 dark:border-dark-border">
                <p className="font-medium">1. Create and enroll a gateway</p>
                <div className="mt-3 flex gap-2 max-w-lg">
                  <Input label="Gateway / NVR name" value={cctvName} onChange={e => setCctvName(e.target.value)} placeholder="Office NVR" />
                  <Button className="mt-7" loading={cctvLoading} disabled={!cctvName.trim()} onClick={async () => { setCctvLoading(true); try { const d = await cctvApi.create(cctvName.trim()); setCctvDevices(x => [d, ...x]); setNewCctvEnrollment({ id: d.id, name: d.name, code: d.enrollmentCode }); setCctvName(''); showToast('Gateway created. Use the one-time enrollment code during gateway installation.') } catch (err) { showToast(getErrorMessage(err, 'Could not create CCTV gateway.'), 'error') } finally { setCctvLoading(false) } }}>Create</Button>
                </div>
                {newCctvEnrollment && (
                  <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-900/40 dark:bg-accent-900/10">
                    <p className="font-medium">One-time gateway enrollment code</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="font-mono text-lg tracking-wider">{newCctvEnrollment.code}</p>
                      <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard?.writeText(newCctvEnrollment.code); setCopiedEnrollment(true); window.setTimeout(() => setCopiedEnrollment(false), 1800) }}><Copy className="h-3.5 w-3.5" />{copiedEnrollment ? 'Copied' : 'Copy code'}</Button>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">Expires in 24 hours and can only be used once. Install the gateway on a machine that can reach this NVR, then enter the code in the installer. The permanent gateway token is stored locally by the gateway and is never shown in Nimbus.</p>
                  </div>
                )}
              </div>

              {(newCctvEnrollment || editingCctvId) && (
                <div className="mt-5 rounded-xl border border-line p-4 dark:border-dark-border">
                  <p className="font-medium">2. Configure the NVR</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input label="NVR IP / hostname" value={cctvConfig.nvrHost} onChange={e => setCctvConfig(x => ({ ...x, nvrHost: e.target.value }))} placeholder="192.168.1.100" />
                    <Input label="NVR username" value={cctvConfig.nvrUsername} onChange={e => setCctvConfig(x => ({ ...x, nvrUsername: e.target.value }))} placeholder="admin" />
                    <Input label="NVR password" type="password" value={cctvConfig.nvrPassword} onChange={e => setCctvConfig(x => ({ ...x, nvrPassword: e.target.value }))} placeholder="NVR password" />
                    <Input label="Recording interval (seconds)" type="number" min={30} max={3600} value={cctvConfig.segmentSeconds} onChange={e => setCctvConfig(x => ({ ...x, segmentSeconds: Number(e.target.value) }))} />
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium">NVR camera channels</p><Button size="sm" variant="secondary" onClick={() => setCctvCameras(x => [...x, { name: `Camera ${String(x.length + 1).padStart(2, '0')}`, rtspUrl: '', enabled: true }])}>Add camera</Button></div>
                    {cctvCameras.map((camera, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                        <Input label={i === 0 ? 'Camera name' : undefined} value={camera.name} onChange={e => setCctvCameras(x => x.map((c, j) => j === i ? { ...c, name: e.target.value } : c))} />
                        <Input label={i === 0 ? 'RTSP channel URL' : undefined} value={camera.rtspUrl} onChange={e => setCctvCameras(x => x.map((c, j) => j === i ? { ...c, rtspUrl: e.target.value } : c))} placeholder="rtsp://NVR/channel-url" />
                        <Button variant="danger" size="sm" className="mt-1 sm:mt-7" disabled={cctvCameras.length === 1} onClick={() => setCctvCameras(x => x.filter((_, j) => j !== i))}>Remove</Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button loading={cctvLoading} onClick={async () => { setCctvLoading(true); try { await cctvApi.configure(newCctvEnrollment?.id ?? editingCctvId!, { ...cctvConfig, cameras: cctvCameras }); setCctvDevices(x => x.map(d => d.id === (newCctvEnrollment?.id ?? editingCctvId) ? { ...d, status: 'ACTIVE', nvrHost: cctvConfig.nvrHost, camerasConfigured: cctvCameras.length, segmentSeconds: cctvConfig.segmentSeconds } : d)); showToast('NVR configuration saved. The gateway will pick it up automatically.') } catch (err) { showToast(getErrorMessage(err, 'Could not save NVR configuration.'), 'error') } finally { setCctvLoading(false) } }}>Save NVR configuration</Button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {cctvDevices.map(d => (
                  <div key={d.id} className="rounded-xl border border-line p-4 dark:border-dark-border">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{d.name}</p><p className="text-xs text-ink-500">{d.status !== 'ACTIVE' ? '● Waiting for gateway enrollment' : d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 120000 ? '● Gateway online' : '● Gateway offline'} · {d.camerasConfigured ?? 0} camera(s) · {d.lastUploadAt ? `last upload ${new Date(d.lastUploadAt).toLocaleString()}` : 'no uploads yet'}</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => { setEditingCctvId(d.id); setNewCctvEnrollment(null); setCctvConfig({ nvrHost: d.nvrHost ?? '', nvrUsername: d.nvrUsername ?? '', nvrPassword: '', segmentSeconds: d.segmentSeconds ?? 300, uploadPollSeconds: d.uploadPollSeconds ?? 15 }); setCctvCameras([{ name: 'Camera 01', rtspUrl: '', enabled: true }]) }}><RefreshCw className="h-3.5 w-3.5" />{d.status === 'ACTIVE' ? 'Reconfigure' : 'Configure'}</Button><Button variant="danger" size="sm" onClick={async () => { if (!window.confirm(`Remove ${d.name}?`)) return; try { await cctvApi.remove(d.id); setCctvDevices(x => x.filter(i => i.id !== d.id)); if (newCctvEnrollment?.id === d.id) setNewCctvEnrollment(null); if (editingCctvId === d.id) setEditingCctvId(null); showToast('CCTV gateway removed.') } catch (err) { showToast(getErrorMessage(err, 'Could not remove CCTV gateway.'), 'error') } }}>Remove</Button></div></div>
                  </div>
                ))}
                {!cctvDevices.length && <p className="text-sm text-ink-500">No CCTV gateways configured.</p>}
              </div>
            </Card>
          )}

          {active === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose which account notifications Nimbus may send you.</p>
              <div className="mt-5 flex flex-col divide-y divide-line dark:divide-dark-border">
                {([['fileShared','File shared with me'], ['comments','Comments on my files'], ['storageAlmostFull','Storage almost full'], ['productUpdates','Product updates']] as const).map(([key,label]) => (
                  <label key={key} className="flex items-center justify-between py-3 cursor-pointer">
                    <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
                    <input type="checkbox" checked={notifications[key]} onChange={async e => { const next = { ...notifications, [key]: e.target.checked }; setNotifications(next); setNotificationsLoading(true); try { await userApi.updateNotifications(next); showToast('Notification preferences saved.') } catch (err) { setNotifications(notifications); showToast(getErrorMessage(err, 'Could not save notification preferences.'), 'error') } finally { setNotificationsLoading(false) } }} disabled={notificationsLoading} className="h-4 w-4 rounded border-line text-brand-500" />
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
