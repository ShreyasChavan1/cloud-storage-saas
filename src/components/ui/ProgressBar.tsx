import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  colorClassName?: string
}

export function ProgressBar({ value, max, className, colorClassName }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-dark-surface2', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700 ease-out', colorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
