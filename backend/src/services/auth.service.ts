import ms from 'ms'
import { userRepository } from '../repositories/user.repository'
import { sessionRepository } from '../repositories/session.repository'
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository'
import { provisionUser } from './userProvisioning.service'
import { nextcloudService } from './NextcloudService'
import { hashPassword } from '../utils/password'
import { encrypt } from '../utils/encryption'
import { toAuthUserDTO } from '../models/user.model'
import { comparePassword } from '../utils/password'
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { generateRandomToken, generateStorageSecret } from '../utils/token'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { CURRENT_AGREEMENT_VERSION } from '../config/agreement'
import { logger } from '../config/logger'
import { RegisterInput, LoginInput, ForgotPasswordInput } from '../validators/auth.validator'
import { AuthResponseDTO } from '../types/auth.types'
import { sendPasswordResetEmail, sendEmailVerificationEmail } from './email.service'
import { emailVerificationTokenRepository } from '../repositories/emailVerificationToken.repository'

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

// A refresh token that was already exchanged is normally a stolen/replayed
// copy. A short grace window tolerates two legitimate requests racing with the
// same cookie (two tabs, a retry) so they get a plain 401 instead of killing
// every session the real user has.
const REFRESH_REUSE_GRACE_MS = 10_000

// Compared against when the email is unknown so a login attempt costs one
// bcrypt either way. Without it, "no such user" returns ~instantly while a
// real user takes ~250ms at cost 12, which reveals which emails are registered.
let dummyHashPromise: Promise<string> | undefined
function getDummyHash() {
  dummyHashPromise ??= hashPassword(generateRandomToken())
  return dummyHashPromise
}

// Kill every way a user can still act as themselves: refresh tokens (sessions)
// and not-yet-expired access tokens (tokensValidAfter, checked by requireAuth).
async function revokeAllAccess(userId: string) {
  await sessionRepository.deleteAllForUser(userId)
  await userRepository.revokeAccessTokens(userId)
}

function logVerificationLinkForLocalDev(kind: string, url: string, email: string) {
  // Only when NODE_ENV is explicitly 'development' (it is now a required
  // setting). Goes to the server log, never into an HTTP response.
  if (env.NODE_ENV === 'development') {
    logger.info({ email, url }, `[dev only] ${kind} link (not emailed)`)
  }
}

