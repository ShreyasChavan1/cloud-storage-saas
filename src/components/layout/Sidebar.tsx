import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Folder, Share2, Trash2, Star, Settings, Sparkles } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { storage } from '@/data/dummyData'
import { cn } from '@/lib/cn'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/files', label: 'Files', icon: Folder },
  { to: '/files?view=shared', label: 'Shared', icon: Share2 },
  { to: '/files?view=favorites', label: 'Favorites', icon: Star },
  { to: '/files?view=trash', label: 'Trash', icon: Trash2 },
]

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface-0 px-4 py-6 transition-transform duration-200 dark:border-dark-border dark:bg-dark-surface lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/files'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-ink-500 hover:bg-surface-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-dark-surface2 dark:hover:text-white'
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          <div className="my-3 h-px bg-line dark:bg-dark-border" />

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-surface-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-dark-surface2 dark:hover:text-white'
              )
            }
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
            Settings
          </NavLink>
        </nav>

        <div className="rounded-2xl border border-line bg-surface-50 p-4 dark:border-dark-border dark:bg-dark-surface2">
          <div className="flex items-center justify-between text-xs font-medium text-ink-500 dark:text-ink-400">
            <span>Storage</span>
            <span>
              {storage.usedGB}GB / {storage.totalGB}GB
            </span>
          </div>
          <ProgressBar value={storage.usedGB} max={storage.totalGB} className="mt-2" />
          <NavLink
            to="/pricing"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade plan
          </NavLink>
        </div>
      </aside>
    </>
  )
}
