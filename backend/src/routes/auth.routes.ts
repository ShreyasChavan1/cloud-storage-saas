import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { validate } from '../middleware/validate.middleware'
import { requireAuth } from '../middleware/auth.middleware'
import { requireTrustedOrigin } from '../middleware/trustedOrigin.middleware'
import { authRateLimiter, passwordResetRateLimiter, loginAccountRateLimiter, emailActionRateLimiter } from '../middleware/rateLimiter.middleware'
import { registerSchema, loginSchema, forgotPasswordSchema, verifyEmailSchema, resendVerificationSchema } from '../validators/auth.validator'
import { resetPasswordSchema } from '../validators/account.validator'

const router = Router()

router.post('/register', authRateLimiter, validate(registerSchema), authController.register)
router.post('/verify-email', passwordResetRateLimiter, validate(verifyEmailSchema), authController.verifyEmail)
router.post('/resend-verification', passwordResetRateLimiter, emailActionRateLimiter, validate(resendVerificationSchema), authController.resendVerificationEmail)
router.post('/login', authRateLimiter, loginAccountRateLimiter, validate(loginSchema), authController.login)
router.post('/logout', requireTrustedOrigin, authController.logout)
router.post('/reset-password', passwordResetRateLimiter, validate(resetPasswordSchema), authController.resetPassword)
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  emailActionRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
)
router.get('/me', requireAuth, authController.me)
router.post('/refresh-token', requireTrustedOrigin, authController.refresh)

export default router
