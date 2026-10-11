import { prisma } from '../database/prisma'

export const agreementAcceptanceRepository = {
  findByUser(userId: string) {
    return prisma.agreementAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    })
  },
}
