import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Menu, LogOut, Settings as SettingsIcon, User } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { useAuth } from '@/context/AuthContext'

const notifications = [
  { id: 1, text: 'Rohan shared "Brand Guidelines.pdf" with you', time: '5h ago' },
  { id: 2, text: 'Your Pro plan renews in 3 days', time: '1d ago' },
  { id: 3, text: 'Priya commented on Q3 Roadmap.pdf', time: '1d ago' },
]

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface-0/80 px-4 backdrop-blur-md dark:border-dark-border dark:bg-dark-surface/80 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-500 hover:bg-surface-100 dark:hover:bg-dark-surface2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder="Search files and folders..."
          className="h-10 w-full rounded-xl border border-line bg-surface-50 pl-10 pr-3 text-sm outline-none transition-colors focus:border-brand-500 focus:bg-surface-0 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:focus:ring-brand-900/40"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-lg p-2 text-ink-500 hover:bg-surface-100 dark:text-ink-400 dark:hover:bg-dark-surface2"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-0 dark:ring-dark-surface" />
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface-0 shadow-soft animate-fade-up dark:border-dark-border dark:bg-dark-surface2">
                <div className="border-b border-line px-4 py-3 text-sm font-semibold dark:border-dark-border">
                  Notifications
                </div>
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="border-b border-line px-4 py-3 last:border-0 hover:bg-surface-50 dark:border-dark-border dark:hover:bg-dark-surface"
                    >
                      <p className="text-sm text-ink-900 dark:text-white">{n.text}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DropdownMenu
          align="end"
          trigger={
            <button className="rounded-full">
              <Avatar initials={user?.avatarInitials ?? 'NB'} />
            </button>
          }
          items={[
            { label: 'Profile', icon: <User className="h-4 w-4" />, onSelect: () => navigate('/settings') },
            { label: 'Settings', icon: <SettingsIcon className="h-4 w-4" />, onSelect: () => navigate('/settings') },
            {
              label: 'Log out',
              icon: <LogOut className="h-4 w-4" />,
              tone: 'danger',
              onSelect: () => {
                logout()
                navigate('/login')
              },
            },
          ]}
        />
      </div>
    </header>
  )
}
