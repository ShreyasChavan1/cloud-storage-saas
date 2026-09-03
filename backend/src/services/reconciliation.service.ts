import { subscriptionRepository } from '../repositories/subscription.repository'
import { userRepository } from '../repositories/user.repository'
import { paymentService } from './payment.service'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { logger } from '../config/logger'
import { PAST_DUE_GRACE_DAYS } from '../config/plans'
import { SubscriptionWithPlan } from '../models/subscription.model'

export interface ReconciliationSummary {
  canceledAtPeriodEnd: number
  markedPastDue: number
  expiredToFree: number
  quotaSynced: number
  quotaSyncStillFailing: number
  errors: string[]
}

/**
 * Phase 11B — the sweep that acts on everything the rest of the payment
 * system only ever leaves as a *marker* for later: a subscription past its
 * renewalDate, a PAST_DUE subscription whose grace window has run out, and
 * a subscription whose Nextcloud quota sync never landed. Nothing else in
 * this codebase calls this on a schedule — see admin.routes.ts's
 * POST /admin/reconcile-subscriptions, meant to be invoked by an external
 * scheduler (cron, a platform's own scheduled-job feature, etc.). Adding
 * an in-process scheduler (e.g. node-cron) isn't done here — it'd be a new
 * dependency and a new long-running background concern neither Phase 11A
 * nor this phase's brief asks for, and an HTTP-triggered sweep is trivially
 * schedulable from outside without one.
 *
 * Every step below reuses the exact same plan-change machinery the rest of
 * payment.service.ts uses (via cancelSubscription / expireSubscriptionToFree,
 * both of which go through applyPlanChange) rather than reimplementing
 * "revert this user to Free" a third time.
 */
export const reconciliationService = {
  async run(): Promise<ReconciliationSummary> {
    const summary: ReconciliationSummary = {
      canceledAtPeriodEnd: 0,
      markedPastDue: 0,
      expiredToFree: 0,
      quotaSynced: 0,
      quotaSyncStillFailing: 0,
      errors: [],
    }
    const now = new Date()

    // 1. Subscriptions whose current billing period has ended.
    const due = await subscriptionRepository.findDueForRenewal(now)
    for (const sub of due) {
      try {
        if (sub.cancelAtPeriodEnd) {
          await paymentService.cancelSubscription(sub.userId)
          summary.canceledAtPeriodEnd++
        } else if (Number(sub.plan.price) > 0) {
          // A paid plan reached the end of its period with no renewal
          // payment ever landing (verify-payment or the payment.captured
          // webhook would have already pushed renewalDate forward
          // otherwise) — start the grace window rather than downgrading
          // immediately.
          await subscriptionRepository.markPastDue(sub.id)
          summary.markedPastDue++
        }
        // A $0 (Free) plan reaching its own renewalDate needs no action —
        // there's nothing to renew or charge.
      } catch (err) {
        logger.error({ userId: sub.userId, subscriptionId: sub.id, err }, 'Reconciliation: failed to process a due subscription')
        summary.errors.push(`subscription ${sub.id}: ${errorMessage(err)}`)
      }
    }

    // 2. PAST_DUE subscriptions whose grace window has itself elapsed.
    const graceCutoff = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)
    const expired = await subscriptionRepository.findPastDueExpired(graceCutoff)
    for (const sub of expired) {
      try {
        await paymentService.expireSubscriptionToFree(sub.userId)
        summary.expiredToFree++
      } catch (err) {
        logger.error({ userId: sub.userId, subscriptionId: sub.id, err }, 'Reconciliation: failed to downgrade an expired subscription')
        summary.errors.push(`subscription ${sub.id}: ${errorMessage(err)}`)
      }
    }

    // 3. Retry any Nextcloud quota sync that failed at the time of its
    // plan change — see schema.prisma's comment on
    // Subscription.quotaSyncedAt and payment.service.ts's applyPlanChange.
    const pendingSync = await subscriptionRepository.findPendingQuotaSync()
    for (const sub of pendingSync) {
      const synced = await retryQuotaSync(sub)
      if (synced) summary.quotaSynced++
      else summary.quotaSyncStillFailing++
    }

    return summary
  },
}

async function retryQuotaSync(sub: SubscriptionWithPlan): Promise<boolean> {
  const user = await userRepository.findById(sub.userId)
  if (!user?.nextcloudUsername) {
    logger.warn({ userId: sub.userId }, 'Reconciliation: cannot retry quota sync, user has no Nextcloud account')
    return false
  }
  try {
    await nextcloudService.setQuota(user.nextcloudUsername, sub.plan.storageLimit)
    await subscriptionRepository.markQuotaSynced(sub.id, new Date())
    return true
  } catch (err) {
    const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
    logger.error({ userId: sub.userId, subscriptionId: sub.id, detail }, 'Reconciliation: quota sync retry failed again')
    return false
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error'
}
