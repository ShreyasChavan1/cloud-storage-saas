import { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma'

// Phase 11B — see schema.prisma's WebhookEvent model comment for why `id`
// is a hash of the raw request body rather than trusting a field inside
// the payload itself. webhook.service.ts is the only caller.
export const webhookEventRepository = {
  findById(id: string) {
    return prisma.webhookEvent.findUnique({ where: { id } })
  },

  // Created once, at first sight of a given delivery, with status RECEIVED
  // — mirrors payment.repository.ts's create/markSucceeded split: this
  // never runs twice for the same id (findById above guards that in
  // webhook.service.ts), so a later markProcessed/markFailed always
  // updates this same row rather than racing to create a second one.
  create(data: { id: string; eventType: string; payload: Prisma.InputJsonValue }) {
    return prisma.webhookEvent.create({
      data: { ...data, status: 'RECEIVED' },
    })
  },

  markProcessed(id: string) {
    return prisma.webhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date(), error: null },
    })
  },

  markFailed(id: string, error: string) {
    return prisma.webhookEvent.update({
      where: { id },
      data: { status: 'FAILED', error },
    })
  },
}
