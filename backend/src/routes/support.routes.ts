import { Router } from 'express'
import { supportController } from '../controllers/support.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { supportMessageRateLimiter } from '../middleware/rateLimiter.middleware'
import { sendSupportMessageSchema } from '../validators/support.validator'

const router = Router()

// Every route here requires a logged-in user — the support form is meant
// for existing customers, not an unauthenticated "contact us" surface, so
// there's no separate public/anonymous path to lock down against spam.
router.use(requireAuth)

router.get('/contact', supportController.getContact)
router.post('/message', supportMessageRateLimiter, validate(sendSupportMessageSchema), supportController.sendMessage)

export default router
