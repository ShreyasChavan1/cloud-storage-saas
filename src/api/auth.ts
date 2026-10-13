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
export interface RegistrationResult { user: AuthUser; verificationRequired: true }

let inflightRefresh: Promise<AuthResponse> | null = null

// Every call here unwraps the backend's { success, data } envelope once,
// so nothing above this file ever touches that shape directly.
export const authApi = {
  register: (name: string, email: string, phoneNumber: string, password: string, agreementVersion: string) =>
    api
      .post<{ data: RegistrationResult }>('/auth/register', {
        name,
        email,
        phoneNumber,
        password,
        acceptedAgreement: true,
        agreementVersion,
      })
      .then((r) => r.data.data),

  verifyEmail: (token: string) =>
    api.post<{ data: AuthResponse }>('/auth/verify-email', { token }).then((r) => r.data.data),

  resendVerification: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/resend-verification', { email }).then((r) => r.data.data),

  login: (email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () => api.post('/auth/logout').then(() => undefined),

  // One in-flight call shared by every caller. The backend rotates the refresh
  // token on each use and treats a replay as theft, so two simultaneous calls
  // with the same cookie (React StrictMode's double effect in dev, two
  // components restoring the session) must not both hit the server.
  refreshToken: (): Promise<AuthResponse> => {
    inflightRefresh ??= api
      .post<{ data: AuthResponse }>('/auth/refresh-token')
      .then((r) => r.data.data)
      .finally(() => { inflightRefresh = null })
    return inflightRefresh
  },

  forgotPassword: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/forgot-password', { email }).then((r) => r.data.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then(() => undefined),
}
