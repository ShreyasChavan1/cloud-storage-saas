import { Prisma } from '@prisma/client'
import { feedbackRepository, FeedbackWithAuthor } from '../repositories/feedback.repository'
import { ApiError } from '../utils/ApiError'
import { SubmitFeedbackInput, ListFeedbackQuery } from '../validators/feedback.validator'

// Home page: the latest 6 reviews rated MORE than 3 stars (so 4 or 5).
export const FEATURED_COUNT = 6
export const FEATURED_MIN_RATING = 4
// Candidates fetched before keeping one per person. Generous, so a handful of
// repeat reviewers cannot push everyone else out of the window.
const FEATURED_POOL = 60
const FEATURED_TEXT_MAX = 280

export interface FeedbackDTO {
  id: string
  rating: number
  description: string
  // Account email (or the legacy stored one for pre-account entries).
  email: string | null
  userName: string | null
  createdAt: string
}

// What the PUBLIC home page gets: no email, no full name, no ids of people.
export interface FeaturedFeedbackDTO {
  id: string
  rating: number
  text: string
  name: string
}

function toDTO(f: FeedbackWithAuthor): FeedbackDTO {
  return {
    id: f.id,
    rating: f.rating,
    description: f.description,
    email: f.user?.email ?? f.email,
    userName: f.user?.name ?? null,
    createdAt: f.createdAt.toISOString(),
  }
}

// "Asha Kapoor" -> "Asha K."  — first name and last initial only, because
// this is shown to anyone who opens the home page.
export function publicDisplayName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DVT Solutions customer'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

// Keeps a long essay from taking over a review card.
export function truncateForDisplay(text: string, max = FEATURED_TEXT_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export const feedbackService = {
  async submit(userId: string, input: SubmitFeedbackInput): Promise<{ id: string }> {
    const created = await feedbackRepository.create({
      rating: input.rating,
      description: input.description,
      user: { connect: { id: userId } },
    })
    return { id: created.id }
  },

  // Public. At most one review per person, newest first.
  async featured(): Promise<FeaturedFeedbackDTO[]> {
    const rows = await feedbackRepository.findFeatured(FEATURED_MIN_RATING, FEATURED_POOL)
    const seen = new Set<string>()
    const out: FeaturedFeedbackDTO[] = []
    for (const row of rows) {
      if (!row.userId || seen.has(row.userId)) continue
      seen.add(row.userId)
      out.push({
        id: row.id,
        rating: row.rating,
        text: truncateForDisplay(row.description),
        name: publicDisplayName(row.user?.name),
      })
      if (out.length === FEATURED_COUNT) break
    }
    return out
  },

  async list(query: ListFeedbackQuery) {
    const where: Prisma.FeedbackWhereInput = {}
    if (query.rating) where.rating = query.rating
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
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
