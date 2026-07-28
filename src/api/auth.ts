import { api } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarInitials: string
  plan: string | null
  role: 'USER' | 'ADMIN'
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
}

// Every call here unwraps the backend's { success, data } envelope once,
// so nothing above this file ever touches that shape directly.
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/register', { name, email, password }).then((r) => r.data.data),

  login: (email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () => api.post('/auth/logout').then(() => undefined),

  refreshToken: () => api.post<{ data: AuthResponse }>('/auth/refresh-token').then((r) => r.data.data),

  forgotPassword: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/forgot-password', { email }).then((r) => r.data.data),
}
