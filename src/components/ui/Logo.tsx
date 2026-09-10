import { cn } from '@/lib/cn'

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={iconOnly ? '/dalvi-vaultgrid-icon.png' : '/dalvi-vaultgrid-logo.png'}
        alt={iconOnly ? 'Dalvi VaultGrid Technologies' : 'Dalvi VaultGrid Technologies'}
        className={cn(
          'block object-contain object-left',
          iconOnly ? 'h-10 w-10' : 'h-24 w-24 sm:h-28 sm:w-28'
        )}
      />
    </div>
  )
}
