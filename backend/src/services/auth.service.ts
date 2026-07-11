import ms from 'ms'
import { userRepository } from '../repositories/user.repository'
import { refreshTokenRepository } from '../repositories/refreshToken.repository'
import { toAuthUserDTO } from '../models/user.model'
import { hashPassword, comparePassword } from '../utils/password'
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { RegisterInput, LoginInput } from '../validators/auth.validator'
import { AuthResponseDTO } from '../types/auth.types'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

async function issueTokenPair(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email })
  const { token: refreshToken } = signRefreshToken({ sub: userId, email })

  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN))
  await refreshTokenRepository.store(userId, hashToken(refreshToken), expiresAt)

  return { accessToken, refreshToken }
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponseDTO & { refreshToken: string }> {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw ApiError.conflict('An account with this email already exists')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      avatarInitials: initials(input.name),
      // New accounts start on Starter — matches the Pricing page's free tier.
      plan: 'STARTER',
    })

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
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
    const stored = await refreshTokenRepository.findValidByHash(tokenHash)
    if (!stored) {
      throw ApiError.unauthorized('Refresh token has been revoked or expired')
    }

    const user = await userRepository.findById(payload.sub)
    if (!user) {
      throw ApiError.unauthorized('User no longer exists')
    }

    // Rotate: revoke the presented token and issue a brand new pair. Limits
    // the blast radius if a refresh token is ever stolen from storage.
    await refreshTokenRepository.revokeByHash(tokenHash)
    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email)

    return { user: toAuthUserDTO(user), accessToken, refreshToken }
  },

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return
    await refreshTokenRepository.revokeByHash(hashToken(rawRefreshToken))
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')
    return toAuthUserDTO(user)
  },
}
