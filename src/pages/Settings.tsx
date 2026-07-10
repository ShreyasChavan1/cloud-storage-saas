import { useState } from 'react'
import { User, Lock, Palette, CreditCard, Bell } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
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
  const [active, setActive] = useState('profile')
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

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
                  <Button variant="secondary" size="sm">Change photo</Button>
                  <p className="mt-1.5 text-xs text-ink-400">JPG or PNG, up to 2MB.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="mt-6">Save changes</Button>
            </Card>
          )}

          {active === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Security</h2>
              <div className="mt-5 flex flex-col gap-4 max-w-sm">
                <Input label="Current password" type="password" placeholder="••••••••" />
                <Input label="New password" type="password" placeholder="At least 8 characters" />
                <Input label="Confirm new password" type="password" placeholder="Repeat new password" />
              </div>
              <Button className="mt-6">Update password</Button>

              <div className="mt-8 flex items-center justify-between border-t border-line pt-6 dark:border-dark-border">
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">Two-factor authentication</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">Add an extra layer of security to your account.</p>
                </div>
                <Button variant="secondary" size="sm">Enable</Button>
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
                  <p className="font-medium text-brand-700 dark:text-brand-300">Pro plan</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">$12/mo · 100GB storage · Renews Aug 8, 2026</p>
                </div>
                <Button size="sm">Manage plan</Button>
              </div>
              <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
                Payment method: Visa ending in 4242.
              </p>
            </Card>
          )}

          {active === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <div className="mt-5 flex flex-col divide-y divide-line dark:divide-dark-border">
                {['File shared with me', 'Comments on my files', 'Storage almost full', 'Product updates'].map((label) => (
                  <label key={label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-500" />
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
