import { createContext, useContext, useState, ReactNode } from 'react'
import { currentUser } from '@/data/dummyData'

interface AuthUser {
  name: string
  email: string
  avatarInitials: string
  plan: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// NOTE: Phase 1 is UI-only. These calls simulate network latency and always
// succeed — real authentication will be wired to the Express API in Phase 2.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return localStorage.getItem('nimbus-demo-auth') ? currentUser : null
  })

  const login = async (_email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 600))
    localStorage.setItem('nimbus-demo-auth', '1')
    setUser(currentUser)
  }

  const register = async (name: string, email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 600))
    localStorage.setItem('nimbus-demo-auth', '1')
    setUser({ ...currentUser, name, email, avatarInitials: initials(name) })
  }

  const logout = () => {
    localStorage.removeItem('nimbus-demo-auth')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
