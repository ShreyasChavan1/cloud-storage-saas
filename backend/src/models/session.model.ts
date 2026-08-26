import { Session } from '@prisma/client'

// Never includes `refreshToken` — that's a SHA-256 hash, not the raw
// token, but there's still no reason for it to leave this backend at all
// (same "don't expose it just because it's already hashed" reasoning as
// passwordHash on User).
export interface SessionDTO {
  id: string
  createdAt: string
  expiresAt: string
  userAgent: string | null
  ipAddress: string | null
}

export function toSessionDTO(session: Session): SessionDTO {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
  }
}