export const authService = {
  async register(
    input: RegisterInput,
    meta?: SessionMeta
  ): Promise<{ user: ReturnType<typeof toAuthUserDTO>; verificationRequired: true }> {
    if (input.agreementVersion !== CURRENT_AGREEMENT_VERSION) {
      throw ApiError.badRequest(
        'The Service Agreement has been updated. Please review the latest version and accept it to continue.'
      )
    }

    // Self-registration is always role USER on the seeded default plan —
    // see userProvisioning.service.ts, which this shares with admin-created
    // accounts.
    const user = await provisionUser({
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      password: input.password,
      emailVerifiedAt: null,
      agreementAcceptance: {
        version: CURRENT_AGREEMENT_VERSION,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    })

    const rawVerificationToken = generateRandomToken()
    const verificationHash = hashToken(rawVerificationToken)
    const verificationExpiresAt = new Date(Date.now() + ms(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN))
    await emailVerificationTokenRepository.create(user.id, verificationHash, verificationExpiresAt)
    await emailVerificationTokenRepository.deleteAllForUserExcept(user.id, verificationHash)

    const verificationUrl = `${env.CLIENT_EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(rawVerificationToken)}`
    try {
      await sendEmailVerificationEmail(user.email, verificationUrl)
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Email verification delivery failed')
      if (env.NODE_ENV === 'production') {
        throw ApiError.serviceUnavailable('Account created, but we could not send the verification email. Please use "resend verification" in a few minutes.')
      }
      logVerificationLinkForLocalDev('verification', verificationUrl, user.email)
    }

    if (user.nextcloudUsername) {
      try {
        await nextcloudService.setEmail(user.nextcloudUsername, user.email)
      } catch (err) {
        logger.warn({ userId: user.id, err }, 'Could not synchronize Nextcloud email during registration')
      }
    }

    return { user: toAuthUserDTO(user), verificationRequired: true }
  },

  async verifyEmail(token: string, meta?: SessionMeta): Promise<AuthResponseDTO & { refreshToken: string }> {
    const invalid = () => ApiError.badRequest('This email verification link is invalid or has expired.')

    // Atomic: two concurrent requests with the same link cannot both pass.
    const claimed = await emailVerificationTokenRepository.consumeByHash(hashToken(token))
    if (!claimed) throw invalid()

    const user = await userRepository.findById(claimed.userId)
    if (!user) throw invalid()
    // A verification link must not be a way to sign in as a suspended account.
    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('This account has been suspended. Contact support for help.')
    }

    const verifiedUser = user.emailVerifiedAt
      ? user
      : await userRepository.update(user.id, { emailVerifiedAt: new Date() })

    const { accessToken, refreshToken } = await issueTokenPair(verifiedUser.id, verifiedUser.email, meta)
    return { user: toAuthUserDTO(verifiedUser), accessToken, refreshToken }
  },

  // Never throws for delivery problems: success/failure here would otherwise
  // tell the caller whether the address belongs to an unverified account.
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email)
    if (!user || user.emailVerifiedAt || user.status === 'SUSPENDED') return

    const rawToken = generateRandomToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + ms(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN))
    await emailVerificationTokenRepository.create(user.id, tokenHash, expiresAt)
    await emailVerificationTokenRepository.deleteAllForUserExcept(user.id, tokenHash)
    const url = `${env.CLIENT_EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(rawToken)}`
    try {
      await sendEmailVerificationEmail(user.email, url)
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Verification email resend failed')
      logVerificationLinkForLocalDev('verification', url, user.email)
    }
  },

  async login(input: LoginInput, meta?: SessionMeta): Promise<AuthResponseDTO & { refreshToken: string }> {
    const user = await userRepository.findByEmail(input.email)
    // Same message whether the email doesn't exist or the password is
    // wrong — don't leak which one it was.
    if (!user) {
      await comparePassword(input.password, await getDummyHash())
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
    if (!user.emailVerifiedAt) {
      throw ApiError.forbidden('Please verify your email address before logging in.')
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
    const stored = await sessionRepository.findAnyUnexpiredByHash(tokenHash)
    if (!stored || stored.userId !== payload.sub) {
      throw ApiError.unauthorized('Session has expired or was already used')
    }

    // Reuse detection. This token was already exchanged for a newer one, so
    // whoever is presenting it now is either a thief or the victim racing a
    // thief — we cannot tell which, so everything for this user is revoked.
    if (stored.rotatedAt) {
      if (Date.now() - stored.rotatedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        logger.warn(
          { userId: stored.userId, ipAddress: meta?.ipAddress },
          'Refresh token reuse detected — all sessions revoked'
        )
        await revokeAllAccess(stored.userId)
      }
      throw ApiError.unauthorized('Session has expired or was already used')
    }

    const user = await userRepository.findById(payload.sub)
    if (!user) {
      throw ApiError.unauthorized('User no longer exists')
    }

    if (!user.emailVerifiedAt) {
      await sessionRepository.deleteByHash(tokenHash)
      throw ApiError.forbidden('Please verify your email address before logging in.')
    }

    if (user.status === 'SUSPENDED') {
      await sessionRepository.deleteByHash(tokenHash)
      throw ApiError.forbidden('This account has been suspended. Contact support for help.')
    }

    // Rotate. markRotated is an atomic compare-and-set, so if two requests
    // race with the same token exactly one proceeds and the other gets a 401.
    if (!(await sessionRepository.markRotated(stored.id))) {
      throw ApiError.unauthorized('Session has expired or was already used')
    }
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

  // Resolves the same way whether or not the email exists, and the controller
  // does not wait for it, so neither the response body nor its timing can be
  // used to enumerate registered emails.
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email)
    if (!user || user.status === 'SUSPENDED') return

    const rawToken = generateRandomToken()
    const expiresAt = new Date(Date.now() + ms(env.PASSWORD_RESET_TOKEN_EXPIRES_IN))
    const tokenHash = hashToken(rawToken)
    await passwordResetTokenRepository.create(user.id, tokenHash, expiresAt)
    await passwordResetTokenRepository.deleteAllForUserExcept(user.id, tokenHash)

    const resetUrl = `${env.CLIENT_RESET_URL}?token=${encodeURIComponent(rawToken)}`
    try {
      await sendPasswordResetEmail(user.email, resetUrl)
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Password reset email delivery failed')
      logVerificationLinkForLocalDev('password reset', resetUrl, user.email)
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const invalid = () => ApiError.badRequest('This password reset link is invalid or has expired.')

    // Single-use claim happens BEFORE anything changes, atomically.
    const claimed = await passwordResetTokenRepository.consumeByHash(hashToken(token))
    if (!claimed) throw invalid()

    const user = await userRepository.findById(claimed.userId)
    if (!user) throw invalid()

    // The Nextcloud login/WebDAV credentials are independent random secrets
    // (see userProvisioning.service), so a DVT Solutions password change does not
    // touch Nextcloud at all.
    await userRepository.update(user.id, {
      passwordHash: await hashPassword(newPassword),
      // Receiving this email proves control of the mailbox.
      ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
    })
    await revokeAllAccess(user.id)
  },

  // Mints fresh, random Nextcloud credentials. No user secret is involved or
  // sent anywhere; the current password only proves the caller is the owner.
  async repairWebdavPassword(userId: string, currentPassword: string): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw ApiError.unauthorized('Current password is incorrect')
    }
    let webdavPassword: string
    try {
      const result = await nextcloudService.changePassword(user.nextcloudUsername ?? user.id, generateStorageSecret())
      webdavPassword = result.webdavPassword
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error'
      logger.error({ userId, detail }, 'Nextcloud WebDAV credential repair failed')
      throw ApiError.serviceUnavailable('Could not repair the storage connection. Please try again.')
    }
    await userRepository.update(userId, {
      nextcloudWebdavPasswordEncrypted: encrypt(webdavPassword),
    })
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw ApiError.unauthorized('Current password is incorrect')
    }
    await userRepository.update(user.id, { passwordHash: await hashPassword(newPassword) })
    await revokeAllAccess(user.id)
  },
}
