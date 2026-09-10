import { cn } from '@/lib/cn'
export function Avatar({ initials, avatarUrl, className }: { initials: string; avatarUrl?: string | null; className?: string }) {
  if (avatarUrl) return <img src={avatarUrl} alt="Profile" className={cn('h-9 w-9 shrink-0 rounded-full object-cover', className)} />
  return <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white', className)}>{initials}</div>
}
