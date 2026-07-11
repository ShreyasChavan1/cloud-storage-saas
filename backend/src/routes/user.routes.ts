import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { updateProfileSchema } from '../validators/auth.validator'

const router = Router()

router.use(requireAuth)
router.get('/me', userController.getProfile)
router.patch('/me', validate(updateProfileSchema), userController.updateProfile)

export default router
