import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'crypto'
import { env } from '../config/env'
import { AuthTokenPayload } from '../types/auth.types'

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload
}

// Refresh tokens carry a random jti (not just the user id) so each issued
// token is unique and independently revocable, then we store only its hash.
export function signRefreshToken(payload: AuthTokenPayload): { token: string; jti: string } {
  const jti = randomUUID()
  const token = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  })
  return { token, jti }
}

export function verifyRefreshToken(token: string): AuthTokenPayload & { jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload & { jti: string }
}

// We never store raw refresh tokens — only a SHA-256 digest — so a DB read
// alone can't be replayed as a valid session token.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
