import { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma'

export const feedbackRepository = {
  create(data: Prisma.FeedbackCreateInput) {
    return prisma.feedback.create({ data })
  },

  findById(id: string) {
    return prisma.feedback.findUnique({ where: { id } })
  },

  findMany(params: { where?: Prisma.FeedbackWhereInput; skip?: number; take?: number }) {
    return prisma.feedback.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    })
  },

  count(where?: Prisma.FeedbackWhereInput) {
    return prisma.feedback.count({ where })
  },

  // Over ALL feedback (not the filtered list) — the admin header shows the
  // overall average and total.
  summary() {
    return prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } })
  },

  delete(id: string) {
    return prisma.feedback.delete({ where: { id } })
  },
}
