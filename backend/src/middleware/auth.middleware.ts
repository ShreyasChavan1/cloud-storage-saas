import { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError'
import { verifyAccessToken } from '../utils/jwt'
import { userRepository } from '../repositories/user.repository'

// Verifies the Bearer access token AND that the account behind it is still
// allowed to act. A JWT alone only proves it was issued at some point; this
// re-checks, on every request, that the user still exists, is not suspended,
// has a verified email, and has not had their tokens revoked since the token
// was issued (password change/reset, refresh-token theft, suspension).
// One indexed primary-key read per request.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'))
  }

  const token = header.slice('Bearer '.length).trim()

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch {
    return next(ApiError.unauthorized('Invalid or expired access token'))
  }

  try {
    const state = await userRepository.findAuthState(payload.sub)
    // Deleted account: same answer as a bad token, nothing more to learn.
    if (!state) return next(ApiError.unauthorized('Invalid or expired access token'))

    if (state.tokensValidAfter && payload.iat < Math.floor(state.tokensValidAfter.getTime() / 1000)) {
      return next(ApiError.unauthorized('Invalid or expired access token'))
    }
    if (state.status === 'SUSPENDED') {
      return next(ApiError.forbidden('This account has been suspended. Contact support for help.'))
    }
    if (!state.emailVerifiedAt) {
      return next(ApiError.forbidden('Please verify your email address before continuing.'))
    }

    req.user = payload
    return next()
  } catch (err) {
    return next(err)
  }
}
