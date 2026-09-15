import { api } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  emailVerified: boolean
  avatarInitials: string
  avatarUrl?: string | null
  plan: string | null
  role: 'USER' | 'ADMIN'
}

interface AuthResponse { user: AuthUser; accessToken: string }
export interface RegistrationResult { user: AuthUser; verificationRequired: true; devToken?: string }

// Every call here unwraps the backend's { success, data } envelope once,
// so nothing above this file ever touches that shape directly.
export const authApi = {
  register: (name: string, email: string, phoneNumber: string, password: string) =>
    api.post<{ data: RegistrationResult }>('/auth/register', { name, email, phoneNumber, password }).then((r) => r.data.data),

  verifyEmail: (token: string) =>
    api.post<{ data: AuthResponse }>('/auth/verify-email', { token }).then((r) => r.data.data),

  resendVerification: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/resend-verification', { email }).then((r) => r.data.data),

  login: (email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () => api.post('/auth/logout').then(() => undefined),

  refreshToken: () => api.post<{ data: AuthResponse }>('/auth/refresh-token').then((r) => r.data.data),

  forgotPassword: (email: string) =>
    api.post<{ data: { message: string; devToken?: string } }>('/auth/forgot-password', { email }).then((r) => r.data.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then(() => undefined),
}
