import { Link } from 'react-router-dom'
import { FolderSearch } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-6 text-center dark:bg-dark-bg">
      <Logo className="mb-10" />
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30">
        <FolderSearch className="h-9 w-9 text-brand-500" strokeWidth={1.75} />
      </div>
      <h1 className="mt-6 font-display text-6xl font-bold text-ink-900 dark:text-white">404</h1>
      <p className="mt-2 text-lg font-medium text-ink-700 dark:text-ink-300">This file doesn't exist</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">
        The page you're looking for may have been moved, renamed, or deleted.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  )
}
