import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import filesRoutes from './files.routes'
import adminRoutes from './admin.routes'
import paymentRoutes from './payment.routes'

const router = Router()

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', uptime: process.uptime() } })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/files', filesRoutes)
router.use('/admin', adminRoutes)
router.use('/payments', paymentRoutes)

export default router
