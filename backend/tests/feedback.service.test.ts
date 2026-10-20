const mockCreate = jest.fn()
const mockFindById = jest.fn()
const mockFindMany = jest.fn()
const mockFindFeatured = jest.fn()
const mockCount = jest.fn()
const mockSummary = jest.fn()
const mockDelete = jest.fn()
jest.mock('../src/repositories/feedback.repository', () => ({
  feedbackRepository: {
    create: mockCreate,
    findById: mockFindById,
    findMany: mockFindMany,
    findFeatured: mockFindFeatured,
    count: mockCount,
    summary: mockSummary,
    delete: mockDelete,
  },
}))

import { feedbackService, publicDisplayName, truncateForDisplay, FEATURED_COUNT, FEATURED_MIN_RATING } from '../src/services/feedback.service'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  rating: 4,
  description: 'Nice',
  email: null,
  userId: 'u1',
  user: { name: 'Asha Kapoor', email: 'asha@example.com' },
  createdAt: new Date('2026-10-16T10:00:00.000Z'),
  ...over,
})

describe('feedbackService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('links the feedback to the signed-in user', async () => {
    mockCreate.mockResolvedValue({ id: 'f9' })
    const result = await feedbackService.submit('u1', { rating: 5, description: 'Great' })
    expect(mockCreate).toHaveBeenCalledWith({ rating: 5, description: 'Great', user: { connect: { id: 'u1' } } })
    expect(result).toEqual({ id: 'f9' })
  })

  it('lists with filters, paging, the author, and a rounded overall average', async () => {
    mockFindMany.mockResolvedValue([row()])
    mockCount.mockResolvedValue(1)
    mockSummary.mockResolvedValue({ _avg: { rating: 4.3333 }, _count: { _all: 12 } })

    const result = await feedbackService.list({ page: 2, limit: 5, rating: 4, search: 'nice' })

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        rating: 4,
        OR: [
          { description: { contains: 'nice', mode: 'insensitive' } },
          { email: { contains: 'nice', mode: 'insensitive' } },
          { user: { name: { contains: 'nice', mode: 'insensitive' } } },
          { user: { email: { contains: 'nice', mode: 'insensitive' } } },
        ],
      },
      skip: 5,
      take: 5,
    })
    expect(result).toMatchObject({ total: 1, page: 2, limit: 5, overallTotal: 12, averageRating: 4.3 })
    expect(result.feedback[0]).toEqual({
      id: 'f1',
      rating: 4,
      description: 'Nice',
      email: 'asha@example.com',
      userName: 'Asha Kapoor',
      createdAt: '2026-10-16T10:00:00.000Z',
    })
  })

  it('falls back to the stored email for older entries that have no account', async () => {
    mockFindMany.mockResolvedValue([row({ user: null, userId: null, email: 'old@example.com' })])
    mockCount.mockResolvedValue(1)
    mockSummary.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } })
    const result = await feedbackService.list({ page: 1, limit: 20 })
    expect(result.feedback[0]).toMatchObject({ email: 'old@example.com', userName: null })
  })

  it('reports a null average when there is no feedback yet', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    mockSummary.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } })
    const result = await feedbackService.list({ page: 1, limit: 20 })
    expect(result.averageRating).toBeNull()
  })

  it('deletes an existing entry and 404s on a missing one', async () => {
    mockFindById.mockResolvedValueOnce(row())
    await feedbackService.remove('f1')
    expect(mockDelete).toHaveBeenCalledWith('f1')

    mockFindById.mockResolvedValueOnce(null)
    await expect(feedbackService.remove('nope')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('feedbackService.featured (home page)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('asks only for reviews rated more than 3 stars', async () => {
    mockFindFeatured.mockResolvedValue([])
    await feedbackService.featured()
    expect(FEATURED_MIN_RATING).toBe(4)
    expect(mockFindFeatured).toHaveBeenCalledWith(4, expect.any(Number))
  })

  it('returns at most 6, newest first, with only a first name and last initial', async () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      row({ id: `f${i}`, userId: `u${i}`, user: { name: `Person${i} Surname`, email: `p${i}@x.com` } })
    )
    mockFindFeatured.mockResolvedValue(many)
    const result = await feedbackService.featured()
    expect(result).toHaveLength(FEATURED_COUNT)
    expect(result.map((r) => r.id)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5'])
    expect(result[0]).toEqual({ id: 'f0', rating: 4, text: 'Nice', name: 'Person0 S.' })
    expect(JSON.stringify(result)).not.toContain('@')
  })

  it('shows only one review per person so nobody can fill the whole row', async () => {
    mockFindFeatured.mockResolvedValue([
      row({ id: 'a1', userId: 'same' }),
      row({ id: 'a2', userId: 'same' }),
      row({ id: 'a3', userId: 'same' }),
      row({ id: 'b1', userId: 'other', user: { name: 'Ravi Shah', email: 'r@x.com' } }),
    ])
    const result = await feedbackService.featured()
    expect(result.map((r) => r.id)).toEqual(['a1', 'b1'])
  })

  it('never shows entries that have no account', async () => {
    mockFindFeatured.mockResolvedValue([row({ id: 'anon', userId: null, user: null })])
    expect(await feedbackService.featured()).toEqual([])
  })
})

describe('display helpers', () => {
  it('shortens names to first name + last initial', () => {
    expect(publicDisplayName('Asha Kapoor')).toBe('Asha K.')
    expect(publicDisplayName('  Asha   Devi  kapoor ')).toBe('Asha K.')
    expect(publicDisplayName('Asha')).toBe('Asha')
    expect(publicDisplayName('')).toBe('DVT Solutions customer')
    expect(publicDisplayName(null)).toBe('DVT Solutions customer')
  })

  it('truncates long text on a word boundary and leaves short text alone', () => {
    expect(truncateForDisplay('short and sweet')).toBe('short and sweet')
    const long = 'word '.repeat(200)
    const out = truncateForDisplay(long, 100)
    expect(out.length).toBeLessThanOrEqual(101)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/wor…$/)
  })
})
