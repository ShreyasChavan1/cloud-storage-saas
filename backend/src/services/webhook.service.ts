import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { razorpayService } from './RazorpayService'
import { paymentService } from './payment.service'
import { paymentRepository } from '../repositories/payment.repository'
import { subscriptionRepository } from '../repositories/subscription.repository'
import { webhookEventRepository } from '../repositories/webhookEvent.repository'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'
import { DEFAULT_PLAN_NAME } from '../config/plans'

/**
 * Phase 11B — processes Razorpay webhook deliveries. See
 * webhook.controller.ts / app.ts for how the raw request body reaches this
 * module untouched, and RazorpayService.verifyWebhookSignature for how it's
 * authenticated.
 *
 * Only the minimal shape actually read from each entity is typed below —
 * Razorpay's real payloads carry many more fields than this, and adding
 * fields there over time shouldn't require touching this file.
 */

interface RazorpayPaymentEntity {
  id: string
  order_id: string
  status: string
  amount?: number
  invoice_id?: string
}

interface RazorpayRefundEntity {
  id: string
  payment_id: string
  status: string
}

interface RazorpaySubscriptionEntity {
  id: string
  status: string
  current_start?: number | null
  current_end?: number | null
  charge_at?: number | null
}

interface RazorpayWebhookPayload {
  event: string
  payload: {
    payment?: { entity: RazorpayPaymentEntity }
    refund?: { entity: RazorpayRefundEntity }
    subscription?: { entity: RazorpaySubscriptionEntity }
  }
}

