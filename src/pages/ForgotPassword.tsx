import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError('')
    setLoading(true)
    try {
      // The backend always returns the same generic response whether or
      // not the email is registered — that's intentional (prevents
      // enumerating accounts), not a bug to work around here.
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in.">
      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-50 p-6 text-center dark:border-dark-border dark:bg-dark-surface2">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="font-medium text-ink-900 dark:text-white">Check your inbox</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            If an account exists for <span className="font-medium">{email}</span>, we've sent a reset link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        <ArrowLeft className="h-4 w-4" />
        Back to log in
      </Link>
    </AuthLayout>
  )
}
