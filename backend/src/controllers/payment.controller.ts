import { Request, Response } from 'express'
import { paymentService } from '../services/payment.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { CreateOrderInput, VerifyPaymentInput, UpgradePlanInput } from '../validators/payment.validator'

export const paymentController = {
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.createOrder(req.user!.sub, req.body as CreateOrderInput)
    return sendSuccess(res, result)
  }),

  verifyPayment: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.verifyPayment(req.user!.sub, req.body as VerifyPaymentInput)
    return sendSuccess(res, result)
  }),

  upgradePlan: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.upgradePlan(req.user!.sub, req.body as UpgradePlanInput)
    return sendSuccess(res, result)
  }),

  cancelSubscription: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.cancelSubscription(req.user!.sub)
    return sendSuccess(res, result)
  }),
}
