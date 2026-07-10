import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative flex h-9 w-16 items-center rounded-full bg-surface-100 px-1 transition-colors dark:bg-dark-surface2"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-0 shadow-softer transition-transform duration-300 dark:bg-dark-surface"
        style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0)' }}
      >
        {isDark ? <Moon className="h-3.5 w-3.5 text-brand-400" /> : <Sun className="h-3.5 w-3.5 text-warning" />}
      </span>
    </button>
  )
}
