import { NextFunction, Request, Response } from 'express'
import { userRepository } from '../repositories/user.repository'
import { ApiError } from '../utils/ApiError'

/**
 * Gates every /api/admin/* route. Must run after requireAuth (needs
 * req.user.sub already set).
 *
 * Deliberately re-checks against the database rather than trusting a role
 * claim embedded in the access token: AuthTokenPayload only ever carries
 * `sub`/`email` (see types/auth.types.ts) and was never extended to carry
 * role, so there's nothing to "trust" from the token in the first place —
 * and even if there were, a role claim baked into a 15-minute JWT would
 * still be stale the instant an admin's role or status changed underneath
 * it. This is the same reasoning authService.refresh already applies to
 * suspension: check the row that's actually the source of truth, on the
 * request path that can afford a DB read.
 *
 * A suspended admin loses admin access immediately (not just regular
 * account access) — there's no reason a suspended account should retain
 * elevated privileges just because it happens to also be an admin.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await userRepository.findById(req.user!.sub)
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'))
    }
    if (user.status === 'SUSPENDED') {
      return next(ApiError.forbidden('This account has been suspended.'))
    }
    if (user.role !== 'ADMIN') {
      return next(ApiError.forbidden('Admin access required'))
    }
    next()
  } catch (err) {
    next(err)
  }
}
