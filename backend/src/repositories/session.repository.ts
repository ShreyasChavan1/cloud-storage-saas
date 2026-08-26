import { prisma } from '../database/prisma'

// A session row's existence (and unexpired-ness) IS its validity — logout
// and refresh-rotation delete the row rather than flagging it revoked.
export const sessionRepository = {
  create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    return prisma.session.create({
      data: {
        userId,
        refreshToken: refreshTokenHash,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
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

  // Added for Phase 10's admin "active sessions" view. Only ever unexpired
  // rows — an expired-but-not-yet-cleaned-up row isn't a "session" from
  // the admin's point of view any more than it is from
  // findValidByHash's, and showing it would be misleading (see the header
  // comment above on why row-existence-plus-unexpired IS validity here).
  findManyForUser(userId: string) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
  },

  // Scoped to `userId` so an admin operating on one user's session list
  // can never accidentally (or via a tampered id) revoke a different
  // user's session — deleteMany with both conditions either deletes
  // exactly the one row or matches nothing.
  deleteOneForUser(sessionId: string, userId: string) {
    return prisma.session.deleteMany({ where: { id: sessionId, userId } })
  },

  // Backs the admin overview's "active sessions" count (Phase 10) — kept
  // here rather than adminService reaching into `prisma` directly, same
  // repository-only-touches-prisma discipline every other service in this
  // codebase already follows.
  countActive(): Promise<number> {
    return prisma.session.count({ where: { expiresAt: { gt: new Date() } } })
  },
}
