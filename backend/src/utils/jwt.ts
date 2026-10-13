import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'crypto'
import { env } from '../config/env'
import { AuthTokenPayload } from '../types/auth.types'

// Pinned on both sign and verify. jsonwebtoken would otherwise accept
// whatever `alg` the token header claims among the algorithms the key type
// allows, which is how "alg confusion" downgrades happen. Access and refresh
// tokens also use different secrets, so one can never stand in for the other.
const ALGORITHM = 'HS256' as const

export type VerifiedAccessToken = AuthTokenPayload & { iat: number; exp: number }

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  })
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] }) as VerifiedAccessToken
}

// Refresh tokens carry a random jti (not just the user id) so each issued
// token is unique and independently revocable, then we store only its hash.
export function signRefreshToken(payload: AuthTokenPayload): { token: string; jti: string } {
  const jti = randomUUID()
  const token = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  })
  return { token, jti }
}

export function verifyRefreshToken(token: string): AuthTokenPayload & { jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] }) as AuthTokenPayload & { jti: string }
}

// We never store raw refresh tokens — only a SHA-256 digest — so a DB read
// alone can't be replayed as a valid session token.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
