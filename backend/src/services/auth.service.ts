import ms from 'ms'
import { userRepository } from '../repositories/user.repository'
import { sessionRepository } from '../repositories/session.repository'
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository'
import { provisionUser } from './userProvisioning.service'
import { toAuthUserDTO } from '../models/user.model'
import { comparePassword } from '../utils/password'
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { generateRandomToken } from '../utils/token'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { logger } from '../config/logger'
import { RegisterInput, LoginInput, ForgotPasswordInput } from '../validators/auth.validator'
import { AuthResponseDTO } from '../types/auth.types'

// Best-effort request metadata, captured once at token-issue time and
// shown on Phase 10's admin "active sessions" view — see
// session.model.ts's SessionDTO for why this is informational only, not a
// security control. Optional everywhere so nothing breaks for callers
// (like the seed script's bootstrap admin, or existing tests) that have no
// real request to read it from.
export interface SessionMeta {
  userAgent?: string
  ipAddress?: string
}

async function issueTokenPair(userId: string, email: string, meta?: SessionMeta) {
  const accessToken = signAccessToken({ sub: userId, email })
  const { token: refreshToken } = signRefreshToken({ sub: userId, email })

  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN))
  await sessionRepository.create(userId, hashToken(refreshToken), expiresAt, meta)

  return { accessToken, refreshToken }
}

export const authService = {
  async register(
    input: RegisterInput,
    meta?: SessionMeta
  ): Promise<AuthResponseDTO & { refreshToken: string }> {
    // Self-registration is always role USER on the seeded default plan —
    // see userProvisioning.service.ts, which this now shares with Phase
    // 10's admin-initiated account creation.
    const user = await provisionUser({
      name: input.name,
      email: input.email,
      password: input.password,
    })

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, meta)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
  },

  async login(input: LoginInput, meta?: SessionMeta): Promise<AuthResponseDTO & { refreshToken: string }> {
    const user = await userRepository.findByEmail(input.email)
    // Same message whether the email doesn't exist or the password is
    // wrong — don't leak which one it was.
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    const valid = await comparePassword(input.password, user.passwordHash)
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    // Checked after the password so a suspended user still gets a
    // generic "invalid credentials" if they've also got the password
    // wrong, rather than this message confirming the email is real —
    // then a distinct, honest message once we know both are correct.
    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('This account has been suspended. Contact support for help.')
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, meta)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
  },

  async refresh(
    rawRefreshToken: string,
    meta?: SessionMeta
  ): Promise<AuthResponseDTO & { refreshToken: string }> {
    let payload
    try {
      payload = verifyRefreshToken(rawRefreshToken)
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token')
    }

    const tokenHash = hashToken(rawRefreshToken)
    const stored = await sessionRepository.findValidByHash(tokenHash)
    if (!stored) {
      throw ApiError.unauthorized('Session has expired or was already used')
    }

    const user = await userRepository.findById(payload.sub)
    if (!user) {
      throw ApiError.unauthorized('User no longer exists')
    }

    // A user suspended after this session was issued shouldn't be able to
    // keep renewing it indefinitely. Refresh already does a DB read (the
    // findById above), so this check is effectively free here — see the
    // UserStatus enum comment in schema.prisma for why this isn't also
    // done on every single authenticated request.
    if (user.status === 'SUSPENDED') {
      await sessionRepository.deleteByHash(tokenHash)
      throw ApiError.forbidden('This account has been suspended. Contact support for help.')
    }

    // Rotate: delete the presented session and issue a brand new one. Limits
    // the blast radius if a refresh token is ever stolen from storage.
    await sessionRepository.deleteByHash(tokenHash)
    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, meta)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
  },

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return
    await sessionRepository.deleteByHash(hashToken(rawRefreshToken))
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')
    return toAuthUserDTO(user)
  },

  // Always resolves the same way whether or not the email exists — the
  // caller (controller) returns an identical generic message either way,
  // so this endpoint can't be used to enumerate registered emails.
  async forgotPassword(input: ForgotPasswordInput): Promise<{ devToken?: string }> {
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      return {}
    }

    // Only one live reset link at a time.
    await passwordResetTokenRepository.deleteAllForUser(user.id)

    const rawToken = generateRandomToken()
    const expiresAt = new Date(Date.now() + ms(env.PASSWORD_RESET_TOKEN_EXPIRES_IN))
    await passwordResetTokenRepository.create(user.id, hashToken(rawToken), expiresAt)

    // No email transport is wired up yet — log it so it's visible in dev,
    // and hand it back in the response ONLY outside production so you can
    // test the flow. Wire up a real mailer before shipping this.
    logger.info({ email: user.email }, 'Password reset token issued (email delivery not yet implemented)')

    if (env.NODE_ENV !== 'production') {
      return { devToken: rawToken }
    }
    return {}
  },
}
