import { api } from '@/lib/api'

// What the form sends. The signed-in account supplies the identity, so there
// is no name or email field.
export interface FeedbackSubmission {
  rating: number
  description: string
}

// A review shown on the public home page (first name + last initial only).
export interface FeaturedFeedback {
  id: string
  rating: number
  text: string
  name: string
}

export interface FeedbackEntry {
  id: string
  rating: number
  description: string
  email: string | null
  userName: string | null
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
  // Signed-in users only (the backend rejects anonymous requests).
  submit: (input: FeedbackSubmission) =>
    api.post<{ data: { id: string } }>('/feedback', input).then((r) => r.data.data),

  // Public: the latest well-rated reviews for the home page.
  featured: () =>
    api.get<{ data: { reviews: FeaturedFeedback[] } }>('/feedback/featured').then((r) => r.data.data.reviews),

  // Admin only (the backend's requireAdmin is the real gate).
  adminList: (params: ListFeedbackParams) =>
    api.get<{ data: FeedbackPage }>('/admin/feedback', { params }).then((r) => r.data.data),

  adminDelete: (id: string) => api.delete(`/admin/feedback/${id}`).then((r) => r.data),
}