export const webhookService = {
  /**
   * Entry point for POST /api/webhooks/razorpay. `rawBody` must be the
   * exact bytes Razorpay sent (see app.ts) — both the signature check and
   * the idempotency key below depend on that.
   */
  async handleRazorpayWebhook(
    rawBody: Buffer,
    signature: string | undefined
  ): Promise<{ status: 'ok' | 'duplicate' | 'ignored' }> {
    if (!signature || !razorpayService.verifyWebhookSignature(rawBody, signature)) {
      throw ApiError.unauthorized('Invalid webhook signature')
    }

    let parsed: RazorpayWebhookPayload
    try {
      parsed = JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw ApiError.badRequest('Malformed webhook payload')
    }

    if (!parsed.event) {
      throw ApiError.badRequest('Webhook payload missing "event"')
    }

    // Idempotency key: a hash of the exact bytes Razorpay sent, not any
    // single field inside the payload — see schema.prisma's WebhookEvent
    // comment for why. Same signature/body delivered twice (Razorpay
    // retries on anything other than a 2xx) hashes to the same id both
    // times, deterministically, with no dependence on Razorpay's payload
    // shape being consistent across every event type.
    const eventId = crypto.createHash('sha256').update(rawBody).digest('hex')

    const existing = await webhookEventRepository.findById(eventId)
    if (existing?.status === 'PROCESSED') {
      logger.info({ eventId, eventType: parsed.event }, 'Duplicate webhook delivery — already processed, skipping')
      return { status: 'duplicate' }
    }
    if (!existing) {
      // First time seeing this exact delivery. If processing below throws,
      // this row is left at RECEIVED (not PROCESSED) — a retried delivery
      // then re-enters here, finds `existing` but not PROCESSED, and tries
      // again rather than being treated as a skippable duplicate. Safe to
      // retry because every handler below is itself idempotent regardless
      // of how far a previous attempt got.
      await webhookEventRepository.create({
        id: eventId,
        eventType: parsed.event,
        // Double cast — `parsed` is a narrowly-typed interface (only the
        // fields this file actually reads), not a structural match for
        // Prisma's InputJsonValue; the payload is only ever used as an
        // opaque audit/debug blob after this point, so the cast is safe.
        payload: parsed as unknown as Prisma.InputJsonValue,
      })
    }

    try {
      await dispatch(parsed)
      await webhookEventRepository.markProcessed(eventId)
      return { status: 'ok' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error'
      await webhookEventRepository.markFailed(eventId, message)
      // Re-thrown so the controller responds non-2xx and Razorpay's own
      // retry schedule takes over — the safest default for a failure we
      // don't otherwise understand (e.g. a transient DB error), given
      // reprocessing is safe (see the idempotency comment above).
      throw err
    }
  },
}

async function dispatch(evt: RazorpayWebhookPayload): Promise<void> {
  switch (evt.event) {
    case 'payment.captured':
      return handlePaymentCaptured(evt)
    case 'payment.failed':
      return handlePaymentFailed(evt)
    case 'refund.created':
    case 'refund.processed':
      return handleRefund(evt)
    case 'order.paid':
      // Same underlying payment as payment.captured, already handled
      // there — recorded via the WebhookEvent row above, nothing further
      // to do here.
      return
    case 'refund.failed':
      // The refund attempt itself failed at Razorpay's end — the payment
      // stays SUCCEEDED on our side, there's nothing to reconcile.
      logger.warn({ event: evt.event }, 'Razorpay refund attempt failed — no local state change')
      return
    case 'subscription.authenticated':
      return handleSubscriptionStatus(evt, 'AUTHENTICATED')
    case 'subscription.activated':
      return handleSubscriptionStatus(evt, 'ACTIVE')
    case 'subscription.pending':
      return handleSubscriptionStatus(evt, 'PENDING')
    case 'subscription.halted':
      return handleSubscriptionStatus(evt, 'HALTED')
    case 'subscription.cancelled':
      return handleSubscriptionStatus(evt, 'CANCELLED')
    case 'subscription.completed':
      return handleSubscriptionStatus(evt, 'COMPLETED')
    case 'subscription.expired':
      return handleSubscriptionStatus(evt, 'EXPIRED')
    case 'subscription.charged':
      return handleSubscriptionCharged(evt)
    default:
      logger.info({ eventType: evt.event }, 'Unhandled Razorpay webhook event type — recorded, no action taken')
  }
}

async function handlePaymentCaptured(evt: RazorpayWebhookPayload): Promise<void> {
  const entity = evt.payload.payment?.entity
  if (!entity) {
    logger.warn({ event: evt.event }, 'payment.captured webhook missing payment entity — ignoring')
    return
  }

  try {
    const result = await paymentService.confirmPayment(entity.order_id, entity.id)
    if (!result) {
      logger.warn(
        { orderId: entity.order_id, paymentId: entity.id },
        'payment.captured for an order this backend did not create — ignoring'
      )
    }
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 409) {
      // Already FAILED/REFUNDED on our side — a captured notification
      // arriving after that is a conflict worth logging, not a reason to
      // fail the whole webhook delivery (Razorpay would just keep
      // retrying something that will never resolve differently).
      logger.warn({ orderId: entity.order_id, detail: err.message }, 'payment.captured conflict — ignoring')
      return
    }
    throw err
  }
}

async function handlePaymentFailed(evt: RazorpayWebhookPayload): Promise<void> {
  const entity = evt.payload.payment?.entity
  if (!entity) {
    logger.warn({ event: evt.event }, 'payment.failed webhook missing payment entity — ignoring')
    return
  }

  const payment = await paymentRepository.findByProviderOrderId(entity.order_id)
  if (!payment) {
    logger.warn({ orderId: entity.order_id }, 'payment.failed for an order this backend did not create — ignoring')
    return
  }

  if (payment.status === 'SUCCEEDED' || payment.status === 'REFUNDED') {
    // A failure notification for something that already succeeded (or was
    // already refunded) elsewhere — most likely a race with verify-payment
    // or another webhook delivery, not a real failure to record.
    logger.warn(
      { paymentId: payment.id, status: payment.status },
      'payment.failed for an already-resolved payment — ignoring'
    )
    return
  }

  if (payment.status === 'PENDING') {
    await paymentRepository.markFailed(payment.id)
  }
  // else: already FAILED — nothing new to record on the Payment row
  // itself, but the subscription side-effect below still needs to run in
  // case a previous attempt at this webhook got that far.

  // Only a failed *renewal* of the plan the user is currently on should
  // touch their subscription — a failed attempt to switch to a different
  // plan shouldn't disturb whatever plan they're already successfully on.
  const subscription = await subscriptionRepository.findByUserId(payment.userId)
  if (subscription && subscription.status === 'ACTIVE' && payment.planId && subscription.planId === payment.planId) {
    await subscriptionRepository.markPastDue(subscription.id)
    logger.warn(
      { userId: payment.userId, subscriptionId: subscription.id },
      'Recurring payment failed — subscription marked PAST_DUE'
    )
  }
}

