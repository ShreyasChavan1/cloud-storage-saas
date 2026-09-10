import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/api/auth'

export default function ResetPassword() {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!token) return setError('This reset link is missing its token.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try { await authApi.resetPassword(token, password); setDone(true); setTimeout(() => navigate('/login'), 1200) }
    catch (err: any) { setError(err?.response?.data?.error?.message ?? 'This reset link is invalid or has expired.') }
    finally { setLoading(false) }
  }
  return <AuthLayout title="Create a new password" subtitle="Choose a new password for your Nimbus account.">
    {done ? <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-50 p-6 text-center dark:border-dark-border dark:bg-dark-surface2"><CheckCircle2 className="h-10 w-10 text-success"/><p className="font-medium">Password updated</p><p className="text-sm text-ink-500">Taking you back to login...</p></div> : <form onSubmit={submit} className="flex flex-col gap-4"><Input label="New password" type="password" placeholder="At least 8 characters" icon={<Lock className="h-4 w-4"/>} value={password} onChange={e=>setPassword(e.target.value)} error={error}/><Input label="Confirm password" type="password" placeholder="Repeat your password" icon={<Lock className="h-4 w-4"/>} value={confirm} onChange={e=>setConfirm(e.target.value)}/><Button type="submit" size="lg" loading={loading} className="mt-2 w-full">Reset password</Button></form>}
    <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600"><ArrowLeft className="h-4 w-4"/>Back to log in</Link>
  </AuthLayout>
}
