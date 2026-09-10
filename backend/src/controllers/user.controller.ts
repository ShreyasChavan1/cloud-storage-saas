import { Request, Response } from 'express'
import { userService } from '../services/user.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { notificationService } from '../services/notification.service'
import { authService } from '../services/auth.service'
import { ApiError } from '../utils/ApiError'

export const userController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getProfile(req.user!.sub)
    return sendSuccess(res, { user })
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword)
    return sendSuccess(res, { message: 'Password updated successfully.' })
  }),

  repairWebdavPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.repairWebdavPassword(req.user!.sub, req.body.currentPassword)
    return sendSuccess(res, { message: 'Storage connection repaired successfully.' })
  }),

  getNotifications: asyncHandler(async (req: Request, res: Response) => {
    const preferences = await notificationService.get(req.user!.sub)
    return sendSuccess(res, { preferences })
  }),

  updateNotifications: asyncHandler(async (req: Request, res: Response) => {
    const preferences = await notificationService.update(req.user!.sub, req.body)
    return sendSuccess(res, { preferences })
  }),

  updateAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('Please select an image.')
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
    if (!allowedTypes.has(req.file.mimetype)) throw ApiError.badRequest('Only PNG, JPEG, WEBP or GIF images are allowed.')
    if (req.file.size > 2 * 1024 * 1024) throw ApiError.badRequest('Profile photo must be 2 MB or smaller.')
    const avatarData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    const user = await userService.updateAvatar(req.user!.sub, avatarData)
    return sendSuccess(res, { user })
  }),

  removeAvatar: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateAvatar(req.user!.sub, null)
    return sendSuccess(res, { user })
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.sub, req.body)
    return sendSuccess(res, { user })
  }),
}
