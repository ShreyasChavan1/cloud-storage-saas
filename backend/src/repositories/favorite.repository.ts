import { prisma } from '../database/prisma'

export const favoriteRepository = {
  findByUserAndPath(userId: string, path: string) {
    return prisma.favorite.findUnique({ where: { userId_path: { userId, path } } })
  },

  findPathsByUser(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      select: { path: true },
      orderBy: { createdAt: 'desc' },
    })
  },

  add(userId: string, path: string) {
    return prisma.favorite.upsert({
      where: { userId_path: { userId, path } },
      update: {},
      create: { userId, path },
    })
  },

  remove(userId: string, path: string) {
    return prisma.favorite.deleteMany({ where: { userId, path } })
  },

  removeByPath(userId: string, path: string) {
    return prisma.favorite.deleteMany({ where: { userId, path } })
  },

  removeUnderPath(userId: string, path: string) {
    return prisma.favorite.deleteMany({
      where: {
        userId,
        OR: [{ path }, { path: { startsWith: path.endsWith('/') ? path : `${path}/` } }],
      },
    })
  },

  async renamePath(userId: string, oldPath: string, newPath: string) {
    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
        OR: [{ path: oldPath }, { path: { startsWith: oldPath.endsWith('/') ? oldPath : `${oldPath}/` } }],
      },
      select: { id: true, path: true },
    })

    if (!favorites.length) return

    const updates = favorites.map((favorite) => {
      const suffix = favorite.path === oldPath ? '' : favorite.path.slice(oldPath.length)
      return { id: favorite.id, path: `${newPath}${suffix}` }
    })
    const destinationPaths = updates.map((item) => item.path)

    await prisma.$transaction(async (tx) => {
      // If the destination already contains a favorite, the moved favorite
      // should converge onto the destination instead of making the file
      // move succeed while the metadata update fails on the unique index.
      await tx.favorite.deleteMany({
        where: { userId, path: { in: destinationPaths } },
      })
      for (const update of updates) {
        await tx.favorite.update({ where: { id: update.id }, data: { path: update.path } })
      }
    })
  },
}
