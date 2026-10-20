import request from 'supertest'

const mockCreateUser = jest.fn()
const mockChangePassword = jest.fn()

jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return {
    ...actual,
    nextcloudService: {
      ...actual.nextcloudService,
      createUser: mockCreateUser,
      changePassword: mockChangePassword,
    },
  }
})

import { createApp } from '../src/app'
import { prisma } from '../src/database/prisma'
import { hashToken } from '../src/utils/jwt'
import { generateRandomToken } from '../src/utils/token'
import { CURRENT_AGREEMENT_VERSION } from '../src/config/agreement'

// This is a real Postgres integration suite; allow for a cold database connection.
jest.setTimeout(30000)

// These tests hit a real Postgres database via Prisma — point DATABASE_URL
// (in .env or CI env vars) at a disposable test database before running.
// `npm run prisma:migrate` must have been run against that database first.

const app = createApp()

// Tokens are minted straight into the database: the API (rightly) never
// returns them in a response, so a test has to play the part of the inbox.
async function mintToken(kind: 'verify' | 'reset', userId: string): Promise<string> {
  const raw = generateRandomToken()
  const data = { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  if (kind === 'verify') await prisma.emailVerificationToken.create({ data })
  else await prisma.passwordResetToken.create({ data })
  return raw
}

const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  phoneNumber: '+919876543210',
  password: 'TestPassword123!',
  acceptedAgreement: true,
  agreementVersion: CURRENT_AGREEMENT_VERSION,
}

beforeAll(() => {
  mockCreateUser.mockResolvedValue({ webdavPassword: 'test-webdav-password' })
  mockChangePassword.mockResolvedValue({ webdavPassword: 'rotated-webdav-password' })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } })
  await prisma.$disconnect()
})

