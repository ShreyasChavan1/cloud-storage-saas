import { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma'

// Was read-only before Phase 11A (no payment gateway was integrated
// anywhere in this codebase, so nothing ever created a Payment row) — see
// backend/README.md's Phase 10 section for that history. The create/
// update methods below are the first code to ever actually write here.
export const paymentRepository = {
  findManyForUser(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // Created once, at order-creation time, with status PENDING and no
  // providerPaymentId yet (that's only known once the gateway responds to
  // an actual payment attempt). verify-payment only ever updates this
  // same row afterward — see findByProviderOrderId below — it never
  // creates a second one, which is what makes replayed verification safe
  // by construction rather than by an extra check bolted on top.
  create(data: {
    userId: string
    planId: string
    amount: Prisma.Decimal | number
    provider: string
    providerOrderId: string
  }) {
    return prisma.payment.create({
      data: { ...data, status: 'PENDING' },
    })
  },

  findByProviderOrderId(providerOrderId: string) {
    return prisma.payment.findUnique({ where: { providerOrderId } })
  },

  markSucceeded(id: string, params: { providerPaymentId: string; subscriptionId: string }) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        providerPaymentId: params.providerPaymentId,
        subscriptionId: params.subscriptionId,
      },
    })
  },

  markFailed(id: string) {
    return prisma.payment.update({ where: { id }, data: { status: 'FAILED' } })
  },
}
