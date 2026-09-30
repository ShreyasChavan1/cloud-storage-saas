import { Router } from 'express'
import { supportController } from '../controllers/support.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { supportMessageRateLimiter } from '../middleware/rateLimiter.middleware'
import { sendSupportMessageSchema } from '../validators/support.validator'

const router = Router()

// GET /contact is deliberately public: it just returns the email/phone an
// admin has already chosen to display (see SupportContactCard), the same
// way a company's contact info sits in any website footer. It needs to
// stay ahead of requireAuth below specifically so the public marketing
// homepage (Home.tsx, rendered for signed-out visitors) can show it —
// that's a real caller, not a hypothetical one, and it doesn't reveal
// anything the admin hasn't already chosen to put in front of the public.
router.get('/contact', supportController.getContact)

// Everything below this line requires a logged-in user — the support
// *form* is for existing customers, not an unauthenticated "contact us"
// surface, so there's no separate public/anonymous path to lock down
// against spam for message-sending specifically.
router.use(requireAuth)

router.post('/message', supportMessageRateLimiter, validate(sendSupportMessageSchema), supportController.sendMessage)

export default router
