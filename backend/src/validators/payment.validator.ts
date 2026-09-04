import { z } from 'zod'

const uuidField = z.string().uuid('Invalid id')

export const createOrderSchema = z.object({
  body: z.object({
    planId: uuidField,
  }),
})

// Field names deliberately mirror what Razorpay's own checkout callback
// hands back client-side (razorpay_order_id / razorpay_payment_id /
// razorpay_signature), just camelCased to match this API's own style —
// there is no client code in this repo that calls this endpoint yet (see
// backend/README.md's Phase 11A section: no frontend/UI was built for
// this), so whatever eventually does just needs to map those three
// fields across, nothing more.
export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
    razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
    razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
  }),
})

export const upgradePlanSchema = z.object({
  body: z.object({
    planId: uuidField,
  }),
})

// Cancels the caller's own subscription (see payment.service.ts: userId
// always comes from req.user.sub, never from anything client-supplied).
// `atPeriodEnd` (Phase 11B) is the only body field — omitted or false
// means the Phase 11A immediate-effect behavior, unchanged; true schedules
// the cancellation for reconciliation.service.ts to carry out once the
// current billing period actually ends. Defaulted (not just optional) so
// `req.body.atPeriodEnd` is always a real boolean by the time it reaches
// paymentController.cancelSubscription, never undefined.
export const cancelSubscriptionSchema = z.object({
  body: z
    .object({
      atPeriodEnd: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
})


export const createSubscriptionSchema = z.object({
  body: z.object({ planId: uuidField }),
})

export const verifySubscriptionSchema = z.object({
  body: z.object({
    razorpaySubscriptionId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body']
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body']
export type UpgradePlanInput = z.infer<typeof upgradePlanSchema>['body']
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>['body']
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>['body']
export type VerifySubscriptionInput = z.infer<typeof verifySubscriptionSchema>['body']
