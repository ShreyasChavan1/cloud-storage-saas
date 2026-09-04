import { Request, Response } from 'express'
import { paymentService } from '../services/payment.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { CreateOrderInput, VerifyPaymentInput, UpgradePlanInput, CancelSubscriptionInput, CreateSubscriptionInput, VerifySubscriptionInput } from '../validators/payment.validator'

export const paymentController = {
  listPlans: asyncHandler(async (_req: Request, res: Response) => {
    const plans = await paymentService.listPlans()
    return sendSuccess(res, { plans })
  }),
  createSubscription: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.createSubscription(req.user!.sub, req.body as CreateSubscriptionInput)
    return sendSuccess(res, result)
  }),

  verifySubscription: asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.verifySubscription(req.user!.sub, req.body as VerifySubscriptionInput)
    return sendSuccess(res, result)
  }),
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

  // Phase 11B: body.atPeriodEnd defaults to false via cancelSubscriptionSchema,
  // so this always passes a real boolean through — old clients that never
  // send a body at all get exactly the Phase 11A immediate-effect behavior.
  cancelSubscription: asyncHandler(async (req: Request, res: Response) => {
    const { atPeriodEnd } = req.body as CancelSubscriptionInput
    const result = await paymentService.cancelSubscription(req.user!.sub, { atPeriodEnd })
    return sendSuccess(res, result)
  }),
}

