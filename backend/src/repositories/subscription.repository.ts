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
}
