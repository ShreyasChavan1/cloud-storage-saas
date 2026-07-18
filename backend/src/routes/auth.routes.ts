import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { validate } from '../middleware/validate.middleware'
import { requireAuth } from '../middleware/auth.middleware'
import { authRateLimiter } from '../middleware/rateLimiter.middleware'
import { registerSchema, loginSchema, forgotPasswordSchema } from '../validators/auth.validator'

const router = Router()

router.post('/register', authRateLimiter, validate(registerSchema), authController.register)
router.post('/login', authRateLimiter, validate(loginSchema), authController.login)
router.post('/logout', authController.logout)
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
)
router.get('/me', requireAuth, authController.me)
router.post('/refresh-token', authController.refresh)

export default router
