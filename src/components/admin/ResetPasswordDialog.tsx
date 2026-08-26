import { useState, useEffect, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Copy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useResetUserPassword } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

interface ResetPasswordDialogProps {
  open: boolean
  userId: string
  userEmail: string
  onClose: () => void
}

export function ResetPasswordDialog({ open, userId, userEmail, onClose }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [generated, setGenerated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const resetPassword = useResetUserPassword()
  const { showToast } = useToast()

  useEffect(() => {
    if (open) {
      setPassword('')
      setGenerated(null)
      setCopied(false)
    }
  }, [open])

  if (!open) return null

  const handleClose = () => {
    // There's no way to see a generated password again after this closes
    // (the backend never stores or re-returns plaintext) — this isn't a
    // security prompt, just making sure that's not a surprise.
    if (generated && !copied && !window.confirm("You haven't copied this password yet. Close anyway?")) {
      return
    }
    onClose()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    resetPassword.mutate(
      { id: userId, password: password.trim() || undefined },
      {
        onSuccess: ({ temporaryPassword }) => {
          if (temporaryPassword) {
            setGenerated(temporaryPassword)
          } else {
            showToast(`Password updated for ${userEmail}`)
            onClose()
          }
        },
        onError: (err) => showToast(getErrorMessage(err), 'error'),
      }
    )
  }

  const handleCopy = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    showToast('Copied to clipboard')
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-soft dark:bg-dark-surface"
      >
        {generated ? (
          <>
            <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Password reset</h3>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              This is shown once. Relay it to <span className="font-medium">{userEmail}</span> yourself — the
              backend never stores or displays it again, and their existing sessions have been signed out.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface-50 px-3.5 py-2.5 font-mono text-sm dark:border-dark-border dark:bg-dark-surface2">
              <span className="flex-1 select-all">{generated}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface dark:hover:text-white"
                aria-label="Copy password"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Reset password</h3>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              For <span className="font-medium">{userEmail}</span>. Leave this blank to generate a random one, or
              set a specific password yourself. Either way, all of their active sessions will be signed out.
            </p>
            <div className="mt-4">
              <Input
                label="New password (optional)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                minLength={8}
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={resetPassword.isPending}>
                Reset password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
