import { prisma } from '../database/prisma'

const SINGLETON_ID = 'singleton'

export const appSettingsRepository = {
  get() {
    return prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } })
  },
  upsert(data: { supportEmail: string; supportPhone: string }) {
    return prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    })
  },
}
