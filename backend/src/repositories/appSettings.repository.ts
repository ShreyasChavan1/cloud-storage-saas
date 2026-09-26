import { prisma } from '../database/prisma'

const SINGLETON_ID = 'singleton'

// Same fallback values as support.service.ts's FALLBACK_SUPPORT_EMAIL/PHONE —
// only used if upsertObjectStorageCapacity ever has to CREATE the row
// (shouldn't happen in practice, the app_settings migration already seeds
// it, but upsert needs something to put in the NOT NULL columns either way).
const FALLBACK_SUPPORT_EMAIL = 'hrishikeshdalvi0504@gmail.com'
const FALLBACK_SUPPORT_PHONE = '9168598659'

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
  upsertObjectStorageCapacity(bytes: bigint) {
    return prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        supportEmail: FALLBACK_SUPPORT_EMAIL,
        supportPhone: FALLBACK_SUPPORT_PHONE,
        objectStorageCapacityBytes: bytes,
      },
      update: { objectStorageCapacityBytes: bytes },
    })
  },
}
