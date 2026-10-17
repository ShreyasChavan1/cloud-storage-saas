import { Feedback, Prisma } from '@prisma/client'
import { feedbackRepository } from '../repositories/feedback.repository'
import { ApiError } from '../utils/ApiError'
import { SubmitFeedbackInput, ListFeedbackQuery } from '../validators/feedback.validator'

export interface FeedbackDTO {
  id: string
  rating: number
  description: string
  email: string | null
  createdAt: string
}

function toDTO(f: Feedback): FeedbackDTO {
  return {
    id: f.id,
    rating: f.rating,
    description: f.description,
    email: f.email,
    createdAt: f.createdAt.toISOString(),
  }
}

export const feedbackService = {
  async submit(input: SubmitFeedbackInput): Promise<{ id: string }> {
    const created = await feedbackRepository.create({
      rating: input.rating,
      description: input.description,
      // '' and undefined both mean "not provided" — stored as NULL.
      email: input.email ? input.email : null,
    })
    return { id: created.id }
  },

  async list(query: ListFeedbackQuery) {
    const where: Prisma.FeedbackWhereInput = {}
    if (query.rating) where.rating = query.rating
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    const skip = (query.page - 1) * query.limit
    const [rows, total, summary] = await Promise.all([
      feedbackRepository.findMany({ where, skip, take: query.limit }),
      feedbackRepository.count(where),
      feedbackRepository.summary(),
    ])
    const average = summary._avg.rating
    return {
      feedback: rows.map(toDTO),
      total,
      page: query.page,
      limit: query.limit,
      overallTotal: summary._count._all,
      // One decimal place is plenty for a headline number; null when empty.
      averageRating: average === null ? null : Math.round(average * 10) / 10,
    }
  },

  async remove(id: string): Promise<void> {
    const existing = await feedbackRepository.findById(id)
    if (!existing) throw ApiError.notFound('Feedback not found')
    await feedbackRepository.delete(id)
  },
}
