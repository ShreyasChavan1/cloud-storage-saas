import ms from 'ms'
import { userRepository } from '../repositories/user.repository'
import { sessionRepository } from '../repositories/session.repository'
import { planRepository } from '../repositories/plan.repository'
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { toAuthUserDTO } from '../models/user.model'
import { hashPassword, comparePassword } from '../utils/password'
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { generateRandomToken } from '../utils/token'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { DEFAULT_PLAN_NAME } from '../config/plans'
import { logger } from '../config/logger'
import { RegisterInput, LoginInput, ForgotPasswordInput } from '../validators/auth.validator'
import { AuthResponseDTO } from '../types/auth.types'

async function issueTokenPair(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email })
  const { token: refreshToken } = signRefreshToken({ sub: userId, email })

  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN))
  await sessionRepository.create(userId, hashToken(refreshToken), expiresAt)

  return { accessToken, refreshToken }
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponseDTO & { refreshToken: string }> {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw ApiError.conflict('An account with this email already exists')
    }

    const defaultPlan = await planRepository.findByName(DEFAULT_PLAN_NAME)
    if (!defaultPlan) {
      // Fails loudly rather than silently creating a plan-less account —
      // almost always means `npm run prisma:seed` hasn't been run yet.
      throw ApiError.internal(
        `Default plan "${DEFAULT_PLAN_NAME}" not found. Run "npm run prisma:seed" to seed plans.`
      )
    }

    const passwordHash = await hashPassword(input.password)

    // 1. Create the PostgreSQL user first — it's the source of truth for
    // "does this account exist", and gives us a stable, unique id to use
    // as the Nextcloud username (sidesteps Nextcloud's username character
    // restrictions entirely — a UUID is always valid).
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      plan: { connect: { id: defaultPlan.id } },
    })

    // 2. Provision the matching Nextcloud account, quota-limited to the
    // user's plan. If this fails, roll back the Postgres user rather than
    // leaving an account with no storage backend behind it.
    const nextcloudUsername = user.id
    try {
      await nextcloudService.createUser(nextcloudUsername, input.password, defaultPlan.storageLimit)
    } catch (err) {
      await userRepository.delete(user.id)
      const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
      logger.error({ userId: user.id, detail }, 'Nextcloud provisioning failed — rolled back Postgres user')
      throw ApiError.serviceUnavailable('Could not set up your storage account. Please try again.')
    }

    // 3. Store the nextcloud_username now that provisioning succeeded.
    const provisionedUser = await userRepository.update(user.id, { nextcloudUsername })

    // 4. Return JWT.
    const { accessToken, refreshToken } = await issueTokenPair(provisionedUser.id, provisionedUser.email)

    return { user: toAuthUserDTO(provisionedUser), accessToken, refreshToken }
  },

  async login(input: LoginInput): Promise<AuthResponseDTO & { refreshToken: string }> {
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

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
  },

  async refresh(rawRefreshToken: string): Promise<AuthResponseDTO & { refreshToken: string }> {
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

    // Rotate: delete the presented session and issue a brand new one. Limits
    // the blast radius if a refresh token is ever stolen from storage.
    await sessionRepository.deleteByHash(tokenHash)
    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email)

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
