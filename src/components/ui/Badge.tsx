import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
}

const tones = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  success: 'bg-green-50 text-success dark:bg-green-900/20',
  warning: 'bg-amber-50 text-warning dark:bg-amber-900/20',
  danger: 'bg-red-50 text-danger dark:bg-red-900/20',
  neutral: 'bg-surface-100 text-ink-500 dark:bg-dark-surface2 dark:text-ink-300',
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
