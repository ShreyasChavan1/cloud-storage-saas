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

  // Atomic single-use claim. findValidByHash + markUsed as two steps lets two
  // concurrent requests both succeed with the same token; this UPDATE ... WHERE
  // usedAt IS NULL succeeds for exactly one of them. Returns the token row's
  // userId, or null if it was invalid, expired or already used.
  async consumeByHash(tokenHash: string): Promise<{ userId: string } | null> {
    const row = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    })
    if (!row) return null
    const claimed = await prisma.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    return claimed.count === 1 ? { userId: row.userId } : null
  },

  deleteExpired() {
    return prisma.emailVerificationToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    })
  },
}