async function handleRefund(evt: RazorpayWebhookPayload): Promise<void> {
  const entity = evt.payload.refund?.entity
  if (!entity) {
    logger.warn({ event: evt.event }, 'refund webhook missing refund entity — ignoring')
    return
  }

  const payment = await paymentRepository.findByProviderPaymentId(entity.payment_id)
  if (!payment) {
    logger.warn({ paymentId: entity.payment_id }, 'refund event for a payment this backend did not create — ignoring')
    return
  }

  if (payment.status === 'REFUNDED') {
    // Already handled — refund.created and refund.processed can both
    // arrive for the same underlying refund, and either can be retried.
    return
  }
  if (payment.status !== 'SUCCEEDED') {
    logger.warn(
      { paymentId: payment.id, status: payment.status },
      'refund event for a payment that was never SUCCEEDED — ignoring'
    )
    return
  }

  await paymentRepository.markRefunded(payment.id)

  // Only downgrade if this refunded payment is the one actually funding
  // the user's CURRENT subscription — refunding an old, already-superseded
  // payment (e.g. they upgraded again since) shouldn't touch what they're
  // on now.
  const subscription = await subscriptionRepository.findByUserId(payment.userId)
  if (!subscription || payment.subscriptionId !== subscription.id) {
    return
  }
  if (subscription.status === 'CANCELED') {
    // Already reverted to Free by some other path — nothing left to do.
    logger.info({ userId: payment.userId }, 'Payment refunded but subscription already CANCELED — no downgrade needed')
    return
  }

  // Reuses cancelSubscription's own immediate-effect path (the same one
  // Phase 11A's user-initiated cancellation uses) rather than duplicating
  // "revert this user to Free plan" logic a second time — every plan
  // change goes through payment.service.ts's applyPlanChange exactly once,
  // whatever triggered it. Guard above already confirmed the default
  // plan lookup inside cancelSubscription will succeed in the way that
  // matters here (there IS a current, non-CANCELED subscription).
  const { quotaSynced } = await paymentService.cancelSubscription(payment.userId)
  logger.warn(
    { userId: payment.userId, quotaSynced },
    `Payment refunded — subscription reverted to ${DEFAULT_PLAN_NAME} plan`
  )
}


async function handleSubscriptionStatus(
  evt: RazorpayWebhookPayload,
  status: 'AUTHENTICATED' | 'ACTIVE' | 'PENDING' | 'HALTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED'
): Promise<void> {
  const entity = evt.payload.subscription?.entity
  if (!entity) {
    logger.warn({ event: evt.event }, 'subscription webhook missing subscription entity — ignoring')
    return
  }
  await paymentService.markBillingSubscriptionStatus(
    entity.id,
    status,
    entity.current_start,
    entity.current_end,
    entity.charge_at
  )

  if (status === 'HALTED' || status === 'CANCELLED' || status === 'COMPLETED' || status === 'EXPIRED') {
    logger.warn({ razorpaySubscriptionId: entity.id, status }, 'Razorpay subscription state changed')
  }
}

async function handleSubscriptionCharged(evt: RazorpayWebhookPayload): Promise<void> {
  const subscription = evt.payload.subscription?.entity
  const payment = evt.payload.payment?.entity
  if (!subscription || !payment) {
    logger.warn({ event: evt.event }, 'subscription.charged webhook missing subscription or payment entity — ignoring')
    return
  }

  await paymentService.confirmSubscriptionCharge({
    razorpaySubscriptionId: subscription.id,
    razorpayPaymentId: payment.id,
    amountInSubunits: payment.amount,
    currentStart: subscription.current_start,
    currentEnd: subscription.current_end,
    chargeAt: subscription.charge_at,
  })
}
