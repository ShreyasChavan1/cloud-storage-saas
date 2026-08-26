import { Request, Response } from 'express'
import { adminService } from '../services/admin.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ListUsersQuery } from '../validators/admin.validator'

export const adminController = {
  overview: asyncHandler(async (_req: Request, res: Response) => {
    const overview = await adminService.getOverview()
    return sendSuccess(res, overview)
  }),

  listPlans: asyncHandler(async (_req: Request, res: Response) => {
    const plans = await adminService.listPlans()
    return sendSuccess(res, { plans })
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    // validate() (see middleware/validate.middleware.ts) has already
    // replaced req.query with the coerced/defaulted values described by
    // listUsersSchema — this cast just tells TypeScript that, the same
    // way every other controller in this codebase casts req.query/req.body
    // to its validated shape rather than re-deriving it.
    const result = await adminService.listUsers(req.query as unknown as ListUsersQuery)
    return sendSuccess(res, result)
  }),

  getUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.getUser(req.params.id)
    return sendSuccess(res, { user })
  }),

  createUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.createUser(req.body)
    return sendSuccess(res, { user }, 201)
  }),

  setUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.setUserStatus(req.params.id, req.body.status, req.user!.sub)
    return sendSuccess(res, { user })
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteUser(req.params.id, req.user!.sub)
    return sendSuccess(res, { deleted: true })
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.resetPassword(req.params.id, req.body.password)
    return sendSuccess(res, result)
  }),

  setUserQuota: asyncHandler(async (req: Request, res: Response) => {
    await adminService.setUserQuota(req.params.id, req.body)
    return sendSuccess(res, { updated: true })
  }),

  getUserStorage: asyncHandler(async (req: Request, res: Response) => {
    const quota = await adminService.getUserStorage(req.params.id)
    return sendSuccess(res, quota)
  }),

  getUserStorageBreakdown: asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminService.getUserStorageBreakdown(req.params.id)
    return sendSuccess(res, stats)
  }),

  getUserPayments: asyncHandler(async (req: Request, res: Response) => {
    const payments = await adminService.getUserPayments(req.params.id)
    return sendSuccess(res, { payments })
  }),

  getUserSessions: asyncHandler(async (req: Request, res: Response) => {
    const sessions = await adminService.getUserSessions(req.params.id)
    return sendSuccess(res, { sessions })
  }),

  revokeSession: asyncHandler(async (req: Request, res: Response) => {
    await adminService.revokeSession(req.params.id, req.params.sessionId)
    return sendSuccess(res, { revoked: true })
  }),
}
