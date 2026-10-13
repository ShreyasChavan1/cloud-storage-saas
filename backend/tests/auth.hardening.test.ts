/**
 * Unit tests for the auth hardening: refresh-token reuse detection, atomic
 * single-use tokens, no secrets in responses, login timing equalisation, and
 * the decoupling of Nextcloud credentials from the user's password.
 */
const mockUser = {
  findByEmail: jest.fn(), findById: jest.fn(), update: jest.fn(), revokeAccessTokens: jest.fn(),
}
const mockSession = {
  create: jest.fn(), findAnyUnexpiredByHash: jest.fn(), markRotated: jest.fn(),
  deleteByHash: jest.fn(), deleteAllForUser: jest.fn(),
}
const mockReset = { create: jest.fn(), deleteAllForUserExcept: jest.fn(), consumeByHash: jest.fn() }
const mockVerify = { create: jest.fn(), deleteAllForUserExcept: jest.fn(), consumeByHash: jest.fn() }
const mockNextcloud = { changePassword: jest.fn(), setEmail: jest.fn(), createUser: jest.fn() }
const mockSendReset = jest.fn()
const mockComparePassword = jest.fn()
const mockHashPassword = jest.fn(async () => 'hashed')

jest.mock('../src/repositories/user.repository', () => ({ userRepository: mockUser }))
jest.mock('../src/repositories/session.repository', () => ({ sessionRepository: mockSession }))
jest.mock('../src/repositories/passwordResetToken.repository', () => ({ passwordResetTokenRepository: mockReset }))
jest.mock('../src/repositories/emailVerificationToken.repository', () => ({ emailVerificationTokenRepository: mockVerify }))
jest.mock('../src/services/NextcloudService', () => ({ nextcloudService: mockNextcloud, NextcloudApiError: class extends Error {} }))
jest.mock('../src/services/userProvisioning.service', () => ({ provisionUser: jest.fn() }))
jest.mock('../src/services/email.service', () => ({ sendPasswordResetEmail: mockSendReset, sendEmailVerificationEmail: jest.fn() }))
jest.mock('../src/utils/password', () => ({ hashPassword: mockHashPassword, comparePassword: mockComparePassword }))
jest.mock('../src/models/user.model', () => ({ toAuthUserDTO: (u: { id: string }) => ({ id: u.id }) }))

import { authService } from '../src/services/auth.service'
import { signRefreshToken, hashToken } from '../src/utils/jwt'
import { generateStorageSecret } from '../src/utils/token'

const activeUser = { id: 'u1', email: 'u1@example.com', status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: 'h', nextcloudUsername: 'nc-u1' }

function freshRefreshToken(userId = 'u1') {
  return signRefreshToken({ sub: userId, email: 'u1@example.com' }).token
}
const sessionRow = (over: object = {}) => ({ id: 's1', userId: 'u1', rotatedAt: null, ...over })

beforeEach(() => {
  jest.clearAllMocks()
  mockUser.findById.mockResolvedValue(activeUser)
  mockSession.markRotated.mockResolvedValue(true)
})

describe('refresh-token rotation and reuse detection', () => {
  it('rotates a valid token: marks it rotated and issues a new pair', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow())
    const out = await authService.refresh(freshRefreshToken())
    expect(mockSession.markRotated).toHaveBeenCalledWith('s1')
    expect(mockSession.create).toHaveBeenCalledTimes(1)
    expect(out.accessToken).toBeTruthy()
    expect(out.refreshToken).toBeTruthy()
  })

  it('treats a replay of an already-rotated token as theft: revokes ALL sessions and access tokens', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow({ rotatedAt: new Date(Date.now() - 60_000) }))
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockSession.deleteAllForUser).toHaveBeenCalledWith('u1')
    expect(mockUser.revokeAccessTokens).toHaveBeenCalledWith('u1')
    expect(mockSession.create).not.toHaveBeenCalled()
  })

  it('does NOT nuke sessions for a benign race inside the grace window (two tabs, a retry)', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow({ rotatedAt: new Date(Date.now() - 2_000) }))
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockSession.deleteAllForUser).not.toHaveBeenCalled()
    expect(mockUser.revokeAccessTokens).not.toHaveBeenCalled()
  })

  it('lets exactly one of two concurrent requests win the rotation', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow())
    mockSession.markRotated.mockResolvedValue(false) // another request claimed it first
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockSession.create).not.toHaveBeenCalled()
  })

  it('rejects a token whose stored session belongs to a different user', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow({ userId: 'someone-else' }))
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockSession.markRotated).not.toHaveBeenCalled()
  })

  it('rejects an unknown or garbage token', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(null)
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 401 })
    await expect(authService.refresh('not-a-jwt')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('refuses to refresh for a suspended account and drops the session', async () => {
    mockSession.findAnyUnexpiredByHash.mockResolvedValue(sessionRow())
    mockUser.findById.mockResolvedValue({ ...activeUser, status: 'SUSPENDED' })
    await expect(authService.refresh(freshRefreshToken())).rejects.toMatchObject({ statusCode: 403 })
    expect(mockSession.deleteByHash).toHaveBeenCalled()
    expect(mockSession.create).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  it('still runs a password comparison when the email is unknown (no timing oracle)', async () => {
    mockUser.findByEmail.mockResolvedValue(null)
    mockComparePassword.mockResolvedValue(false)
    await expect(authService.login({ email: 'ghost@example.com', password: 'x' })).rejects.toMatchObject({
      statusCode: 401, message: 'Invalid email or password',
    })
    expect(mockComparePassword).toHaveBeenCalledTimes(1)
  })
})

describe('forgot password', () => {
  it('returns nothing (no token ever leaves the service) and emails a link for a real user', async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    const out = await authService.forgotPassword({ email: 'u1@example.com' })
    expect(out).toBeUndefined()
    expect(mockSendReset).toHaveBeenCalledTimes(1)
    expect(mockSendReset.mock.calls[0][1]).toMatch(/token=/)
  })

  it('does nothing observable for an unknown email', async () => {
    mockUser.findByEmail.mockResolvedValue(null)
    await expect(authService.forgotPassword({ email: 'ghost@example.com' })).resolves.toBeUndefined()
    expect(mockReset.create).not.toHaveBeenCalled()
    expect(mockSendReset).not.toHaveBeenCalled()
  })

  it('does not fail (and so does not leak) when the mail provider is down', async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockSendReset.mockRejectedValueOnce(new Error('resend 500'))
    await expect(authService.forgotPassword({ email: 'u1@example.com' })).resolves.toBeUndefined()
  })
})

