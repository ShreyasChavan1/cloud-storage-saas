import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env'

/**
 * Thin wrapper around the Razorpay Node SDK for Phase 11A. This is the
 * ONLY place RAZORPAY_KEY_SECRET is read — same isolation principle as
 * NextcloudService.ts and the provisioning agent's own admin credentials:
 * callers get typed results, never the secret itself.
 *
 * No webhook handling here — Phase 11A is explicitly the synchronous
 * create-order / verify-payment flow only. See backend/README.md's Phase
 * 11A section for why webhooks, recurring billing, and reconciliation are
 * out of scope for this phase.
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
}
