import { prisma } from '../database/prisma'

const defaults = { fileShared: true, comments: true, storageAlmostFull: true, productUpdates: true }
export const notificationRepository = {
  findOrCreate(userId: string) {
    return prisma.notificationPreference.upsert({ where: { userId }, update: {}, create: { userId, ...defaults } })
  },
  update(userId: string, data: typeof defaults) {
    return prisma.notificationPreference.upsert({ where: { userId }, update: data, create: { userId, ...data } })
  },
}
