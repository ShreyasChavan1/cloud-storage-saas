import { api } from '@/lib/api'

export interface BillingPlan {
  id: string // Razorpay plan id, used as the billing catalog identity
  localPlanId: string // Nimbus Plan id, used for entitlement/FK operations
  localPlanName: string
  name: string
  description: string
  storageLimitGb: number
  price: string
  currency: string
  interval: number
  period: string
}

export interface CreateSubscriptionResponse {
  subscriptionId: string
  keyId: string
  planId: string
  planName: string
  amount: number
  currency: string
}

export interface VerifySubscriptionResponse {
  payment: unknown
  subscription: unknown
  quotaSynced: boolean
}

export const paymentsApi = {
  listPlans: () =>
    api.get<{ data: { plans: BillingPlan[] } }>('/payments/plans').then((r) => r.data.data.plans),

  createSubscription: (planId: string) =>
    api
      .post<{ data: CreateSubscriptionResponse }>('/payments/create-subscription', { planId })
      .then((r) => r.data.data),

  verifySubscription: (input: { razorpaySubscriptionId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api
      .post<{ data: VerifySubscriptionResponse }>('/payments/verify-subscription', input)
      .then((r) => r.data.data),

  cancelSubscription: (atPeriodEnd = true) =>
    api
      .post<{ data: { subscription: unknown; quotaSynced: boolean } }>('/payments/cancel-subscription', { atPeriodEnd })
      .then((r) => r.data.data),
}
