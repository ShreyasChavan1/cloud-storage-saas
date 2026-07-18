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

  // Invalidate any tokens issued by earlier forgot-password calls before
  // issuing a fresh one, so only the most recent reset link is ever live.
  deleteAllForUser(userId: string) {
    return prisma.passwordResetToken.deleteMany({ where: { userId } })
  },
}
