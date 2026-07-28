import { api } from '@/lib/api'
import { AuthUser } from './auth'

export const userApi = {
  getProfile: () => api.get<{ data: { user: AuthUser } }>('/users/me').then((r) => r.data.data.user),

  updateProfile: (name: string) =>
    api.patch<{ data: { user: AuthUser } }>('/users/me', { name }).then((r) => r.data.data.user),
}
