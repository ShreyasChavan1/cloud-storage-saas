import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in.">
      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-50 p-6 text-center dark:border-dark-border dark:bg-dark-surface2">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="font-medium text-ink-900 dark:text-white">Check your inbox</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            We sent a reset link to <span className="font-medium">{email}</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to log in
      </Link>
    </AuthLayout>
  )
}
