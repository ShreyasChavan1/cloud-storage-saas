import { prisma } from '../database/prisma'

// One row per user (schema.prisma's Subscription.userId is @unique — see
// its header comment for why). The actual upsert that changes a user's
// plan lives in payment.service.ts's applyPlanChange, run through
// prisma.$transaction's interactive form together with the matching
// User.planId update — not through a repository method here, since
// atomicity across two tables needs both writes on the same transaction
// client (see that function's own comment for the full reasoning). What
// remains here are the plain, non-transactional reads/writes nothing else
// needs to coordinate with.
export const subscriptionRepository = {
  findByUserId(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    })
  },

  markQuotaSynced(id: string, syncedAt: Date) {
    return prisma.subscription.update({
      where: { id },
      data: { quotaSyncedAt: syncedAt },
    })
  },

  // --- Phase 11B ---------------------------------------------------------

  // Schedules or un-schedules a period-end cancellation without touching
  // plan/status at all — see payment.service.ts's cancelSubscription and
  // schema.prisma's own comment on this column.
  setCancelAtPeriodEnd(id: string, value: boolean) {
    return prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: value },
      include: { plan: true },
    })
  },

  // A failed recurring/renewal payment lands a subscription here — see
  // webhook.service.ts's handlePaymentFailed. Plan/quota are left
  // untouched; only reconciliation.service.ts's grace-window sweep (see
  // findPastDueExpired below) can take a PAST_DUE subscription further.
  markPastDue(id: string) {
    return prisma.subscription.update({ where: { id }, data: { status: 'PAST_DUE' } })
  },

  // Subscriptions whose current billing period has ended (renewalDate has
  // passed) and are still ACTIVE — reconciliation.service.ts's first sweep:
  // some need reverting to Free right away (cancelAtPeriodEnd), others just
  // need a PAST_DUE grace window started (a paid plan with no renewal
  // payment recorded yet).
  findDueForRenewal(now: Date) {
    return prisma.subscription.findMany({
      where: { status: 'ACTIVE', renewalDate: { lte: now } },
      include: { plan: true },
    })
  },

  // PAST_DUE subscriptions whose grace window (see PAST_DUE_GRACE_DAYS in
  // config/plans.ts) has itself elapsed with still no renewal payment —
  // reconciliation.service.ts's second sweep, which downgrades these to
  // Free with status EXPIRED.
  findPastDueExpired(graceCutoff: Date) {
    return prisma.subscription.findMany({
      where: { status: 'PAST_DUE', renewalDate: { lte: graceCutoff } },
      include: { plan: true },
    })
  },

  // Every subscription whose most recent plan change never got its
  // Nextcloud quota synced (see schema.prisma's comment on
  // quotaSyncedAt) — reconciliation.service.ts's third sweep, retrying
  // each one.
  findPendingQuotaSync() {
    return prisma.subscription.findMany({
      where: { quotaSyncedAt: null },
      include: { plan: true },
    })
  },
}
