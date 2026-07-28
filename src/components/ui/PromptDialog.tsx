import { useState, useEffect, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Input } from './Input'

interface PromptDialogProps {
  open: boolean
  title: string
  label: string
  initialValue?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: (value: string) => void
}

export function PromptDialog({
  open,
  title,
  label,
  initialValue = '',
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim()) onConfirm(value.trim())
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-soft dark:bg-dark-surface"
      >
        <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
        <div className="mt-4">
          <Input label={label} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{confirmLabel}</Button>
        </div>
      </form>
    </div>,
    document.body
  )
}
