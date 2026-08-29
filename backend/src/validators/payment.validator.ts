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

// No body at all — cancels the caller's own subscription (see
// payment.service.ts: userId always comes from req.user.sub, never from
// anything client-supplied). Kept as its own schema, rather than skipping
// validation entirely for this route, purely so every route in
// payment.routes.ts goes through `validate(...)` the same way — one less
// thing to remember when adding the next endpoint here.
export const cancelSubscriptionSchema = z.object({
  body: z.object({}).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body']
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body']
export type UpgradePlanInput = z.infer<typeof upgradePlanSchema>['body']
