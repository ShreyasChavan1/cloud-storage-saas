import { Request, Response } from 'express'
import { feedbackService } from '../services/feedback.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ListFeedbackQuery } from '../validators/feedback.validator'

export const feedbackController = {
  // Signed-in users only — see routes/feedback.routes.ts.
  submit: asyncHandler(async (req: Request, res: Response) => {
    const result = await feedbackService.submit(req.user!.sub, req.body)
    return sendSuccess(res, result, 201)
  }),

  // Public: the reviews shown on the home page.
  featured: asyncHandler(async (_req: Request, res: Response) => {
    const reviews = await feedbackService.featured()
    // Every visitor hits this; a minute of caching keeps it off the database.
    res.set('Cache-Control', 'public, max-age=60')
    return sendSuccess(res, { reviews })
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
