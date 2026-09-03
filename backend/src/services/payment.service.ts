import { randomUUID } from 'crypto'
import { prisma } from '../database/prisma'
import { userRepository } from '../repositories/user.repository'
import { planRepository } from '../repositories/plan.repository'
import { paymentRepository } from '../repositories/payment.repository'
import { subscriptionRepository } from '../repositories/subscription.repository'
import { razorpayService } from './RazorpayService'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { toPaymentDTO, PaymentDTO } from '../models/payment.model'
import { toSubscriptionDTO, SubscriptionDTO, SubscriptionWithPlan } from '../models/subscription.model'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'
import { env } from '../config/env'
import { DEFAULT_PLAN_NAME, SUBSCRIPTION_PERIOD_DAYS, RENEWAL_WINDOW_DAYS } from '../config/plans'
import { Plan } from '@prisma/client'
import { CreateOrderInput, VerifyPaymentInput, UpgradePlanInput } from '../validators/payment.validator'

function renewalDateFromNow(): Date {
  return new Date(Date.now() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Shared by every path that actually changes what plan a user is on —
 * the post-payment path (verifyPayment) and the two no-payment paths
 * (upgradePlan for a free plan, cancelSubscription reverting to Free).
 * Everything about "what does changing a user's plan mean" lives here
 * exactly once: update Subscription + User.planId atomically, then
 * best-effort sync the real Nextcloud quota to match.
 *
 * The Subscription+User write is one Postgres transaction (all-or-nothing
 * at the DB level); the Nextcloud call is deliberately NOT part of it —
 * you can't put an external HTTP call inside a Postgres transaction
 * meaningfully, and holding one open across a slow network call would be
 * its own problem. See the try/catch below for how a failure there is
 * handled instead.
 */
async function applyPlanChange(
  userId: string,
  plan: Plan,
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED'
): Promise<{ subscription: SubscriptionWithPlan; quotaSynced: boolean }> {
  const user = await userRepository.findById(userId)
  if (!user) throw ApiError.notFound('User not found')

  const renewalDate = renewalDateFromNow()
  // quotaSyncedAt: null on every change, even one that ends up syncing
  // successfully a few lines down — a fresh plan change always starts
  // "not yet confirmed synced" until this function's own Nextcloud call
  // (if any) actually succeeds, never inheriting a previous plan's sync
  // timestamp.
  //
  // cancelAtPeriodEnd: false on every change (Phase 11B) — any previously
  // scheduled period-end cancellation is implicitly abandoned the moment
  // the user's plan actually changes again, whatever caused that change
  // (a fresh purchase, a renewal, an admin-driven free downgrade, ...).
  //
  // Uses prisma.$transaction's interactive-callback form, talking to `tx`
  // directly rather than through subscriptionRepository/userRepository —
  // atomicity across two tables needs both writes to run on the exact
  // same transaction client, and those repositories' existing methods are
  // built around the top-level `prisma` singleton (several already have
  // explicit `Promise<...>` return types that erase Prisma's own
  // PrismaPromise marker type, which the array form of $transaction
  // requires of every argument — this actually fails at runtime, not just
  // in type-checking, if you try). Changing those signatures just for
  // this one call would ripple into every other place that already calls
  // them, which is more invasive than reaching for `tx` directly here.
  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.upsert({
      where: { userId },
      create: { userId, planId: plan.id, status, renewalDate, quotaSyncedAt: null, cancelAtPeriodEnd: false },
      update: { planId: plan.id, status, renewalDate, quotaSyncedAt: null, cancelAtPeriodEnd: false },
      include: { plan: true },
    })
    await tx.user.update({ where: { id: userId }, data: { planId: plan.id } })
    return sub
  })

  let quotaSynced = false
  if (!user.nextcloudUsername) {
    // Shouldn't happen for any account that completed registration (see
    // userProvisioning.service.ts), but this function shouldn't assume
    // that's always true either.
    logger.warn({ userId }, 'Plan change saved but user has no provisioned Nextcloud account to sync quota to')
  } else {
    try {
      await nextcloudService.setQuota(user.nextcloudUsername, plan.storageLimit)
      await subscriptionRepository.markQuotaSynced(subscription.id, new Date())
      quotaSynced = true
    } catch (err) {
      // The plan change above is already durably committed — deliberately
      // NOT rolled back just because Nextcloud is unreachable. For the
      // paid path, a real charge already happened; for the free path,
      // there was never a charge to protect either way — in both cases
      // the entitlement is real and reverting it because of a transient
      // problem talking to Nextcloud would be the wrong failure mode.
      // subscription.quotaSyncedAt stays null as the honest marker for
      // whatever eventually reconciles this (see backend/README.md's
      // Phase 11A section — no such reconciliation exists yet, by design).
      const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
      logger.error({ userId, planId: plan.id, detail }, 'Plan change saved but Nextcloud quota sync failed')
    }
  }

  return { subscription, quotaSynced }
}

