import { prisma } from '../database/prisma'

export const emailVerificationTokenRepository = {
  create(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } })
  },
  findValidByHash(tokenHash: string) {
    return prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    })
  },
  markUsed(id: string) {
    return prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } })
  },
  deleteAllForUserExcept(userId: string, tokenHash: string) {
    return prisma.emailVerificationToken.deleteMany({ where: { userId, tokenHash: { not: tokenHash } } })
  },
}
