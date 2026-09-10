import { api } from '@/lib/api'

export interface CctvDevice {
  id: string; name: string; tokenPrefix: string; status: 'PROVISIONING' | 'ACTIVE' | 'DISABLED'
  lastSeenAt: string | null; lastUploadAt: string | null; createdAt: string
  nvrHost?: string | null; nvrUsername?: string | null; camerasConfigured?: number
  segmentSeconds?: number; uploadPollSeconds?: number
}
export interface CctvCamera { name: string; rtspUrl: string; enabled?: boolean }
export const cctvApi = {
  list: () => api.get<{ data: { devices: CctvDevice[] } }>('/cctv/devices').then(r => r.data.data.devices),
  create: (name: string) => api.post<{ data: { device: CctvDevice & { enrollmentCode: string; enrollmentExpiresAt: string } } }>('/cctv/devices', { name }).then(r => r.data.data.device),
  configure: (id: string, body: { nvrHost: string; nvrUsername: string; nvrPassword: string; cameras: CctvCamera[]; segmentSeconds: number; uploadPollSeconds: number }) => api.put(`/cctv/devices/${encodeURIComponent(id)}/config`, body).then(() => undefined),
  remove: (id: string) => api.delete(`/cctv/devices/${encodeURIComponent(id)}`).then(() => undefined),
}
