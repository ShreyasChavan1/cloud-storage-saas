import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface ToastContextValue {
  showToast: (message: string, tone?: Toast['tone']) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = nextId++
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-soft animate-fade-up',
                toast.tone === 'success'
                  ? 'border-green-100 bg-surface-0 text-ink-900 dark:border-green-900/40 dark:bg-dark-surface dark:text-white'
                  : 'border-red-100 bg-surface-0 text-ink-900 dark:border-red-900/40 dark:bg-dark-surface dark:text-white'
              )}
            >
              {toast.tone === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-danger" />
              )}
              {toast.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
