import { Request, Response } from 'express'
import { supportService } from '../services/support.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

export const supportController = {
  getContact: asyncHandler(async (_req: Request, res: Response) => {
    const contact = await supportService.getContact()
    return sendSuccess(res, { contact })
  }),

  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    await supportService.sendMessage(req.user!.sub, req.body)
    return sendSuccess(res, { sent: true })
  }),
}
