import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { userController } from '../controllers/user.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { sensitiveActionRateLimiter } from '../middleware/rateLimiter.middleware'
import { updateProfileSchema } from '../validators/auth.validator'
import { changePasswordSchema, notificationPreferencesSchema } from '../validators/account.validator'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })
router.use(requireAuth)
router.get('/me', userController.getProfile)
router.patch('/me', validate(updateProfileSchema), userController.updateProfile)
router.put('/me/avatar', upload.single('avatar'), userController.updateAvatar)
router.delete('/me/avatar', userController.removeAvatar)
router.post('/me/password', sensitiveActionRateLimiter, validate(changePasswordSchema), userController.changePassword)
router.post('/me/webdav/repair', sensitiveActionRateLimiter, validate(z.object({ body: z.object({ currentPassword: z.string().min(1) }) })), userController.repairWebdavPassword)
router.delete('/me', sensitiveActionRateLimiter, validate(z.object({ body: z.object({ password: z.string().min(1) }) })), userController.deleteAccount)
router.get('/me/notifications', userController.getNotifications)
router.put('/me/notifications', validate(notificationPreferencesSchema), userController.updateNotifications)
export default router
