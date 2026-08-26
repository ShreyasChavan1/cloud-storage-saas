import { prisma } from '../database/prisma'

// Read-only on purpose: no payment gateway (Stripe/Razorpay/etc.) is
// integrated anywhere in this codebase yet, so nothing ever creates a
// Payment row today — the `payments` table exists (Phase 3 schema) but is
// legitimately empty in any real deployment until a gateway is wired up.
// This repository exists for Phase 10's admin "view payments" requirement
// to honestly reflect that (an empty list is the correct, non-fabricated
// answer right now), not to pretend billing history exists.
export const paymentRepository = {
  findManyForUser(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },
}
