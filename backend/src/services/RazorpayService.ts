import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env'

/**
 * Thin wrapper around the Razorpay Node SDK. This is the ONLY place
 * RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are read — same
 * isolation principle as NextcloudService.ts and the provisioning agent's
 * own admin credentials: callers get typed results/booleans, never the
 * secrets themselves.
 *
 * Phase 11A added the synchronous create-order / verify-payment flow.
 * Phase 11B adds webhook signature verification (see
 * verifyWebhookSignature below) so payment.service.ts and webhook.service.ts
 * can treat Razorpay's asynchronous webhook deliveries as an equally
 * authoritative source of truth — not just the checkout callback.
 */

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'RazorpayApiError'
  }
}

const client = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
})

export interface RazorpayOrderResult {
  id: string
  amount: number
  currency: string
}

export const razorpayService = {
  // RAZORPAY_KEY_ID is not secret — Razorpay's checkout widget needs the
  // public key id client-side, so this is deliberately exposed (unlike
  // the secret above) for POST /payments/create-order to return it.
  keyId: env.RAZORPAY_KEY_ID,

  /**
   * Creates a Razorpay order for `amountInSubunits` (the smallest unit of
   * `currency` — paise for INR, cents for USD, etc.; callers are
   * responsible for that conversion, this never assumes a currency).
   */
  async createOrder(params: {
    amountInSubunits: number
    currency: string
    receipt: string
    notes?: Record<string, string>
  }): Promise<RazorpayOrderResult> {
    let order
    try {
      order = await client.orders.create({
        amount: params.amountInSubunits,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      })
    } catch (err) {
      throw new RazorpayApiError('Could not create Razorpay order', err)
    }
    return { id: order.id, amount: Number(order.amount), currency: order.currency }
  },

  /**
   * Verifies the signature Razorpay's checkout hands back to the client
   * after a payment attempt. Deliberately hand-computed with Node's own
   * `crypto` rather than the SDK's `Razorpay.validateWebhookSignature` —
   * that helper covers a *different* flow (webhooks: HMAC over the raw
   * request body, using a separate webhook secret this app doesn't even
   * have configured). Checkout verification uses its own documented
   * formula instead: hmac_sha256(orderId + "|" + paymentId, key_secret).
   *
   * `crypto.timingSafeEqual` (not `===`) for the same reason this
   * codebase already uses it for the provisioning agent's bearer token
   * check (see admin.middleware's sibling, the agent's own auth.ts) —
   * comparing byte-by-byte in constant time avoids leaking anything via a
   * timing side channel, however small the practical risk here.
   */
  verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
    const expectedHex = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex')

    const expected = Buffer.from(expectedHex, 'hex')
    // Buffer.from(str, 'hex') silently stops at the first non-hex
    // character rather than throwing, so a malformed signature just
    // produces a mismatched-length buffer here — still safely rejected
    // below, never a thrown error a caller would need to handle specially.
    const provided = Buffer.from(params.signature, 'hex')
    if (expected.length !== provided.length) return false
    return crypto.timingSafeEqual(expected, provided)
  },

  /**
   * Verifies the `X-Razorpay-Signature` header on an incoming webhook
   * delivery. Per Razorpay's documented webhook formula — DIFFERENT from
   * verifyPaymentSignature above in two ways: it HMACs the raw request
   * body bytes (not an `orderId|paymentId` string), and it uses
   * RAZORPAY_WEBHOOK_SECRET (a separate secret configured in the Razorpay
   * dashboard's Webhooks section, not RAZORPAY_KEY_SECRET).
   *
   * `rawBody` must be the exact bytes Razorpay signed — see
   * webhook.controller.ts / app.ts for why that route is mounted with
   * express.raw() ahead of the app-wide express.json(). Passing an
   * already-parsed-then-reserialized body here would silently break
   * verification for any payload where re-serialization doesn't reproduce
   * the original bytes exactly.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const expectedHex = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')

    const expected = Buffer.from(expectedHex, 'hex')
    const provided = Buffer.from(signature, 'hex')
    if (expected.length !== provided.length) return false
    return crypto.timingSafeEqual(expected, provided)
  },

  verifySubscriptionSignature(params: { paymentId: string; subscriptionId: string; signature: string }): boolean {
    const expectedHex = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${params.paymentId}|${params.subscriptionId}`)
      .digest('hex')
    const expected = Buffer.from(expectedHex, 'hex')
    const provided = Buffer.from(params.signature, 'hex')
    if (expected.length !== provided.length) return false
    return crypto.timingSafeEqual(expected, provided)
  },

  /**
   * Returns the merchant's Razorpay subscription plans. The Dashboard is
   * the source of truth for plan name, amount and billing cadence; Nimbus
   * only exposes plans that are active and mapped to a local entitlement.
   */
  async listPlans(): Promise<Array<{
    id: string
    interval: number
    period: string
    item: {
      active: boolean
      name: string
      description: string | null
      amount: number
      unit_amount: number
      currency: string
    }
    notes: Record<string, string>
  }>> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    const items: Array<{ id: string; interval: number; period: string; item: { active: boolean; name: string; description: string | null; amount: number; unit_amount: number; currency: string }; notes: Record<string, string> }> = []

    for (let skip = 0; ; skip += 100) {
      let res: Response
      try {
        res = await fetch(`https://api.razorpay.com/v1/plans?count=100&skip=${skip}`, {
          method: 'GET',
          headers: { Authorization: `Basic ${auth}` },
        })
      } catch (err) {
        throw new RazorpayApiError('Could not reach Razorpay Plans API', err)
      }

      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
        throw new RazorpayApiError(`Could not fetch Razorpay plans (${detail})`)
      }

      const body = await res.json() as { items?: typeof items }
      const page = body.items ?? []
      items.push(...page)
      if (page.length < 100) break
    }

    return items
  },

  async fetchPayment(paymentId: string): Promise<{ id: string; orderId: string | null; amount: number; currency: string; status: string }> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    let res: Response
    try {
      res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      })
    } catch (err) {
      throw new RazorpayApiError('Could not reach Razorpay Payments API', err)
    }
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
      throw new RazorpayApiError(`Could not fetch Razorpay payment (${detail})`)
    }
    const body = await res.json() as { id: string; order_id?: string | null; amount: number; currency: string; status: string }
    return { id: body.id, orderId: body.order_id ?? null, amount: Number(body.amount), currency: body.currency, status: body.status }
  },

  async fetchSubscription(subscriptionId: string): Promise<{ id: string; planId: string; status: string; currentStart: number | null; currentEnd: number | null; chargeAt: number | null }> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    let res: Response
    try {
      res = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      })
    } catch (err) {
      throw new RazorpayApiError('Could not reach Razorpay Subscriptions API', err)
    }
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
      throw new RazorpayApiError(`Could not fetch Razorpay subscription (${detail})`)
    }
    const body = await res.json() as { id: string; plan_id: string; status: string; current_start?: number | null; current_end?: number | null; charge_at?: number | null }
    return { id: body.id, planId: body.plan_id, status: body.status, currentStart: body.current_start ?? null, currentEnd: body.current_end ?? null, chargeAt: body.charge_at ?? null }
  },

  async fetchPlan(planId: string): Promise<{ id: string; interval: number; period: string; item: { active: boolean; amount: number; unit_amount: number; currency: string; name: string; description: string | null } }> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    let res: Response
    try {
      res = await fetch(`https://api.razorpay.com/v1/plans/${encodeURIComponent(planId)}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      })
    } catch (err) {
      throw new RazorpayApiError('Could not reach Razorpay Plans API', err)
    }
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
      throw new RazorpayApiError(`Could not fetch Razorpay plan (${detail})`)
    }
    const body = await res.json() as { id: string; interval: number; period: string; item: { active: boolean; amount: number; unit_amount: number; currency: string; name: string; description?: string | null } }
    return { ...body, item: { ...body.item, description: body.item.description ?? null } }
  },

  async createSubscription(params: {
    planId: string
    totalCount: number
    quantity?: number
    customerNotify?: boolean
    notes?: Record<string, string>
  }): Promise<{ id: string; status: string; shortUrl: string | null; chargeAt: number | null; currentEnd: number | null }> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    let res: Response
    try {
      res = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: params.planId,
          total_count: params.totalCount,
          quantity: params.quantity ?? 1,
          customer_notify: params.customerNotify ?? true,
          notes: params.notes,
        }),
      })
    } catch (err) {
      throw new RazorpayApiError('Could not reach Razorpay Subscriptions API', err)
    }
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
      throw new RazorpayApiError(`Could not create Razorpay subscription (${detail})`)
    }
    const body = await res.json() as any
    return { id: body.id, status: body.status, shortUrl: body.short_url ?? null, chargeAt: body.charge_at ?? null, currentEnd: body.current_end ?? null }
  },

  async cancelSubscription(razorpaySubscriptionId: string, atCycleEnd: boolean): Promise<void> {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')
    let res: Response
    try {
      res = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd }),
      })
    } catch (err) {
      throw new RazorpayApiError('Could not reach Razorpay Subscriptions API', err)
    }
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const body = await res.json() as { error?: { description?: string } }; detail = body.error?.description ?? detail } catch {}
      throw new RazorpayApiError(`Could not cancel Razorpay subscription (${detail})`)
    }
  },
}
