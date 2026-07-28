import { useState, useEffect } from 'react'
import { User, Lock, Palette, CreditCard, Bell } from 'lucide-react'
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

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function Settings() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [active, setActive] = useState('profile')

  const { data: profile, isLoading: profileLoading } = useProfile()
  const updateProfile = useUpdateProfile()

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
                <Avatar initials={user?.avatarInitials ?? 'NB'} className="h-16 w-16 text-lg" />
                <div>
                  <Button variant="secondary" size="sm" disabled>
                    Change photo
                  </Button>
                  <p className="mt-1.5 text-xs text-ink-400">Avatar photos aren't supported yet — initials only.</p>
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
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Changing your password from here isn't available yet — use "Forgot password" from the login screen in the meantime.
              </p>
              <div className="mt-5 flex flex-col gap-4 max-w-sm opacity-50">
                <Input label="Current password" type="password" placeholder="••••••••" disabled />
                <Input label="New password" type="password" placeholder="At least 8 characters" disabled />
                <Input label="Confirm new password" type="password" placeholder="Repeat new password" disabled />
              </div>
              <Button className="mt-6" disabled>
                Update password
              </Button>

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
              <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-50 p-4 dark:bg-brand-900/20">
                <div>
                  <p className="font-medium text-brand-700 dark:text-brand-300">{user?.plan ?? 'Free'} plan</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">Your current plan.</p>
                </div>
                <Button size="sm" disabled title="Plan changes aren't available yet">
                  Manage plan
                </Button>
              </div>
              <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">Payment history and methods aren't available yet.</p>
            </Card>
          )}

          {active === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Notification preferences aren't available yet.</p>
              <div className="mt-5 flex flex-col divide-y divide-line opacity-50 dark:divide-dark-border">
                {['File shared with me', 'Comments on my files', 'Storage almost full', 'Product updates'].map((label) => (
                  <label key={label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
                    <input type="checkbox" disabled className="h-4 w-4 rounded border-line text-brand-500" />
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