export const paymentService = {
  async createOrder(
    userId: string,
    input: CreateOrderInput
  ): Promise<{ orderId: string; amount: number; currency: string; keyId: string; paymentId: string }> {
    const plan = await planRepository.findById(input.planId)
    if (!plan) throw ApiError.badRequest('Invalid plan')
    if (Number(plan.price) <= 0) {
      throw ApiError.badRequest(
        'This plan has no cost — use POST /payments/upgrade-plan instead, no payment required'
      )
    }

    const current = await subscriptionRepository.findByUserId(userId)
    if (current && current.planId === plan.id && current.status === 'ACTIVE') {
      // Phase 11B: repurchasing the plan you're already on is only
      // rejected outright while you're well inside your current billing
      // period. Inside RENEWAL_WINDOW_DAYS of renewalDate (or past it
      // entirely — e.g. a PAST_DUE-bound subscription the user gets to
      // before reconciliation.service.ts's grace window runs out), it's
      // legitimately a renewal purchase: fall through and let it create a
      // new order the same as any other plan change, which verifyPayment/
      // confirmPayment's applyPlanChange call will extend renewalDate by.
      const renewalWindowStart = new Date(
        current.renewalDate.getTime() - RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000
      )
      if (new Date() < renewalWindowStart) {
        throw ApiError.badRequest('You are already on this plan')
      }
    }

    // Smallest currency unit (paise for INR, cents for USD, ...) — Plan
    // stores a plain decimal amount with no currency of its own (see
    // schema.prisma), RAZORPAY_CURRENCY is what decides the unit here.
    const amountInSubunits = Math.round(Number(plan.price) * 100)

    // A short, opaque, unique string — Razorpay caps `receipt` at 40
    // characters, and the actual userId/planId linkage lives in `notes`
    // (and, more durably, on the Payment row itself) rather than being
    // encoded into this at all.
    const receipt = randomUUID()

    const order = await razorpayService.createOrder({
      amountInSubunits,
      currency: env.RAZORPAY_CURRENCY,
      receipt,
      notes: { userId, planId: plan.id },
    })

    // Created once, here, with status PENDING — verifyPayment below only
    // ever updates this exact row by its providerOrderId, never creates a
    // second one. That's what makes a replayed/duplicated verify call
    // safe by construction, not an extra check bolted on afterward.
    const payment = await paymentRepository.create({
      userId,
      planId: plan.id,
      amount: plan.price,
      provider: 'razorpay',
      providerOrderId: order.id,
    })

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      // Safe to return — see RazorpayService.ts's comment on `keyId`.
      keyId: razorpayService.keyId,
      paymentId: payment.id,
    }
  },

  async verifyPayment(
    userId: string,
    input: VerifyPaymentInput
  ): Promise<{ payment: PaymentDTO; subscription: SubscriptionDTO; quotaSynced: boolean }> {
    const payment = await paymentRepository.findByProviderOrderId(input.razorpayOrderId)
    if (!payment) throw ApiError.notFound('No matching order found')
    if (payment.userId !== userId) throw ApiError.forbidden('This order does not belong to you')

    // Idempotency: already fully processed. Return the current state
    // again rather than re-running any side effect — this, not the
    // uniqueness constraints in schema.prisma, is what makes a replayed
    // verify-payment call for an already-succeeded order a no-op instead
    // of a duplicate subscription/quota-sync attempt. The DB constraints
    // guard a different failure mode (two requests racing each other),
    // not a client simply calling this twice.
    if (payment.status === 'SUCCEEDED') {
      const subscription = await subscriptionRepository.findByUserId(userId)
      if (!subscription) {
        // Not reachable in normal operation — a SUCCEEDED payment always
        // has a subscription created in the same call that succeeded it,
        // below. Fail loudly rather than silently invent one.
        throw ApiError.internal('Payment was verified but no subscription exists for this user')
      }
      return {
        payment: toPaymentDTO(payment),
        subscription: toSubscriptionDTO(subscription),
        quotaSynced: !!subscription.quotaSyncedAt,
      }
    }

    if (payment.status !== 'PENDING') {
      // FAILED — this order was already resolved, just not successfully.
      // Don't let a stale/replayed call resurrect it into a fresh attempt.
      throw ApiError.badRequest(`This payment is already marked ${payment.status.toLowerCase()}`)
    }

    const validSignature = razorpayService.verifyPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })

    if (!validSignature) {
      await paymentRepository.markFailed(payment.id)
      throw ApiError.badRequest('Invalid payment signature')
    }

    if (!payment.planId) {
      // Not reachable — createOrder always sets this — but upgrading to
      // "nothing" would be a worse failure mode than an explicit error.
      throw ApiError.internal('This payment has no associated plan')
    }
    const plan = await planRepository.findById(payment.planId)
    if (!plan) throw ApiError.internal('The plan for this payment no longer exists')

    const { subscription, quotaSynced } = await applyPlanChange(userId, plan, 'ACTIVE')

    // Linking + marking SUCCEEDED happens after applyPlanChange's own
    // transaction commits, not inside it — Payment.subscriptionId can
    // only be set once the subscription's id is known, and Prisma's
    // array-form $transaction (used above, deliberately, to avoid
    // reworking the repository layer's method signatures just for this —
    // see applyPlanChange's own comment) can't reference one write's
    // result from another within the same batch. A crash in the narrow
    // gap between them is safely recoverable: retrying verify-payment
    // re-verifies the same (deterministic) signature and re-runs
    // applyPlanChange, which converges to the same state via upsert
    // rather than duplicating anything.
    const succeededPayment = await paymentRepository.markSucceeded(payment.id, {
      providerPaymentId: input.razorpayPaymentId,
      subscriptionId: subscription.id,
    })

    return { payment: toPaymentDTO(succeededPayment), subscription: toSubscriptionDTO(subscription), quotaSynced }
  },

  // Phase 11B — the webhook counterpart to verifyPayment above, used by
  // webhook.service.ts's `payment.captured` handler. Deliberately a
  // separate, independent flow rather than a refactor of verifyPayment to
  // share code: webhook deliveries have no userId to check ownership
  // against (Razorpay isn't a logged-in user) and no checkout-callback
  // signature to verify (that's verifyPaymentSignature's separate formula
  // — the webhook's own signature is already verified by
  // webhook.service.ts before this is ever called, over the raw request
  // body, via razorpayService.verifyWebhookSignature). What IS shared is
  // the one thing that actually matters for consistency: applyPlanChange.
  //
  // Exists as its own top-level flow specifically so verifyPayment's
  // already-tested behavior (its exact error codes/messages for a
  // not-PENDING order, its userId ownership check, etc.) isn't disturbed
  // by webhook concerns it was never written to handle.
  //
  // Returns null if providerOrderId doesn't match any Payment this
  // backend created (e.g. a Razorpay order made directly in the dashboard,
  // never touching create-order) — the caller decides how to log that, it
  // isn't this function's error to throw.
  async confirmPayment(
    providerOrderId: string,
    providerPaymentId: string
  ): Promise<{ payment: PaymentDTO; subscription: SubscriptionDTO; quotaSynced: boolean } | null> {
    const payment = await paymentRepository.findByProviderOrderId(providerOrderId)
    if (!payment) return null

    // Idempotent for the same reason verifyPayment's own SUCCEEDED
    // short-circuit is: a webhook can be (and per Razorpay's own retry
    // policy, will be) delivered more than once for the same event, and
    // verify-payment may well have already confirmed this exact payment
    // via the checkout callback before the webhook even arrives.
    if (payment.status === 'SUCCEEDED') {
      const subscription = await subscriptionRepository.findByUserId(payment.userId)
      if (!subscription) {
        throw ApiError.internal('Payment was verified but no subscription exists for this user')
      }
      return {
        payment: toPaymentDTO(payment),
        subscription: toSubscriptionDTO(subscription),
        quotaSynced: !!subscription.quotaSyncedAt,
      }
    }

    if (payment.status !== 'PENDING') {
      // Already FAILED or REFUNDED — a payment.captured delivery arriving
      // after that is a genuine conflict (a race with a payment.failed/
      // refund webhook, most likely), not something to silently resurrect.
      // 409, not 400: nothing about *this* webhook call is malformed, the
      // resource it refers to has just already moved on.
      throw ApiError.conflict(`Cannot confirm payment already marked ${payment.status.toLowerCase()}`)
    }

    if (!payment.planId) {
      throw ApiError.internal('This payment has no associated plan')
    }
    const plan = await planRepository.findById(payment.planId)
    if (!plan) throw ApiError.internal('The plan for this payment no longer exists')

    const { subscription, quotaSynced } = await applyPlanChange(payment.userId, plan, 'ACTIVE')
    const succeededPayment = await paymentRepository.markSucceeded(payment.id, {
      providerPaymentId,
      subscriptionId: subscription.id,
    })

    return { payment: toPaymentDTO(succeededPayment), subscription: toSubscriptionDTO(subscription), quotaSynced }
  },

  // The no-payment path — a plan with no cost, so there's nothing for
  // Razorpay to do at all. Rejects any plan with a real price so this
  // can't be used to bypass create-order/verify-payment for a paid plan.
  async upgradePlan(
    userId: string,
    input: UpgradePlanInput
  ): Promise<{ subscription: SubscriptionDTO; quotaSynced: boolean }> {
    const plan = await planRepository.findById(input.planId)
    if (!plan) throw ApiError.badRequest('Invalid plan')
    if (Number(plan.price) > 0) {
      throw ApiError.badRequest(
        'This plan requires payment — use POST /payments/create-order and /payments/verify-payment instead'
      )
    }

    const current = await subscriptionRepository.findByUserId(userId)
    if (current && current.planId === plan.id && current.status === 'ACTIVE') {
      throw ApiError.badRequest('You are already on this plan')
    }

    const { subscription, quotaSynced } = await applyPlanChange(userId, plan, 'ACTIVE')
    return { subscription: toSubscriptionDTO(subscription), quotaSynced }
  },

  // Immediate-effect by default: reverts to the Free plan right away.
  // Phase 11B adds the other real, common pattern — `atPeriodEnd: true`
  // keeps the user on their current plan/quota until renewalDate, and
  // schedules the actual downgrade for reconciliation.service.ts's sweep
  // to carry out once that date arrives. The immediate-effect branch below
  // is otherwise byte-for-byte what Phase 11A shipped — every existing
  // caller that doesn't pass `options` gets exactly the old behavior.
  async cancelSubscription(
    userId: string,
    options: { atPeriodEnd?: boolean } = {}
  ): Promise<{ subscription: SubscriptionDTO; quotaSynced: boolean }> {
    const current = await subscriptionRepository.findByUserId(userId)
    if (!current || current.status === 'CANCELED') {
      throw ApiError.badRequest('No active subscription to cancel')
    }

    if (options.atPeriodEnd) {
      if (current.cancelAtPeriodEnd) {
        throw ApiError.badRequest('Cancellation is already scheduled for the end of the current billing period')
      }
      // No plan/quota change at all here — that's the whole point of
      // "at period end." Just flips the marker reconciliation.service.ts's
      // sweep acts on once renewalDate actually arrives.
      const updated = await subscriptionRepository.setCancelAtPeriodEnd(current.id, true)
      return { subscription: toSubscriptionDTO(updated), quotaSynced: !!updated.quotaSyncedAt }
    }

    const freePlan = await planRepository.findByName(DEFAULT_PLAN_NAME)
    if (!freePlan) {
      throw ApiError.internal(`Default plan "${DEFAULT_PLAN_NAME}" not found. Run "npm run prisma:seed".`)
    }

    const { subscription, quotaSynced } = await applyPlanChange(userId, freePlan, 'CANCELED')
    return { subscription: toSubscriptionDTO(subscription), quotaSynced }
  },

  // Phase 11B — used only by reconciliation.service.ts, when a PAST_DUE
  // subscription's grace window (PAST_DUE_GRACE_DAYS) elapses with no
  // renewal payment ever landing. Deliberately NOT the same code path as
  // cancelSubscription's immediate-effect branch even though both end up
  // downgrading to Free: this is an involuntary lapse (status EXPIRED),
  // that's a user's own choice (status CANCELED) — keeping them distinct
  // in Subscription.status is the entire reason schema.prisma already had
  // both values sitting unused since Phase 11A.
  async expireSubscriptionToFree(userId: string): Promise<{ subscription: SubscriptionDTO; quotaSynced: boolean }> {
    const freePlan = await planRepository.findByName(DEFAULT_PLAN_NAME)
    if (!freePlan) {
      throw ApiError.internal(`Default plan "${DEFAULT_PLAN_NAME}" not found. Run "npm run prisma:seed".`)
    }

    const { subscription, quotaSynced } = await applyPlanChange(userId, freePlan, 'EXPIRED')
    return { subscription: toSubscriptionDTO(subscription), quotaSynced }
  },
}
