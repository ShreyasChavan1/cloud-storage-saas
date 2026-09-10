import { prisma } from '../database/prisma'

export const passwordResetTokenRepository = {
  create(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    })
  },

  findValidByHash(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  },

  markUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  },

  // Keep the freshly-created token and invalidate all older tokens. Creating
  // first avoids the gap where two concurrent forgot-password requests could
  // both delete the other's token before either one creates its own.
  deleteAllForUserExcept(userId: string, tokenHash: string) {
    return prisma.passwordResetToken.deleteMany({ where: { userId, tokenHash: { not: tokenHash } } })
  },
}
