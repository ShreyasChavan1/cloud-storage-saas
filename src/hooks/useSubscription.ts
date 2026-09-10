import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: paymentsApi.getSubscription,
  })
}
