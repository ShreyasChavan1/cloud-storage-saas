import { Request } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env'
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

// Public discovery form (no login required) — hourly rather than 15-minute
// window because a real prospect submits once, maybe twice if they fix a
// mistake; anything beyond that is far more likely to be spam.
export const clientFormRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many submissions. Please try again later.')
  },
})

// Public home-page feedback form (no login required). A genuine visitor
// leaves one, maybe two; anything past that from one address is spam.
export const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many submissions. Please try again later.')
  },
})

const FIFTEEN_MIN = 15 * 60 * 1000

// Normalised so "A@x.com" and "a@x.com " share one bucket. Falls back to the
// client IP when the body has no usable email (the validator rejects those
// later anyway).
function emailKey(prefix: string) {
  return (req: Request): string => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return email ? `${prefix}:${email}` : `${prefix}:ip:${req.ip}`
  }
}

// Backstop for the whole API, keyed by IP. Deliberately generous (chunked
// uploads and a busy dashboard make many legitimate requests); its job is to
// stop floods and scraping, while the stricter limiters below guard the
// endpoints attackers actually target. In-memory store: counts are per
// process, so behind several instances use a shared store (e.g. Redis).
export const globalApiRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: env.GLOBAL_RATE_LIMIT_PER_15MIN,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  handler: (_req, res) => {
    sendError(res, 429, 'Too many requests. Please slow down and try again shortly.')
  },
})

// Per-ACCOUNT login throttle, on top of the per-IP authRateLimiter. Stops
// one attacker rotating IPs against a single victim. Only failures count, so
// the real owner logging in successfully is never locked out by their own
// successful sessions.
export const loginAccountRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: emailKey('login'),
  handler: (_req, res) => {
    sendError(res, 429, 'Too many failed attempts for this account. Please try again in a few minutes.')
  },
})

// Per-address cap on reset/verification emails, so one inbox cannot be
// flooded from many IPs. Returns the normal generic 200 shape of those
// endpoints' callers would see only via the message; 429 here is keyed on
// the address the attacker already supplied, so it leaks nothing new.
export const emailActionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKey('email-action'),
  handler: (_req, res) => {
    sendError(res, 429, 'Too many requests for this email address. Please try again later.')
  },
})

// Token-bearing endpoints (reset-password, verify-email) get a per-IP limit
// separate from the mail-sending limiter so guessing tokens is also capped.
// Tokens are 256-bit so guessing is infeasible; this is defence in depth.

// Authenticated but sensitive actions (change password, delete account,
// repair storage credentials) — keyed by USER, not IP, so it holds even when
// a stolen token is used from many addresses. Must run after requireAuth.
export const sensitiveActionRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `sensitive:${req.user?.sub ?? `ip:${req.ip}`}`,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many attempts. Please wait a few minutes and try again.')
  },
})

// Public share links can be password-protected. Without this the password is
// guessable at full speed. Keyed by link AND IP so one person hammering a link
// can't lock everyone else out of it; successful downloads don't count.
export const publicShareRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `share:${req.params.token}:${req.ip}`,
  handler: (_req, res) => {
    sendError(res, 429, 'Too many attempts for this link. Please try again later.')
  },
})
