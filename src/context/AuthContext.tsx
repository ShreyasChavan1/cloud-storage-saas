import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { setAccessToken } from '@/lib/api'
import { authApi, AuthUser } from '@/api/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // Lets other parts of the app (e.g. after a profile update) update the
  // user AuthContext holds without a full re-login.
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true) // true while we check for an existing session

  // On first load, there's no access token in memory yet (page refresh wipes
  // it), so try a silent refresh using the httpOnly cookie to restore the session.
  useEffect(() => {
    authApi
      .refreshToken()
      .then(({ accessToken, user }) => {
        setAccessToken(accessToken)
        setUser(user)
      })
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { accessToken, user } = await authApi.login(email, password)
    setAccessToken(accessToken)
    setUser(user)
  }

  const register = async (name: string, email: string, password: string) => {
    const { accessToken, user } = await authApi.register(name, email, password)
    setAccessToken(accessToken)
    setUser(user)
  }

  const logout = async () => {
    await authApi.logout()
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
