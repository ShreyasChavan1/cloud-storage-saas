import { Router } from 'express'
import { filesController, uploadMiddleware } from '../controllers/files.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import {
  listFilesSchema,
  uploadFileSchema,
  deleteFileSchema,
  renameFileSchema,
  createFolderSchema,
  moveFileSchema,
  copyFileSchema,
  downloadFileSchema,
  favoriteFileSchema,
  versionsSchema,
  restoreVersionSchema,
  trashItemSchema,
} from '../validators/files.validator'

const router = Router()

router.use(requireAuth)

router.get('/', validate(listFilesSchema), filesController.list)
router.post('/upload', validate(uploadFileSchema), uploadMiddleware, filesController.upload)
router.delete('/', validate(deleteFileSchema), filesController.delete)
router.get('/trash', filesController.trash)
router.post('/trash/:id/restore', validate(trashItemSchema), filesController.restoreTrashItem)
router.delete('/trash/:id', validate(trashItemSchema), filesController.deleteTrashItem)
router.delete('/trash', filesController.emptyTrash)
router.patch('/rename', validate(renameFileSchema), filesController.rename)
router.post('/folder', validate(createFolderSchema), filesController.createFolder)
router.post('/move', validate(moveFileSchema), filesController.move)
router.post('/copy', validate(copyFileSchema), filesController.copy)
router.get('/favorites', filesController.favorites)
router.put('/favorite', validate(favoriteFileSchema), filesController.favorite)
router.get('/quota', filesController.quota)
router.get('/stats', filesController.stats)
router.get('/download', validate(downloadFileSchema), filesController.download)
router.get('/preview', validate(downloadFileSchema), filesController.preview)
router.get('/versions', validate(versionsSchema), filesController.versions)
router.post('/versions/restore', validate(restoreVersionSchema), filesController.restoreVersion)

export default router
