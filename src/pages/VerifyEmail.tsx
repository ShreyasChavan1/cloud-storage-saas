import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, MailCheck, RefreshCw } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/api/auth'
import { setAccessToken } from '@/lib/api'
import { AxiosError } from 'axios'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const email = params.get('email') ?? ''
  const [status, setStatus] = useState<'verifying' | 'success' | 'waiting' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email address...')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('waiting')
      setMessage('Check your inbox for the verification email sent by Nimbus.')
      return
    }

    authApi.verifyEmail(token)
      .then(({ accessToken, user }) => {
        setAccessToken(accessToken)
        setStatus('success')
        setMessage(`Email verified for ${user.email}.`)
        setTimeout(() => navigate('/dashboard', { replace: true }), 900)
      })
      .catch((err) => {
        const text = err instanceof AxiosError ? err.response?.data?.error?.message : undefined
        setStatus('error')
        setMessage(text ?? 'This verification link is invalid or has expired.')
      })
  }, [token, navigate])

  const resend = async () => {
    if (!email) return
    setResending(true)
    try {
      await authApi.resendVerification(email)
      setStatus('waiting')
      setMessage('A fresh verification email has been sent. Check your inbox.')
    } catch (err) {
      const text = err instanceof AxiosError ? err.response?.data?.error?.message : undefined
      setStatus('error')
      setMessage(text ?? 'Could not resend the verification email. Please try again later.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout title="Verify your email" subtitle="One quick step before you start using Nimbus.">
      <div className="flex flex-col items-center text-center">
        {status === 'success' ? (
          <CheckCircle2 className="h-12 w-12 text-success" />
        ) : (
          <MailCheck className="h-12 w-12 text-brand-500" />
        )}
        <p className="mt-4 text-sm text-ink-600 dark:text-ink-300">{message}</p>

        {(status === 'waiting' || status === 'error') && email && (
          <Button className="mt-5 w-full" variant="secondary" onClick={resend} loading={resending}>
            <RefreshCw className="h-4 w-4" />
            Resend verification email
          </Button>
        )}

        <Link to="/login" className="mt-5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Return to login
        </Link>
      </div>
    </AuthLayout>
  )
}
