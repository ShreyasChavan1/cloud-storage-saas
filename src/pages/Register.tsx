import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { AxiosError } from 'axios'
import { AGREEMENT_VERSION } from '@/data/serviceAgreement'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [agreementError, setAgreementError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Warn about the agreement up front so it's visible alongside any other
    // field error, but never let registration proceed without it.
    const missingAgreement = !agreed
    setAgreementError(missingAgreement ? 'Please accept the Service Agreement to continue.' : '')
    if (!name || !email || !phoneNumber || !password) {
      setError('Fill in every field to create your account.')
      return
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(phoneNumber.trim())) {
      setError('Enter a valid phone number, including country code if possible.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    if (missingAgreement) return
    setLoading(true)
    try {
      const result = await register(name, email, phoneNumber, password, AGREEMENT_VERSION)
      const token = result.devToken ? `&token=${encodeURIComponent(result.devToken)}` : ''
      navigate(`/verify-email?email=${encodeURIComponent(email)}${token}`)
    } catch (err) {
      const message = err instanceof AxiosError ? err.response?.data?.error?.message : undefined
      setError(message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start with 5GB free — no card required.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name" placeholder="Asha Kapoor" icon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone number" type="tel" placeholder="+919876543210" icon={<Phone className="h-4 w-4" />} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <Input label="Password" type="password" placeholder="At least 8 characters" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700 dark:text-ink-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (e.target.checked) setAgreementError('')
              }}
              aria-invalid={!!agreementError}
              aria-describedby={agreementError ? 'agreement-error' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent-500"
            />
            <span>
              I have read and agree to the DVT{' '}
              <Link to="/service-agreement" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 underline hover:text-brand-700 dark:text-brand-400">
                Storage Service Agreement (MSA + SLA)
              </Link>
              .
            </span>
          </label>
          {agreementError && (
            <p id="agreement-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">{agreementError}</p>
          )}
        </div>
        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Log in</Link>
      </p>
    </AuthLayout>
  )
}