describe('reset password', () => {
  it('rejects an invalid, expired or already-used token and changes nothing', async () => {
    mockReset.consumeByHash.mockResolvedValue(null)
    await expect(authService.resetPassword('bad', 'NewPassw0rd')).rejects.toMatchObject({ statusCode: 400 })
    expect(mockUser.update).not.toHaveBeenCalled()
    expect(mockSession.deleteAllForUser).not.toHaveBeenCalled()
  })

  it('claims the token by its hash, updates the hash, revokes every session and access token', async () => {
    mockReset.consumeByHash.mockResolvedValue({ userId: 'u1' })
    await authService.resetPassword('raw-token', 'NewPassw0rd')
    expect(mockReset.consumeByHash).toHaveBeenCalledWith(hashToken('raw-token'))
    expect(mockUser.update).toHaveBeenCalledWith('u1', expect.objectContaining({ passwordHash: 'hashed' }))
    expect(mockSession.deleteAllForUser).toHaveBeenCalledWith('u1')
    expect(mockUser.revokeAccessTokens).toHaveBeenCalledWith('u1')
  })

  it('never sends the new password to Nextcloud', async () => {
    mockReset.consumeByHash.mockResolvedValue({ userId: 'u1' })
    await authService.resetPassword('raw-token', 'NewPassw0rd')
    expect(mockNextcloud.changePassword).not.toHaveBeenCalled()
  })
})

describe('change password', () => {
  it('rejects a wrong current password without touching anything', async () => {
    mockComparePassword.mockResolvedValue(false)
    await expect(authService.changePassword('u1', 'wrong', 'NewPassw0rd')).rejects.toMatchObject({ statusCode: 401 })
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it('on success revokes access, and never involves Nextcloud', async () => {
    mockComparePassword.mockResolvedValue(true)
    await authService.changePassword('u1', 'old', 'NewPassw0rd')
    expect(mockUser.revokeAccessTokens).toHaveBeenCalledWith('u1')
    expect(mockSession.deleteAllForUser).toHaveBeenCalledWith('u1')
    expect(mockNextcloud.changePassword).not.toHaveBeenCalled()
  })
})

describe('email verification link', () => {
  it('cannot be used to sign in a suspended account', async () => {
    mockVerify.consumeByHash.mockResolvedValue({ userId: 'u1' })
    mockUser.findById.mockResolvedValue({ ...activeUser, status: 'SUSPENDED' })
    await expect(authService.verifyEmail('t')).rejects.toMatchObject({ statusCode: 403 })
    expect(mockSession.create).not.toHaveBeenCalled()
  })

  it('rejects a token that was already consumed (atomic single use)', async () => {
    mockVerify.consumeByHash.mockResolvedValue(null)
    await expect(authService.verifyEmail('t')).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('storage credential repair', () => {
  it('mints a random Nextcloud secret, never the user password', async () => {
    mockComparePassword.mockResolvedValue(true)
    mockNextcloud.changePassword.mockResolvedValue({ webdavPassword: 'dav-new' })
    await authService.repairWebdavPassword('u1', 'my-real-password-1')
    const [, sentSecret] = mockNextcloud.changePassword.mock.calls[0]
    expect(sentSecret).not.toBe('my-real-password-1')
    expect(sentSecret.length).toBeGreaterThanOrEqual(40)
  })
})

describe('generateStorageSecret', () => {
  it('is long, unique per call and satisfies all character classes', () => {
    const a = generateStorageSecret()
    expect(a).not.toBe(generateStorageSecret())
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/[a-z]/); expect(a).toMatch(/[A-Z]/); expect(a).toMatch(/\d/); expect(a).toMatch(/[^A-Za-z0-9]/)
  })
})
