import { api } from '@/lib/api'

export interface SupportContact {
  email: string
  phone: string
}

export const supportApi = {
  getContact: () => api.get<{ data: { contact: SupportContact } }>('/support/contact').then((r) => r.data.data.contact),

  sendMessage: (input: { subject: string; message: string }) =>
    api.post('/support/message', input).then(() => undefined),
}
