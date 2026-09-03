import { Request, Response } from 'express'
import { webhookService } from '../services/webhook.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ApiError } from '../utils/ApiError'

export const webhookController = {
  handleRazorpayWebhook: asyncHandler(async (req: Request, res: Response) => {
    // req.body is a raw Buffer here, not parsed JSON — see app.ts, which
    // mounts this route with express.raw() ahead of the app-wide
    // express.json() specifically so the exact bytes Razorpay signed are
    // still available for webhookService's signature check.
    if (!Buffer.isBuffer(req.body)) {
      throw ApiError.badRequest('Expected raw request body')
    }
    const signature = req.header('x-razorpay-signature')
    const result = await webhookService.handleRazorpayWebhook(req.body, signature)
    return sendSuccess(res, result)
  }),
}
