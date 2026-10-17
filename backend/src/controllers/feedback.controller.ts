import { Request, Response } from 'express'
import { feedbackService } from '../services/feedback.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ListFeedbackQuery } from '../validators/feedback.validator'

export const feedbackController = {
  // Public — see routes/feedback.routes.ts.
  submit: asyncHandler(async (req: Request, res: Response) => {
    const result = await feedbackService.submit(req.body)
    return sendSuccess(res, result, 201)
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await feedbackService.list(req.query as unknown as ListFeedbackQuery)
    return sendSuccess(res, result)
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await feedbackService.remove(req.params.id)
    return sendSuccess(res, { deleted: true })
  }),
}
