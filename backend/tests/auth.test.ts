import request from 'supertest'

const mockCreateUser = jest.fn()

jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return {
    ...actual,
    nextcloudService: {
      ...actual.nextcloudService,
      createUser: mockCreateUser,
    },
  }
})

import { createApp } from '../src/app'
import { prisma } from '../src/database/prisma'

// This suite uses a real Postgres database. The first Prisma query can be slow
// when the test database/serverless connection is cold, so allow enough time
// for the integration test without depending on remote Nextcloud latency.
jest.setTimeout(30000)

// These tests hit a real Postgres database via Prisma — point DATABASE_URL
// (in .env or CI env vars) at a disposable test database before running.
// `npm run prisma:migrate` must have been run against that database first.

const app = createApp()

const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
}

beforeAll(() => {
  mockCreateUser.mockResolvedValue({ webdavPassword: 'test-webdav-password' })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } })
  await prisma.$disconnect()
})

describe('Auth flow', () => {
  let accessToken: string

  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
    expect(res.body.data.user.avatarInitials).toBe('TU')
    expect(res.body.data.accessToken).toBeDefined()
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
    // devToken only present outside production — this suite runs with NODE_ENV=test
    expect(res.body.data.devToken).toBeDefined()
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
})
