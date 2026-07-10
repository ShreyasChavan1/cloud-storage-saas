import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('asha@example.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    setError('')
    setLoading(true)
    await login(email, password)
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep working on your files.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-500" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  )
}
