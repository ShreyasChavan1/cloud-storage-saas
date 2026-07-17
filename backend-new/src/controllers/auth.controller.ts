import { Request, Response } from 'express'
import ms from 'ms'
import { authService } from '../services/auth.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'

const REFRESH_COOKIE_NAME = 'nimbus_refresh_token'

// Refresh token lives in an httpOnly cookie so it's never touchable from
// JS (mitigates XSS token theft); the access token goes in the JSON body
// for the client to hold in memory and attach as a Bearer header.
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ms(env.JWT_REFRESH_EXPIRES_IN),
    path: '/api/auth',
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' })
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, ...result } = await authService.register(req.body)
    setRefreshCookie(res, refreshToken)
    return sendSuccess(res, result, 201)
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, ...result } = await authService.login(req.body)
    setRefreshCookie(res, refreshToken)
    return sendSuccess(res, result, 200)
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) throw ApiError.unauthorized('No refresh token provided')

    const { refreshToken, ...result } = await authService.refresh(token)
    setRefreshCookie(res, refreshToken)
    return sendSuccess(res, result, 200)
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    await authService.logout(token)
    clearRefreshCookie(res)
    return sendSuccess(res, { loggedOut: true })
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.sub)
    return sendSuccess(res, { user })
  }),
}
