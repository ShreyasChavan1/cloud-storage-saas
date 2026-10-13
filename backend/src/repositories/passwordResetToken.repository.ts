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

  // Atomic single-use claim. findValidByHash + markUsed as two steps lets two
  // concurrent requests both succeed with the same token; this UPDATE ... WHERE
  // usedAt IS NULL succeeds for exactly one of them. Returns the token row's
  // userId, or null if it was invalid, expired or already used.
  async consumeByHash(tokenHash: string): Promise<{ userId: string } | null> {
    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    })
    if (!row) return null
    const claimed = await prisma.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    return claimed.count === 1 ? { userId: row.userId } : null
  },

  deleteExpired() {
    return prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    })
  },
}
