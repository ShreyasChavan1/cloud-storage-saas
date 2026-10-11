import { Router } from 'express'
import { clientFormController } from '../controllers/clientForm.controller'
import { validate } from '../middleware/validate.middleware'
import { clientFormRateLimiter } from '../middleware/rateLimiter.middleware'
import { submitClientFormSchema } from '../validators/clientForm.validator'

const router = Router()

// Deliberately public: the discovery form is for prospective clients who
// don't have an account yet. The rate limiter is the abuse control. Reading
// and managing submissions is admin-only and lives in admin.routes.ts.
router.post('/', clientFormRateLimiter, validate(submitClientFormSchema), clientFormController.submit)

export default router
