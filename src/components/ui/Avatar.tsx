import { cn } from '@/lib/cn'

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white',
        className
      )}
    >
      {initials}
    </div>
  )
}
