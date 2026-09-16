import rateLimit from 'express-rate-limit'
import { sendError } from '../utils/response'

// Throttles login/register specifically — generous enough for real users
// retrying a typo'd password, tight enough to slow down credential stuffing.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many attempts. Please try again in a few minutes.')
  },
})


// Password-reset endpoints are intentionally separate from login/register:
// they are public and can otherwise be abused to hammer the mail provider or
// flood a mailbox. The generic response from forgot-password still prevents
// account enumeration.
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many password reset attempts. Please try again later.')
  },
})

// A logged-in user emailing the support inbox directly — separate from
// passwordResetRateLimiter (different abuse shape: this one can spam the
// owner's actual mailbox with arbitrary text, not just trigger repeat
// token generation) and generous enough for someone genuinely following
// up on an unanswered issue.
export const supportMessageRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many support messages. Please wait a bit before sending another.')
  },
})
