import { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma'

// The author's name/email come from the account, not from the form.
const withAuthor = { user: { select: { name: true, email: true } } } satisfies Prisma.FeedbackInclude
export type FeedbackWithAuthor = Prisma.FeedbackGetPayload<{ include: typeof withAuthor }>

export const feedbackRepository = {
  create(data: Prisma.FeedbackCreateInput) {
    return prisma.feedback.create({ data })
  },

  findById(id: string) {
    return prisma.feedback.findUnique({ where: { id } })
  },

  findMany(params: { where?: Prisma.FeedbackWhereInput; skip?: number; take?: number }): Promise<FeedbackWithAuthor[]> {
    return prisma.feedback.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: withAuthor,
    })
  },

  // Candidates for the home page: well rated and written by a signed-in
  // user, newest first. The service trims this to one per person.
  findFeatured(minRating: number, take: number): Promise<FeedbackWithAuthor[]> {
    return prisma.feedback.findMany({
      where: { rating: { gte: minRating }, userId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take,
      include: withAuthor,
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
