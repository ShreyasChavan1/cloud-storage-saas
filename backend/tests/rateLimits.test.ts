import express from 'express'
import request from 'supertest'
import {
  loginAccountRateLimiter, emailActionRateLimiter, publicShareRateLimiter, sensitiveActionRateLimiter,
} from '../src/middleware/rateLimiter.middleware'

function appWith(route: string, limiter: express.RequestHandler, status = 401) {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())
  app.post(route, limiter, (_req, res) => res.status(status).json({}))
  return app
}
const post = (app: express.Express, url: string, ip: string, body: object = {}) =>
  request(app).post(url).set('X-Forwarded-For', ip).send(body)

describe('per-account login limiter', () => {
  it('counts failures against one email across DIFFERENT IPs, then returns 429', async () => {
    const app = appWith('/login', loginAccountRateLimiter)
    for (let i = 0; i < 10; i++) {
      expect((await post(app, '/login', `10.0.0.${i}`, { email: 'victim@example.com' })).status).toBe(401)
    }
    expect((await post(app, '/login', '10.0.0.99', { email: 'victim@example.com' })).status).toBe(429)
  })

  it('treats case and whitespace variants as the same account', async () => {
    const app = appWith('/login', loginAccountRateLimiter)
    for (let i = 0; i < 10; i++) await post(app, '/login', '10.1.0.1', { email: i % 2 ? ' ALICE@example.com ' : 'alice@example.com' })
    expect((await post(app, '/login', '10.1.0.2', { email: 'Alice@Example.com' })).status).toBe(429)
  })

  it('does not penalise other accounts', async () => {
    const app = appWith('/login', loginAccountRateLimiter)
    for (let i = 0; i < 11; i++) await post(app, '/login', '10.2.0.1', { email: 'locked@example.com' })
    expect((await post(app, '/login', '10.2.0.1', { email: 'other@example.com' })).status).toBe(401)
  })

  it('does not count successful logins', async () => {
    const app = appWith('/login', loginAccountRateLimiter, 200)
    for (let i = 0; i < 25; i++) expect((await post(app, '/login', '10.3.0.1', { email: 'ok@example.com' })).status).toBe(200)
  })
})

describe('per-address email-sending limiter', () => {
  it('allows 3 reset/verification emails per address per hour, from any IP', async () => {
    const app = appWith('/forgot', emailActionRateLimiter, 200)
    for (let i = 0; i < 3; i++) expect((await post(app, '/forgot', `10.4.0.${i}`, { email: 'x@example.com' })).status).toBe(200)
    expect((await post(app, '/forgot', '10.4.0.50', { email: 'x@example.com' })).status).toBe(429)
  })
})

describe('public share password limiter', () => {
  it('stops password guessing on one link from one client, but not other links or clients', async () => {
    const app = appWith('/public/:token/download', publicShareRateLimiter)
    for (let i = 0; i < 10; i++) expect((await post(app, '/public/tokA/download', '10.5.0.1')).status).toBe(401)
    expect((await post(app, '/public/tokA/download', '10.5.0.1')).status).toBe(429)
    expect((await post(app, '/public/tokB/download', '10.5.0.1')).status).toBe(401)
    expect((await post(app, '/public/tokA/download', '10.5.0.2')).status).toBe(401)
  })
})

describe('per-user sensitive-action limiter', () => {
  it('is keyed by user id, so changing IP does not reset it', async () => {
    const app = express()
    app.set('trust proxy', 1)
    app.post('/danger', (req, _res, next) => { (req as any).user = { sub: 'user-1' }; next() }, sensitiveActionRateLimiter, (_req, res) => res.status(200).json({}))
    for (let i = 0; i < 5; i++) expect((await post(app, '/danger', `10.6.0.${i}`)).status).toBe(200)
    expect((await post(app, '/danger', '10.6.0.200')).status).toBe(429)
  })
})
