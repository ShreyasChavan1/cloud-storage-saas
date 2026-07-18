import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/database/prisma'

// These tests hit a real Postgres database via Prisma — point DATABASE_URL
// (in .env or CI env vars) at a disposable test database before running.
// `npm run prisma:migrate` must have been run against that database first.

const app = createApp()

const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'supersecret123',
}

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
})
