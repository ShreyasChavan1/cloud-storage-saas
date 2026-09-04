import { prisma } from '../database/prisma'

export const billingSubscriptionRepository = {
  findById(id: string) {
    return prisma.billingSubscription.findUnique({ where: { id }, include: { plan: true } })
  },
  create(data: { userId: string; planId: string; razorpaySubscriptionId: string; status?: 'CREATED' | 'AUTHENTICATED' | 'ACTIVE' | 'PENDING' | 'HALTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED'; chargeAt?: Date | null; currentEnd?: Date | null }) {
    return prisma.billingSubscription.create({ data: { ...data, status: data.status ?? 'CREATED' } })
  },

  findByRazorpaySubscriptionId(id: string) {
    return prisma.billingSubscription.findUnique({ where: { razorpaySubscriptionId: id }, include: { plan: true } })
  },

  findByUserId(userId: string) {
    return prisma.billingSubscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  },

  findActiveForUser(userId: string) {
    return prisma.billingSubscription.findFirst({
      where: { userId, status: { in: ['CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED'] } },
      orderBy: { createdAt: 'desc' },
    })
  },

  findForUserPlan(userId: string, planId: string) {
    return prisma.billingSubscription.findFirst({
      where: { userId, planId, status: { in: ['CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED'] } },
      orderBy: { createdAt: 'desc' },
    })
  },

  updateStatus(id: string, status: 'CREATED' | 'AUTHENTICATED' | 'ACTIVE' | 'PENDING' | 'HALTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED', dates: { currentStart?: Date | null; currentEnd?: Date | null; chargeAt?: Date | null } = {}) {
    return prisma.billingSubscription.update({ where: { id }, data: { status, ...dates } })
  },

  attachLocalSubscription(id: string, subscriptionId: string) {
    return prisma.billingSubscription.update({ where: { id }, data: { subscriptionId } })
  },

}
