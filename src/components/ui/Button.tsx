import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-lift disabled:bg-brand-300',
  secondary:
    'bg-surface-0 dark:bg-dark-surface2 text-ink-900 dark:text-white border border-line dark:border-dark-border hover:bg-surface-50 dark:hover:bg-dark-surface',
  ghost:
    'bg-transparent text-ink-700 dark:text-ink-300 hover:bg-surface-100 dark:hover:bg-dark-surface2',
  danger:
    'bg-danger text-white hover:bg-red-600',
}

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
