/**
 * Cross-tenant (IDOR) and token-handling tests, run against the real Express
 * app over HTTP. Only the edges are mocked: the user table, Prisma, and the
 * WebDAV client. So what is verified is the real middleware chain, validators,
 * controllers and services deciding WHOSE credentials and WHICH paths reach
 * storage.
 *
 * Two users, A and B. Everything below is performed as A.
 */
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { encrypt } from '../src/utils/encryption'

const A = { id: 'user-a', nc: 'nc-a', pw: 'dav-pass-a' }
const B = { id: 'user-b', nc: 'nc-b', pw: 'dav-pass-b' }

type AuthState = { id: string; status: string; emailVerifiedAt: Date | null; tokensValidAfter: Date | null }
const authStates: Record<string, AuthState | null> = {}
const mockFindAuthState = jest.fn(async (id: string) => authStates[id] ?? null)

function userRow(u: typeof A) {
  return {
    id: u.id, nextcloudUsername: u.nc, nextcloudWebdavPasswordEncrypted: encrypt(u.pw),
    role: 'USER', status: 'ACTIVE', email: `${u.id}@example.com`, name: u.id, plan: null,
  }
}
const mockFindById = jest.fn(async (id: string) => (id === A.id ? userRow(A) : id === B.id ? userRow(B) : null))

jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { findAuthState: mockFindAuthState, findById: mockFindById },
}))

const mockShareFindFirst = jest.fn().mockResolvedValue(null)
jest.mock('../src/database/prisma', () => ({
  prisma: { share: { findFirst: mockShareFindFirst, findMany: jest.fn().mockResolvedValue([]) } },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}))

jest.mock('../src/repositories/favorite.repository', () => ({
  favoriteRepository: { findPathsByUser: jest.fn().mockResolvedValue([]) },
}))

const dav = {
  listDirectory: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
  downloadStream: jest.fn(),
  deleteItem: jest.fn(),
  move: jest.fn(),
  copy: jest.fn(),
  createFolder: jest.fn(),
  listTrash: jest.fn().mockResolvedValue([]),
  restoreTrashItem: jest.fn(),
  deleteTrashItem: jest.fn(),
}
jest.mock('../src/services/WebDavService', () => ({
  ...jest.requireActual('../src/services/WebDavService'),
  webDavService: dav,
}))

import { createApp } from '../src/app'
import { signAccessToken } from '../src/utils/jwt'

const app = createApp()
const bearer = (id: string) => `Bearer ${signAccessToken({ sub: id, email: `${id}@example.com` })}`
const verified = (id: string, extra: Partial<AuthState> = {}): AuthState =>
  ({ id, status: 'ACTIVE', emailVerifiedAt: new Date(), tokensValidAfter: null, ...extra })

beforeEach(() => {
  authStates[A.id] = verified(A.id)
  authStates[B.id] = verified(B.id)
  jest.clearAllMocks()
  dav.listDirectory.mockResolvedValue([])
  dav.stat.mockResolvedValue({ filename: '/docs', basename: 'docs', lastmod: 'Mon, 21 Jul 2026 12:00:00 GMT', size: 0, type: 'directory', etag: 'e' })
  mockShareFindFirst.mockResolvedValue(null)
})

const allDavCalls = () => Object.values(dav).flatMap((fn) => fn.mock.calls)

describe('every protected route requires a token', () => {
  const routes: Array<[string, string]> = [
    ['get', '/api/files'], ['get', '/api/files/download?path=/x'], ['get', '/api/files/preview?path=/x'],
    ['delete', '/api/files?path=/x'], ['post', '/api/files/move'], ['post', '/api/files/copy'],
    ['get', '/api/files/trash'], ['delete', '/api/files/trash'], ['get', '/api/shares'],
    ['delete', '/api/shares/some-id'], ['get', '/api/users/me'], ['delete', '/api/users/me'],
  ]
  it.each(routes)('%s %s -> 401 without a token', async (method, url) => {
    const res = await (request(app) as any)[method](url)
    expect(res.status).toBe(401)
    expect(allDavCalls()).toHaveLength(0)
  })
})

describe('identity comes only from the verified token', () => {
  it("uses A's own storage credentials for A's request", async () => {
    await request(app).get('/api/files').query({ path: '/' }).set('Authorization', bearer(A.id)).expect(200)
    expect(dav.listDirectory).toHaveBeenCalledWith(A.nc, A.pw, '/')
  })

  it('ignores userId / nextcloudUsername supplied in query, headers or body', async () => {
    await request(app)
      .get('/api/files')
      .query({ path: '/', userId: B.id, ownerId: B.id, nextcloudUsername: B.nc })
      .set('Authorization', bearer(A.id))
      .set('x-user-id', B.id)
      .set('x-nextcloud-username', B.nc)
      .expect(200)

    expect(dav.listDirectory).toHaveBeenCalledTimes(1)
    const [username, password] = dav.listDirectory.mock.calls[0]
    expect([username, password]).toEqual([A.nc, A.pw])
    expect(JSON.stringify(allDavCalls())).not.toContain(B.nc)
    expect(JSON.stringify(allDavCalls())).not.toContain(B.pw)
  })

  it('never lets a body-supplied owner reach a mutating route', async () => {
    await request(app)
      .post('/api/files/folder')
      .set('Authorization', bearer(A.id))
      .send({ path: '/', name: 'docs', userId: B.id, nextcloudUsername: B.nc })
      .expect((r) => expect(r.status).toBeLessThan(500))
    for (const call of dav.createFolder.mock.calls) expect(call.slice(0, 2)).toEqual([A.nc, A.pw])
    expect(JSON.stringify(allDavCalls())).not.toContain(B.nc)
  })
})

