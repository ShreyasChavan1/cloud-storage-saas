import { cn } from '@/lib/cn'

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
        <rect width="64" height="64" rx="16" className="fill-brand-500" />
        <path
          d="M20 40a8 8 0 0 1 1.2-15.9A11 11 0 0 1 42.5 26.6 8.5 8.5 0 0 1 41 40H20z"
          fill="white"
        />
      </svg>
      {!iconOnly && (
        <span className="font-display text-lg font-bold tracking-tight text-ink-900 dark:text-white">
          Nimbus
        </span>
      )}
    </div>
  )
}
