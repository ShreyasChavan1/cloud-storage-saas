import { Prisma, Subscription } from '@prisma/client'

export type SubscriptionWithPlan = Subscription & { plan: Prisma.PlanGetPayload<{}> }

export interface SubscriptionDTO {
  id: string
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'EXPIRED'
  plan: string
  renewalDate: string
  // Null means the plan/subscription change itself succeeded but the
  // Nextcloud quota update that should accompany it hasn't landed yet —
  // see payment.service.ts's applyPlanChange and schema.prisma's own
  // comment on this column for why that's surfaced rather than hidden.
  quotaSyncedAt: string | null
  // Phase 11B — true means a period-end cancellation is scheduled: the
  // user keeps this plan/quota until renewalDate, then reconciliation
  // reverts them to Free. See payment.service.ts's cancelSubscription.
  cancelAtPeriodEnd: boolean
}

export function toSubscriptionDTO(subscription: SubscriptionWithPlan): SubscriptionDTO {
  return {
    id: subscription.id,
    status: subscription.status,
    plan: subscription.plan.name,
    renewalDate: subscription.renewalDate.toISOString(),
    quotaSyncedAt: subscription.quotaSyncedAt?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }
}
