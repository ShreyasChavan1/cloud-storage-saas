const mockCreate = jest.fn()
const mockFindById = jest.fn()
const mockFindMany = jest.fn()
const mockCount = jest.fn()
const mockSummary = jest.fn()
const mockDelete = jest.fn()
jest.mock('../src/repositories/feedback.repository', () => ({
  feedbackRepository: {
    create: mockCreate,
    findById: mockFindById,
    findMany: mockFindMany,
    count: mockCount,
    summary: mockSummary,
    delete: mockDelete,
  },
}))

import { feedbackService } from '../src/services/feedback.service'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  rating: 4,
  description: 'Nice',
  email: null,
  createdAt: new Date('2026-10-16T10:00:00.000Z'),
  ...over,
})

describe('feedbackService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('stores a blank email as NULL', async () => {
    mockCreate.mockResolvedValue(row())
    await feedbackService.submit({ rating: 4, description: 'Nice', email: '' })
    expect(mockCreate).toHaveBeenCalledWith({ rating: 4, description: 'Nice', email: null })
  })

  it('keeps a provided email', async () => {
    mockCreate.mockResolvedValue(row())
    await feedbackService.submit({ rating: 5, description: 'Great', email: 'a@b.co' })
    expect(mockCreate).toHaveBeenCalledWith({ rating: 5, description: 'Great', email: 'a@b.co' })
  })

  it('lists with filters, paging and a rounded overall average', async () => {
    mockFindMany.mockResolvedValue([row({ email: 'a@b.co' })])
    mockCount.mockResolvedValue(1)
    mockSummary.mockResolvedValue({ _avg: { rating: 4.3333 }, _count: { _all: 12 } })

    const result = await feedbackService.list({ page: 2, limit: 5, rating: 4, search: 'nice' })

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        rating: 4,
        OR: [
          { description: { contains: 'nice', mode: 'insensitive' } },
          { email: { contains: 'nice', mode: 'insensitive' } },
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
      email: 'a@b.co',
      createdAt: '2026-10-16T10:00:00.000Z',
    })
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
