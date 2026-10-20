import { useQuery } from '@tanstack/react-query'
import { feedbackApi } from '@/api/feedback'

export const featuredFeedbackQueryKey = ['feedback', 'featured'] as const

// Public home-page reviews. If the request fails the page simply keeps showing
// its built-in sample reviews, so errors are not surfaced to visitors.
export function useFeaturedFeedback() {
  return useQuery({
    queryKey: featuredFeedbackQueryKey,
    queryFn: feedbackApi.featured,
    staleTime: 60_000,
  })
}
