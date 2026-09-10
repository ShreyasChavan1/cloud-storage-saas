import { prisma } from '../database/prisma'

export const cctvRepository = {
  create(data: { userId: string; name: string; tokenHash?: string; tokenPrefix: string; enrollmentCodeHash: string; enrollmentExpiresAt: Date }) {
    return prisma.cctvDevice.create({ data })
  },
  findByTokenHash(tokenHash: string) {
    return prisma.cctvDevice.findUnique({ where: { tokenHash } })
  },
  findByEnrollmentHash(enrollmentCodeHash: string) {
    return prisma.cctvDevice.findUnique({ where: { enrollmentCodeHash } })
  },
  enroll(id: string, data: { tokenHash: string; tokenPrefix: string; enrollmentCodeHash: null; enrollmentExpiresAt: null; gatewayId: string; status: 'ACTIVE' }) {
    return prisma.cctvDevice.update({ where: { id }, data })
  },
  updateConfig(id: string, data: { nvrHost: string; nvrUsername: string; nvrPasswordEncrypted: string; camerasJson: string; segmentSeconds: number; uploadPollSeconds: number }) {
    return prisma.cctvDevice.update({ where: { id }, data })
  },
  findByUser(userId: string) {
    return prisma.cctvDevice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, tokenPrefix: true, status: true, lastSeenAt: true, lastUploadAt: true, createdAt: true, nvrHost: true, nvrUsername: true, camerasJson: true, segmentSeconds: true, uploadPollSeconds: true } })
  },
  deleteForUser(id: string, userId: string) {
    return prisma.cctvDevice.deleteMany({ where: { id, userId } })
  },
  touchSeen(id: string) {
    return prisma.cctvDevice.update({ where: { id }, data: { lastSeenAt: new Date() } })
  },
  async reserveUpload(deviceId: string, filename: string, path: string, size: number, recordedAt?: Date) {
    return prisma.cctvUpload.create({ data: { deviceId, filename, path, size: BigInt(size), recordedAt } })
  },
  findUpload(deviceId: string, filename: string) {
    return prisma.cctvUpload.findUnique({ where: { deviceId_filename: { deviceId, filename } } })
  },
  touchUploaded(id: string) {
    return prisma.cctvDevice.update({ where: { id }, data: { lastSeenAt: new Date(), lastUploadAt: new Date() } })
  },
}
