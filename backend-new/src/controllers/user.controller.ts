import { Request, Response } from 'express'
import { userService } from '../services/user.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

export const userController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getProfile(req.user!.sub)
    return sendSuccess(res, { user })
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.sub, req.body)
    return sendSuccess(res, { user })
  }),
}
