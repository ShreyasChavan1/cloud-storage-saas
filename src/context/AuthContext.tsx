import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, setAccessToken } from '../lib/api'

interface AuthUser {
  name: string
  email: string
  avatarInitials: string
  plan: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true) // true while we check for an existing session

  // On first load, there's no access token in memory yet (page refresh wipes
  // it), so try a silent refresh using the httpOnly cookie to restore the session.
  useEffect(() => {
    api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.accessToken)
        setUser(data.data.user)
      })
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.data.accessToken)
    setUser(data.data.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    setAccessToken(data.data.accessToken)
    setUser(data.data.user)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}