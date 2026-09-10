import { api } from '@/lib/api'
import { AuthUser } from './auth'

export interface NotificationPreferences {
  fileShared: boolean
  comments: boolean
  storageAlmostFull: boolean
  productUpdates: boolean
}

export const userApi = {
  getProfile: () => api.get<{ data: { user: AuthUser } }>('/users/me').then((r) => r.data.data.user),
  updateProfile: (name: string) => api.patch<{ data: { user: AuthUser } }>('/users/me', { name }).then((r) => r.data.data.user),
  uploadAvatar: (file: File) => {
    const body = new FormData(); body.append('avatar', file)
    return api.put<{ data: { user: AuthUser } }>('/users/me/avatar', body).then((r) => r.data.data.user)
  },
  removeAvatar: () => api.delete<{ data: { user: AuthUser } }>('/users/me/avatar').then((r) => r.data.data.user),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/users/me/password', { currentPassword, newPassword }).then(() => undefined),
  repairWebdav: (currentPassword: string) => api.post('/users/me/webdav/repair', { currentPassword }).then(() => undefined),
  getNotifications: () => api.get<{ data: { preferences: NotificationPreferences } }>('/users/me/notifications').then((r) => r.data.data.preferences),
  updateNotifications: (preferences: NotificationPreferences) => api.put<{ data: { preferences: NotificationPreferences } }>('/users/me/notifications', preferences).then((r) => r.data.data.preferences),
}
