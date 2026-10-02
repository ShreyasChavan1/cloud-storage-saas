import { Request, Response } from 'express'
import multer from 'multer'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { filesService } from '../services/files.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ApiError } from '../utils/ApiError'

// Uploads are written to a temp file on disk first and then streamed to
// Nextcloud, instead of being buffered in RAM. The old memoryStorage setup
// kept the WHOLE file in this Node process's memory for the entire upload,
// which is what made multi-GB files unreliable (and a few concurrent ones
// able to take the whole API down). With disk storage, memory use stays flat
// no matter how big the file is; the cap below is just a sanity limit that
// matches the 10G client_max_body_size on the Nextcloud nginx.
const UPLOAD_TMP_DIR = path.join(os.tmpdir(), 'nimbus-uploads')
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(UPLOAD_TMP_DIR, { recursive: true }, (err) => cb(err, UPLOAD_TMP_DIR))
    },
    // Random name — the real (user-supplied) filename is never used on disk.
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
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
    const tempPath = req.file.path
    try {
      const entry = await filesService.uploadFromDisk(
        req.user!.sub,
        req.query.path as string | undefined,
        req.file.originalname,
        tempPath,
        req.file.size
      )
      return sendSuccess(res, { entry }, 201)
    } finally {
      // Always remove the temp copy, whether the upload succeeded or failed.
      fs.promises.unlink(tempPath).catch(() => undefined)
    }
  }),

  download: asyncHandler(async (req: Request, res: Response) => {
    const { stream, stat } = await filesService.download(req.user!.sub, req.query.path as string)

    res.setHeader('Content-Type', stat.mimeType ?? 'application/octet-stream')
    const safeAsciiName = stat.name.replace(/[\\"\r\n]/g, '_').replace(/[^\x20-\x7E]/g, '_') || 'download'
    const encodedName = encodeURIComponent(stat.name).replace(/'/g, '%27')
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`)
    if (stat.size) res.setHeader('Content-Length', String(stat.size))

    stream.on('error', () => {
      // Headers may already be sent by the time the remote stream errors —
      // just end the response rather than trying to throw through Express.
      res.end()
    })
    stream.pipe(res)
  }),

  preview: asyncHandler(async (req: Request, res: Response) => {
    const { stream, stat } = await filesService.preview(req.user!.sub, req.query.path as string)
    res.setHeader('Content-Type', stat.mimeType ?? 'application/octet-stream')
    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (stat.size) res.setHeader('Content-Length', String(stat.size))
    stream.on('error', () => res.end())
    stream.pipe(res)
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await filesService.delete(req.user!.sub, req.query.path as string)
    return sendSuccess(res, { deleted: true })
  }),

  trash: asyncHandler(async (req: Request, res: Response) => {
    const items = await filesService.trash(req.user!.sub)
    return sendSuccess(res, { items })
  }),

  restoreTrashItem: asyncHandler(async (req: Request, res: Response) => {
    await filesService.restoreFromTrash(req.user!.sub, req.params.id)
    return sendSuccess(res, { restored: true })
  }),

  deleteTrashItem: asyncHandler(async (req: Request, res: Response) => {
    await filesService.deleteFromTrash(req.user!.sub, req.params.id)
    return sendSuccess(res, { deleted: true })
  }),

  emptyTrash: asyncHandler(async (req: Request, res: Response) => {
    await filesService.emptyTrash(req.user!.sub)
    return sendSuccess(res, { emptied: true })
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

  favorite: asyncHandler(async (req: Request, res: Response) => {
    const result = await filesService.setFavorite(req.user!.sub, req.body.path, req.body.favorite)
    return sendSuccess(res, { favorite: result })
  }),

  favorites: asyncHandler(async (req: Request, res: Response) => {
    const entries = await filesService.favorites(req.user!.sub)
    return sendSuccess(res, { entries })
  }),

  versions: asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await filesService.versions(req.user!.sub, req.query.path as string))),

  restoreVersion: asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { entry: await filesService.restoreVersion(req.user!.sub, req.body.path, req.body.revision) })),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await filesService.stats(req.user!.sub)
    return sendSuccess(res, stats)
  }),
}
