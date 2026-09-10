import { Router } from 'express'
import multer from 'multer'
import { mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { cctvController } from '../controllers/cctv.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { ApiError } from '../utils/ApiError'

const router = Router()
const spool = join(tmpdir(), 'nimbus-cctv')
mkdirSync(spool, { recursive: true })
const upload = multer({ storage: multer.diskStorage({ destination: spool, filename: (_req, file, cb) => cb(null, `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`) }), limits: { fileSize: 1024 * 1024 * 1024 } })

// Gateway-only machine endpoints. Identity is proved by the hashed gateway token.
router.post('/gateway/enroll', cctvController.enroll)
router.get('/gateway/config', cctvController.config)
router.post('/ingest', upload.single('file'), cctvController.upload)

router.use(requireAuth)
router.get('/devices', cctvController.list)
router.post('/devices', (req, res, next) => {
  if (typeof req.body?.name !== 'string' || req.body.name.trim().length < 2 || req.body.name.trim().length > 80) return next(ApiError.badRequest('Device name must be 2-80 characters'))
  next()
}, cctvController.create)
router.put('/devices/:id/config', cctvController.configure)
router.delete('/devices/:id', cctvController.remove)
export default router
