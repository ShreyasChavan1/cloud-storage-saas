import { prisma } from '../database/prisma'

// A session row's existence (and unexpired-ness) IS its validity — logout
// and refresh-rotation delete the row rather than flagging it revoked.
export const sessionRepository = {
  create(userId: string, refreshTokenHash: string, expiresAt: Date) {
    return prisma.session.create({
      data: { userId, refreshToken: refreshTokenHash, expiresAt },
    })
  },

  findValidByHash(refreshTokenHash: string) {
    return prisma.session.findFirst({
      where: {
        refreshToken: refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
    })
  },

  deleteByHash(refreshTokenHash: string) {
    return prisma.session.deleteMany({ where: { refreshToken: refreshTokenHash } })
  },

  deleteAllForUser(userId: string) {
    return prisma.session.deleteMany({ where: { userId } })
  },
}