describe('Auth flow', () => {
  let accessToken: string
  let verificationToken: string

  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
    expect(res.body.data.user.avatarInitials).toBe('TU')
    expect(res.body.data.verificationRequired).toBe(true)
    // The response must never carry a token — it only ever travels by email.
    expect(JSON.stringify(res.body)).not.toMatch(/devToken|token/i)
    const created = await prisma.user.findUnique({ where: { email: testUser.email } })
    verificationToken = await mintToken('verify', created!.id)
  })

  it('records the agreement acceptance for the new account', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: { agreementAcceptances: true },
    })
    expect(user?.agreementAcceptances).toHaveLength(1)
    expect(user?.agreementAcceptances[0]).toMatchObject({
      agreementVersion: CURRENT_AGREEMENT_VERSION,
      email: testUser.email,
      event: 'REGISTRATION',
    })
  })

  it('verifies the email before login is allowed', async () => {
    expect(verificationToken).toBeDefined()
    const res = await request(app).post('/api/auth/verify-email').send({ token: verificationToken })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user.emailVerified).toBe(true)
  })

  it('rejects registration when the agreement is not accepted', async () => {
    const { acceptedAgreement: _omit, ...withoutAcceptance } = testUser
    const missing = await request(app)
      .post('/api/auth/register')
      .send({ ...withoutAcceptance, email: `no-accept-${Date.now()}@example.com` })
    expect(missing.status).toBe(400)

    const declined = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, acceptedAgreement: false, email: `declined-${Date.now()}@example.com` })
    expect(declined.status).toBe(400)
  })

  it('rejects registration against a stale agreement version', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, agreementVersion: '0.9', email: `stale-${Date.now()}@example.com` })
    expect(res.status).toBe(400)
  })

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser)
    expect(res.status).toBe(409)
  })

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
    accessToken = res.body.data.accessToken
  })

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrong-password' })

    expect(res.status).toBe(401)
  })

  it('returns the current user for a valid access token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(testUser.email)
  })

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('issues a reset token for a known email (dev mode)', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: testUser.email })

    expect(res.status).toBe(200)
    expect(res.body.data.message).toMatch(/if an account exists/i)
    // The reset token is only ever emailed, never returned.
    expect(res.body.data.devToken).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/token/i)
  })

  it('returns the same generic message for an unknown email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'definitely-not-registered@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.data.message).toMatch(/if an account exists/i)
    expect(res.body.data.devToken).toBeUndefined()
  })


  // Suspension (Phase 10) is set directly via Prisma here rather than
  // through the admin API — this file is about auth's own behavior, not
  // re-testing adminService.setUserStatus (see admin.service.test.ts for
  // that, and admin.middleware.test.ts for who's allowed to call it).
  it('rejects login for a suspended account, even with the correct password', async () => {
    await prisma.user.update({ where: { email: testUser.email }, data: { status: 'SUSPENDED' } })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })

    expect(res.status).toBe(403)
    expect(res.body.error.message).toMatch(/suspended/i)
  })

  it('rejects a refresh attempt for an account suspended after the session was issued, and deletes the presented session', async () => {
    // Reactivate and log in fresh so there's a valid refresh cookie to
    // present, mirroring a real "was fine, got suspended mid-session" case.
    await prisma.user.update({ where: { email: testUser.email }, data: { status: 'ACTIVE' } })
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
    const cookie = loginRes.headers['set-cookie']

    await prisma.user.update({ where: { email: testUser.email }, data: { status: 'SUSPENDED' } })

    const refreshRes = await request(app).post('/api/auth/refresh-token').set('Cookie', cookie)
    expect(refreshRes.status).toBe(403)

    // And the now-deleted session can't be replayed even after
    // reactivating — refresh tokens rotate/delete on use, suspended or not.
    await prisma.user.update({ where: { email: testUser.email }, data: { status: 'ACTIVE' } })
    const replayRes = await request(app).post('/api/auth/refresh-token').set('Cookie', cookie)
    expect(replayRes.status).toBe(401)
  })

  it('resets the password without touching Nextcloud, and revokes every existing session', async () => {
    const userBefore = await prisma.user.findUnique({ where: { email: testUser.email } })
    expect(userBefore).toBeTruthy()
    mockChangePassword.mockClear()

    // Log in first so there is a live session and access token to be revoked.
    const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password })
    expect(loginRes.status).toBe(200)
    const oldAccessToken = loginRes.body.data.accessToken
    const oldCookie = loginRes.headers['set-cookie']

    const rawToken = await mintToken('reset', userBefore!.id)
    const resetRes = await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'ResetPassword123!' })
    expect(resetRes.status).toBe(200)

    // Nextcloud credentials are independent random secrets now.
    expect(mockChangePassword).not.toHaveBeenCalled()

    const updated = await prisma.user.findUnique({ where: { email: testUser.email } })
    expect(updated?.passwordHash).not.toBe(userBefore?.passwordHash)
    expect(updated?.nextcloudWebdavPasswordEncrypted).toBe(userBefore?.nextcloudWebdavPasswordEncrypted)

    // Token is single use.
    const replay = await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'AnotherPassword123!' })
    expect(replay.status).toBe(400)

    // The pre-reset access token and refresh cookie are both dead.
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldAccessToken}`)).status).toBe(401)
    expect((await request(app).post('/api/auth/refresh-token').set('Cookie', oldCookie)).status).toBe(401)

    // Old password no longer works; the new one does.
    expect((await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password })).status).toBe(401)
    expect((await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'ResetPassword123!' })).status).toBe(200)
  })

  it('detects refresh-token reuse and revokes the whole session family', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'ResetPassword123!' })
    const stolenCookie = loginRes.headers['set-cookie']

    // Legitimate rotation consumes the cookie...
    const rotated = await request(app).post('/api/auth/refresh-token').set('Cookie', stolenCookie)
    expect(rotated.status).toBe(200)
    const newCookie = rotated.headers['set-cookie']

    // ...age the rotation past the grace window, then replay the old cookie.
    await prisma.session.updateMany({ where: { rotatedAt: { not: null } }, data: { rotatedAt: new Date(Date.now() - 60_000) } })
    const replay = await request(app).post('/api/auth/refresh-token').set('Cookie', stolenCookie)
    expect(replay.status).toBe(401)

    // The victim's freshly rotated cookie is revoked too.
    const afterTheft = await request(app).post('/api/auth/refresh-token').set('Cookie', newCookie)
    expect(afterTheft.status).toBe(401)
  })
})
