import {Router} from 'express'
import {z} from 'zod'
import {shareController} from '../controllers/share.controller'
import {requireAuth} from '../middleware/auth.middleware'
import {validate} from '../middleware/validate.middleware'
const r=Router()
r.get('/public/:token',shareController.info);r.post('/public/:token/download',shareController.download)
r.use(requireAuth)
r.post('/',validate(z.object({body:z.object({path:z.string().min(1),password:z.string().min(4).max(128).optional(),expireDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()})})),shareController.create)
r.get('/',shareController.list);r.delete('/:id',shareController.revoke)
export default r