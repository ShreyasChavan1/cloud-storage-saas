import { useState, useEffect, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Dices } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAdminPlans } from '@/hooks/useAdminUsers'
import { useCreateUser } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

interface CreateUserDialogProps {
  open: boolean
  onClose: () => void
}

const initialForm: { name: string; email: string; password: string; role: 'USER' | 'ADMIN'; planId: string } = {
  name: '',
  email: '',
  password: '',
  role: 'USER',
  planId: '',
}

function randomPassword() {
  // Client-side convenience only — same character space as the backend's
  // own generateRandomToken, just generated here so the admin can see and
  // edit it before submitting rather than only finding out afterward.
  return Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 14)
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const [form, setForm] = useState(initialForm)
  const { data: plans } = useAdminPlans()
  const createUser = useCreateUser()
  const { showToast } = useToast()

  useEffect(() => {
    if (open) setForm(initialForm)
  }, [open])

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createUser.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        planId: form.planId || undefined,
      },
      {
        onSuccess: (user) => {
          showToast(`Created ${user.email}`)
          onClose()
        },
        onError: (err) => showToast(getErrorMessage(err), 'error'),
      }
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-surface-0 p-6 shadow-soft dark:bg-dark-surface"
      >
        <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Create user</h3>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Provisions a Postgres account and a matching Nextcloud account, exactly like self-registration.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Initial password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}
                aria-label="Generate a random password"
              >
                <Dices className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-ink-400">At least 8 characters. Share this with the user yourself.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700 dark:text-ink-300">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))}
                className="h-11 rounded-xl border border-line bg-surface-0 px-3.5 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white dark:focus:ring-brand-900/40"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700 dark:text-ink-300">Plan</label>
              <select
                value={form.planId}
                onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                className="h-11 rounded-xl border border-line bg-surface-0 px-3.5 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-dark-border dark:bg-dark-surface2 dark:text-white dark:focus:ring-brand-900/40"
              >
                <option value="">Default</option>
                {plans?.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.storageLimitGb}GB)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createUser.isPending}>
            Create user
          </Button>
        </div>
      </form>
    </div>,
    document.body
  )
}
