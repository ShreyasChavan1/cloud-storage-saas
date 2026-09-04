import { Router } from 'express'
import { paymentController } from '../controllers/payment.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import {
  createOrderSchema,
  createSubscriptionSchema,
  verifySubscriptionSchema,
  verifyPaymentSchema,
  upgradePlanSchema,
  cancelSubscriptionSchema,
} from '../validators/payment.validator'

const router = Router()

// Self-service billing for the logged-in user's own account — requireAuth
// only, deliberately not requireAdmin (see middleware/admin.middleware.ts
// for that separate, admin-only surface). Every handler reads the acting
// user from req.user.sub; none of these routes take a target user id.
router.get('/plans', paymentController.listPlans)

router.use(requireAuth)

router.post('/create-subscription', validate(createSubscriptionSchema), paymentController.createSubscription)
router.post('/verify-subscription', validate(verifySubscriptionSchema), paymentController.verifySubscription)

router.post('/create-order', validate(createOrderSchema), paymentController.createOrder)
router.post('/verify-payment', validate(verifyPaymentSchema), paymentController.verifyPayment)
router.post('/upgrade-plan', validate(upgradePlanSchema), paymentController.upgradePlan)
router.post('/cancel-subscription', validate(cancelSubscriptionSchema), paymentController.cancelSubscription)

export default router
