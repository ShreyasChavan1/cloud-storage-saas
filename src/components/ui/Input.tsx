import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, error, type, id, ...props }, ref) => {
    const [show, setShow] = useState(false)
    const isPassword = type === 'password'
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-700 dark:text-ink-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (show ? 'text' : 'password') : type}
            className={cn(
              'h-11 w-full rounded-xl border border-line bg-surface-0 px-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors',
              'focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
              'dark:bg-dark-surface2 dark:border-dark-border dark:text-white dark:focus:ring-brand-900/40',
              icon && 'pl-10',
              isPassword && 'pr-10',
              error && 'border-danger focus:border-danger focus:ring-red-100',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-ink-300"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
