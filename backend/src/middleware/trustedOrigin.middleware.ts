import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'

// The refresh cookie is SameSite=None in production (frontend and API live on
// different sites), so the browser attaches it to cross-site requests. That
// makes /refresh-token and /logout CSRF-able: a hostile page could force them.
// Browsers always send an Origin header on cross-site POSTs, so rejecting any
// Origin other than our own frontend closes that. Requests with no Origin
// (curl, server-to-server, same-origin GET navigations) are not browser CSRF
// and stay allowed — they cannot carry a victim's cookie.
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin
  if (origin && origin !== env.CLIENT_ORIGIN) {
    return next(ApiError.forbidden('Request origin not allowed'))
  }
  next()
}
