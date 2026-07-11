import { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError'
import { verifyAccessToken } from '../utils/jwt'

// Reads a Bearer access token, verifies it, and attaches the decoded
// payload to req.user. Routes behind this can trust req.user is present.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'))
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'))
  }
}
