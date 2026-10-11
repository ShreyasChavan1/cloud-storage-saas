import { api } from '@/lib/api'

export type ClientFormStatus = 'NEW' | 'IN_REVIEW' | 'PROPOSAL_SENT' | 'CLOSED'
export type ClientFormPriority = 'NORMAL' | 'HIGH' | 'URGENT'
export type FormAnswers = Record<string, string | string[]>

// What the public form sends. Sections 3-6 go in `answers`; the admin-only
// "DVT internal assessment" is deliberately not part of this shape.
export interface ClientFormSubmission {
  companyName: string
  contactPerson: string
  designation?: string
  mobile: string
  email: string
  industry?: string
  city?: string
  website?: string
  services: string[]
  answers: FormAnswers
  confirmed: true
}

export interface ClientFormSummary {
  id: string
  companyName: string
  contactPerson: string
  email: string
  mobile: string
  services: string[]
  status: ClientFormStatus
  priority: ClientFormPriority
  createdAt: string
}

export interface ClientForm extends ClientFormSummary {
  designation: string | null
  industry: string | null
  city: string | null
  website: string | null
  answers: FormAnswers
  recommendedService: string | null
  estimatedScope: string | null
  suggestedArchitecture: string | null
  thirdPartyServices: string | null
  migrationSetup: boolean | null
  customDevelopment: boolean | null
  /** YYYY-MM-DD */
  proposalRequiredBy: string | null
  technicalNotes: string | null
  updatedAt: string
}

export interface ClientFormsPage {
  forms: ClientFormSummary[]
  total: number
  page: number
  limit: number
  newCount: number
}

export interface ListClientFormsParams {
  page?: number
  limit?: number
  search?: string
  status?: ClientFormStatus
}

export type ClientFormUpdate = Partial<
  Pick<
    ClientForm,
    | 'status'
    | 'priority'
    | 'recommendedService'
    | 'estimatedScope'
    | 'suggestedArchitecture'
    | 'thirdPartyServices'
    | 'migrationSetup'
    | 'customDevelopment'
    | 'proposalRequiredBy'
    | 'technicalNotes'
  >
>

export const clientFormsApi = {
  // Public — no login needed.
  submit: (input: ClientFormSubmission) =>
    api.post<{ data: { id: string } }>('/client-forms', input).then((r) => r.data.data),

  // Admin only (the backend's requireAdmin is the real gate).
  adminList: (params: ListClientFormsParams) =>
    api.get<{ data: ClientFormsPage }>('/admin/client-forms', { params }).then((r) => r.data.data),

  adminGet: (id: string) =>
    api.get<{ data: { form: ClientForm } }>(`/admin/client-forms/${id}`).then((r) => r.data.data.form),

  adminUpdate: (id: string, input: ClientFormUpdate) =>
    api.patch<{ data: { form: ClientForm } }>(`/admin/client-forms/${id}`, input).then((r) => r.data.data.form),
}
