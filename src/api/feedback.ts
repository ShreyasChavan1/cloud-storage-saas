import { api } from '@/lib/api'

// What the public form sends. `email` is left out entirely when blank.
export interface FeedbackSubmission {
  rating: number
  description: string
  email?: string
}

export interface FeedbackEntry {
  id: string
  rating: number
  description: string
  email: string | null
  createdAt: string
}

export interface FeedbackPage {
  feedback: FeedbackEntry[]
  total: number
  page: number
  limit: number
  /** Count and average over ALL feedback, not just the filtered list. */
  overallTotal: number
  averageRating: number | null
}

export interface ListFeedbackParams {
  page?: number
  limit?: number
  rating?: number
  search?: string
}

export const feedbackApi = {
  // Public — no login needed.
  submit: (input: FeedbackSubmission) =>
    api.post<{ data: { id: string } }>('/feedback', input).then((r) => r.data.data),

  // Admin only (the backend's requireAdmin is the real gate).
  adminList: (params: ListFeedbackParams) =>
    api.get<{ data: FeedbackPage }>('/admin/feedback', { params }).then((r) => r.data.data),

  adminDelete: (id: string) => api.delete(`/admin/feedback/${id}`).then((r) => r.data),
}
