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
