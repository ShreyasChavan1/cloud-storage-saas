const mockFindById = jest.fn()

jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { findById: mockFindById },
}))

import { requireAdmin } from '../src/middleware/admin.middleware'
import { Request, Response, NextFunction } from 'express'

function mockReq(sub = 'user-1'): Request {
  return { user: { sub, email: 'x@example.com' } } as unknown as Request
}

describe('requireAdmin', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls next() with an ApiError(401) if the user no longer exists', async () => {
    mockFindById.mockResolvedValue(null)
    const next = jest.fn() as unknown as NextFunction

    await requireAdmin(mockReq(), {} as Response, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  it('calls next() with an ApiError(403) for a non-admin user', async () => {
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'USER', status: 'ACTIVE' })
    const next = jest.fn() as unknown as NextFunction

    await requireAdmin(mockReq(), {} as Response, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  it('calls next() with an ApiError(403) for a suspended admin — status is checked before role grants anything', async () => {
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'ADMIN', status: 'SUSPENDED' })
    const next = jest.fn() as unknown as NextFunction

    await requireAdmin(mockReq(), {} as Response, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  it('calls next() with no arguments for an active admin', async () => {
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'ADMIN', status: 'ACTIVE' })
    const next = jest.fn() as unknown as NextFunction

    await requireAdmin(mockReq(), {} as Response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('never trusts a role/status embedded in the token itself — only req.user.sub is read from it', async () => {
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'ADMIN', status: 'ACTIVE' })
    const next = jest.fn() as unknown as NextFunction
    // AuthTokenPayload has no role/status field at all (see types/auth.types.ts)
    // — this just documents that requireAdmin's decision comes entirely
    // from the DB read, not from anything on req.user.
    const reqWithExtraClaim = {
      user: { sub: 'user-1', email: 'x@example.com', role: 'ADMIN' },
    } as unknown as Request

    await requireAdmin(reqWithExtraClaim, {} as Response, next)

    expect(mockFindById).toHaveBeenCalledWith('user-1')
    expect(next).toHaveBeenCalledWith()
  })
})
