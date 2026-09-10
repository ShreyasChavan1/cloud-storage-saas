import { notificationRepository } from '../repositories/notification.repository'

export const notificationService = {
  get(userId: string) { return notificationRepository.findOrCreate(userId) },
  update(userId: string, input: { fileShared: boolean; comments: boolean; storageAlmostFull: boolean; productUpdates: boolean }) {
    return notificationRepository.update(userId, input)
  },
}
