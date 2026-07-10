import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card-surface rounded-2xl shadow-softer dark:shadow-soft-dark',
        className
      )}
      {...props}
    />
  )
}
