import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ApiError } from '../utils/ApiError'
import { cctvService } from '../services/cctv.service'

export const cctvController = {
  create: asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { device: await cctvService.createDevice(req.user!.sub, req.body.name) }, 201)),
  list: asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { devices: await cctvService.listDevices(req.user!.sub) })),
  configure: asyncHandler(async (req: Request, res: Response) => { await cctvService.configureDevice(req.user!.sub, req.params.id, req.body); return sendSuccess(res, { configured: true }) }),
  enroll: asyncHandler(async (req: Request, res: Response) => {
    const code = typeof req.body?.enrollmentCode === 'string' ? req.body.enrollmentCode : ''
    const gatewayId = typeof req.body?.gatewayId === 'string' ? req.body.gatewayId : ''
    if (!code || !gatewayId) throw ApiError.badRequest('enrollmentCode and gatewayId are required')
    return sendSuccess(res, { gateway: await cctvService.enrollGateway(code, gatewayId) }, 201)
  }),
  config: asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { config: await cctvService.gatewayConfig(req.header('X-CCTV-TOKEN') ?? '') })),
  remove: asyncHandler(async (req: Request, res: Response) => { await cctvService.deleteDevice(req.user!.sub, req.params.id); return sendSuccess(res, { deleted: true }) }),
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No footage file provided')
    const token = req.header('X-CCTV-TOKEN') ?? ''
    const recordedAt = req.body.recordedAt ? new Date(req.body.recordedAt) : undefined
    if (recordedAt && Number.isNaN(recordedAt.getTime())) throw ApiError.badRequest('Invalid recordedAt timestamp')
    const result = await cctvService.uploadFromGateway(token, req.file.originalname, req.file.path, req.file.size, recordedAt)
    return sendSuccess(res, result, result.duplicate ? 200 : 201)
  }),
}
