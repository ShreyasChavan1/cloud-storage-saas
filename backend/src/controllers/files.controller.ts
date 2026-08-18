import { Request, Response } from 'express'
import multer from 'multer'
import { filesService } from '../services/files.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ApiError } from '../utils/ApiError'

// Buffered in memory rather than streamed to disk first — simplest correct
// option for now. Revisit (disk-temp storage, or a streaming multipart
// parser) if this backend ever needs to handle very large uploads; a 100MB
// cap here bounds the worst case in the meantime.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

export const uploadMiddleware = upload.single('file')

export const filesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const entries = await filesService.list(req.user!.sub, req.query.path as string | undefined)
    return sendSuccess(res, { entries })
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest('No file provided — send it as multipart/form-data under the "file" field')
    }
    const entry = await filesService.upload(
      req.user!.sub,
      req.query.path as string | undefined,
      req.file.originalname,
      req.file.buffer
    )
    return sendSuccess(res, { entry }, 201)
  }),

  download: asyncHandler(async (req: Request, res: Response) => {
    const { stream, stat } = await filesService.download(req.user!.sub, req.query.path as string)

    res.setHeader('Content-Type', stat.mimeType ?? 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(stat.name)}"`)
    if (stat.size) res.setHeader('Content-Length', String(stat.size))

    stream.on('error', () => {
      // Headers may already be sent by the time the remote stream errors —
      // just end the response rather than trying to throw through Express.
      res.end()
    })
    stream.pipe(res)
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await filesService.delete(req.user!.sub, req.query.path as string)
    return sendSuccess(res, { deleted: true })
  }),

  rename: asyncHandler(async (req: Request, res: Response) => {
    const entry = await filesService.rename(req.user!.sub, req.body.path, req.body.newName)
    return sendSuccess(res, { entry })
  }),

  createFolder: asyncHandler(async (req: Request, res: Response) => {
    const entry = await filesService.createFolder(req.user!.sub, req.body.path, req.body.name)
    return sendSuccess(res, { entry }, 201)
  }),

  move: asyncHandler(async (req: Request, res: Response) => {
    const entry = await filesService.move(req.user!.sub, req.body.from, req.body.to)
    return sendSuccess(res, { entry })
  }),

  copy: asyncHandler(async (req: Request, res: Response) => {
    const entry = await filesService.copy(req.user!.sub, req.body.from, req.body.to)
    return sendSuccess(res, { entry }, 201)
  }),

  quota: asyncHandler(async (req: Request, res: Response) => {
    const quota = await filesService.quota(req.user!.sub)
    return sendSuccess(res, quota)
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await filesService.stats(req.user!.sub)
    return sendSuccess(res, stats)
  }),
}