describe('path traversal cannot reach another tenant', () => {
  const attempts = ['../nc-b', '../../nc-b/secret.txt', '/a/../../nc-b', '..\\nc-b', '/files/nc-b/../x']

  it.each(attempts)('list %j is rejected before WebDAV is called', async (p) => {
    const res = await request(app).get('/api/files').query({ path: p }).set('Authorization', bearer(A.id))
    expect(res.status).toBe(400)
    expect(dav.listDirectory).not.toHaveBeenCalled()
  })

  it.each(attempts)('download %j is rejected before WebDAV is called', async (p) => {
    const res = await request(app).get('/api/files/download').query({ path: p }).set('Authorization', bearer(A.id))
    expect(res.status).toBe(400)
    expect(dav.stat).not.toHaveBeenCalled()
    expect(dav.downloadStream).not.toHaveBeenCalled()
  })

  it('rejects traversal in move destination and delete', async () => {
    const mv = await request(app).post('/api/files/move').set('Authorization', bearer(A.id)).send({ from: '/a.txt', to: '../../nc-b/a.txt' })
    expect(mv.status).toBe(400)
    const del = await request(app).delete('/api/files').query({ path: '../nc-b/x' }).set('Authorization', bearer(A.id))
    expect(del.status).toBe(400)
    expect(dav.move).not.toHaveBeenCalled()
    expect(dav.deleteItem).not.toHaveBeenCalled()
  })

  it('treats percent-encoded traversal as literal text and never sends ".." to WebDAV', async () => {
    await request(app).get('/api/files').query({ path: '%2e%2e/%2e%2e/nc-b' }).set('Authorization', bearer(A.id))
    for (const call of dav.listDirectory.mock.calls) expect(String(call[2])).not.toContain('..')
  })

  // The HTTP client collapses a bare "%2e%2e" segment before it is even sent,
  // so a lone ".." id is covered by the isSafeSegmentId unit test. These ids
  // reach Express intact and are decoded to values containing separators.
  it.each(['..%2Fx', '%2Fetc%2Fpasswd', 'a%5Cb', 'x%00y'])('rejects trash id %s on delete and restore', async (id) => {
    const del = await request(app).delete(`/api/files/trash/${id}`).set('Authorization', bearer(A.id))
    const res = await request(app).post(`/api/files/trash/${id}/restore`).set('Authorization', bearer(A.id))
    expect(del.status).toBe(400)
    expect(res.status).toBe(400)
    expect(dav.deleteTrashItem).not.toHaveBeenCalled()
    expect(dav.restoreTrashItem).not.toHaveBeenCalled()
  })
})

describe('shares are scoped to their owner', () => {
  it("A revoking B's share id looks the row up by BOTH id and A's user id, and gets 404", async () => {
    const res = await request(app).delete('/api/shares/share-owned-by-b').set('Authorization', bearer(A.id))
    expect(res.status).toBe(404)
    expect(mockShareFindFirst).toHaveBeenCalledWith({ where: { id: 'share-owned-by-b', userId: A.id } })
  })
})

describe('access-token validation', () => {
  const secret = process.env.JWT_ACCESS_SECRET!
  const claims = { sub: A.id, email: 'a@example.com' }
  const hit = (token: string) => request(app).get('/api/files').set('Authorization', `Bearer ${token}`)

  it('rejects a token signed with a different algorithm (HS512) even with the right secret', async () => {
    expect((await hit(jwt.sign(claims, secret, { algorithm: 'HS512' }))).status).toBe(401)
  })

  it('rejects an unsigned (alg=none) token', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    expect((await hit(`${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`)).status).toBe(401)
  })

  it('rejects a token signed with the refresh secret (token-type confusion)', async () => {
    expect((await hit(jwt.sign(claims, process.env.JWT_REFRESH_SECRET!, { algorithm: 'HS256' }))).status).toBe(401)
  })

  it('rejects expired and tampered tokens', async () => {
    expect((await hit(jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: -10 }))).status).toBe(401)
    const good = signAccessToken(claims)
    expect((await hit(good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA'))).status).toBe(401)
  })

  it('rejects a still-valid token for a user who has since been deleted', async () => {
    authStates[A.id] = null
    expect((await hit(signAccessToken(claims))).status).toBe(401)
  })

  it('rejects a token issued before the account\'s tokensValidAfter (password change, reuse detection)', async () => {
    const token = jwt.sign({ ...claims, iat: Math.floor(Date.now() / 1000) - 600 }, secret, { algorithm: 'HS256' })
    authStates[A.id] = verified(A.id, { tokensValidAfter: new Date() })
    expect((await hit(token)).status).toBe(401)
  })

  it('accepts a token issued after tokensValidAfter', async () => {
    authStates[A.id] = verified(A.id, { tokensValidAfter: new Date(Date.now() - 60_000) })
    expect((await hit(signAccessToken(claims))).status).toBe(200)
  })

  it('blocks a suspended user immediately, not when the token expires', async () => {
    authStates[A.id] = verified(A.id, { status: 'SUSPENDED' })
    expect((await hit(signAccessToken(claims))).status).toBe(403)
    expect(dav.listDirectory).not.toHaveBeenCalled()
  })

  it('blocks a user whose email is not verified', async () => {
    authStates[A.id] = verified(A.id, { emailVerifiedAt: null })
    expect((await hit(signAccessToken(claims))).status).toBe(403)
  })
})

describe('CSRF guard on cookie-authenticated endpoints', () => {
  it.each(['/api/auth/refresh-token', '/api/auth/logout'])('%s rejects a foreign Origin', async (url) => {
    const res = await request(app).post(url).set('Origin', 'https://evil.example').set('Cookie', 'dvt_refresh_token=x')
    expect(res.status).toBe(403)
  })
})
