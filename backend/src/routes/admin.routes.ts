import { Router } from 'express'
import { adminController } from '../controllers/admin.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'
import { validate } from '../middleware/validate.middleware'
import {
  listUsersSchema,
  userIdParamSchema,
  createUserSchema,
  updateUserStatusSchema,
  resetPasswordSchema,
  updateUserQuotaSchema,
  revokeSessionSchema,
} from '../validators/admin.validator'

const router = Router()

// Every route below requires a valid session (requireAuth) AND an ACTIVE
// ADMIN account (requireAdmin) — see middleware/admin.middleware.ts for
// why the latter re-checks the database rather than trusting anything in
// the access token itself.
router.use(requireAuth, requireAdmin)

router.get('/overview', adminController.overview)
router.get('/plans', adminController.listPlans)

router.get('/users', validate(listUsersSchema), adminController.listUsers)
router.post('/users', validate(createUserSchema), adminController.createUser)
router.get('/users/:id', validate(userIdParamSchema), adminController.getUser)
router.delete('/users/:id', validate(userIdParamSchema), adminController.deleteUser)

router.patch('/users/:id/status', validate(updateUserStatusSchema), adminController.setUserStatus)
router.post('/users/:id/reset-password', validate(resetPasswordSchema), adminController.resetPassword)
router.patch('/users/:id/quota', validate(updateUserQuotaSchema), adminController.setUserQuota)

router.get('/users/:id/storage', validate(userIdParamSchema), adminController.getUserStorage)
router.get(
  '/users/:id/storage/breakdown',
  validate(userIdParamSchema),
  adminController.getUserStorageBreakdown
)
router.get('/users/:id/payments', validate(userIdParamSchema), adminController.getUserPayments)

router.get('/users/:id/sessions', validate(userIdParamSchema), adminController.getUserSessions)
router.delete(
  '/users/:id/sessions/:sessionId',
  validate(revokeSessionSchema),
  adminController.revokeSession
)

// Phase 11B — meant for an external scheduler to call periodically (cron,
// a platform's own scheduled-job feature, ...); see
// reconciliation.service.ts's top comment. No body, so no validate(...) —
// consistent with overview/listPlans above, the only other no-input
// routes on this router.
router.post('/reconcile-subscriptions', adminController.reconcileSubscriptions)

export default router
