import { Router } from 'express'
import { feedbackController } from '../controllers/feedback.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { feedbackRateLimiter } from '../middleware/rateLimiter.middleware'
import { submitFeedbackSchema } from '../validators/feedback.validator'

const router = Router()

// Anyone can SEE the featured reviews on the home page...
router.get('/featured', feedbackController.featured)

// ...but only a signed-in account can LEAVE feedback. The rate limiter is
// the abuse control on top of that. Reading every submission and deleting
// them is admin-only and lives in admin.routes.ts.
router.post('/', requireAuth, feedbackRateLimiter, validate(submitFeedbackSchema), feedbackController.submit)

export default router
