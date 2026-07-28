import { createPortal } from 'react-dom'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-soft dark:bg-dark-surface">
        <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
