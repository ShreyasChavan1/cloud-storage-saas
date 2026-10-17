import { Router } from 'express'
import { feedbackController } from '../controllers/feedback.controller'
import { validate } from '../middleware/validate.middleware'
import { feedbackRateLimiter } from '../middleware/rateLimiter.middleware'
import { submitFeedbackSchema } from '../validators/feedback.validator'

const router = Router()

// Deliberately public: anyone viewing the home page can leave feedback. The
// rate limiter is the abuse control. Reading and deleting submissions is
// admin-only and lives in admin.routes.ts.
router.post('/', feedbackRateLimiter, validate(submitFeedbackSchema), feedbackController.submit)

export default router
