import crypto from 'crypto'

const mockOrdersCreate = jest.fn()

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
  }))
})

import { razorpayService, RazorpayApiError } from '../src/services/RazorpayService'

// Matches tests/jest.setup.ts's fallback value — real HMACs computed
// against this so the test doesn't depend on whatever's actually in the
// environment at run time.
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!

function realSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
}

describe('razorpayService.verifyPaymentSignature', () => {
  it('accepts a correctly computed signature', () => {
    const orderId = 'order_abc123'
    const paymentId = 'pay_xyz789'
    const signature = realSignature(orderId, paymentId)

    expect(razorpayService.verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true)
  })

  it('rejects a signature computed with the wrong payment id', () => {
    const orderId = 'order_abc123'
    const signature = realSignature(orderId, 'pay_xyz789')

    expect(
      razorpayService.verifyPaymentSignature({ orderId, paymentId: 'pay_someone_else', signature })
    ).toBe(false)
  })

  it('rejects a signature computed with the wrong order id', () => {
    const paymentId = 'pay_xyz789'
    const signature = realSignature('order_abc123', paymentId)

    expect(
      razorpayService.verifyPaymentSignature({ orderId: 'order_different', paymentId, signature })
    ).toBe(false)
  })

  it('rejects a signature computed with a different secret (e.g. a forged one)', () => {
    const orderId = 'order_abc123'
    const paymentId = 'pay_xyz789'
    const forged = crypto.createHmac('sha256', 'not-the-real-secret').update(`${orderId}|${paymentId}`).digest('hex')

    expect(razorpayService.verifyPaymentSignature({ orderId, paymentId, signature: forged })).toBe(false)
  })

  it('rejects a garbage/malformed signature without throwing', () => {
    expect(() =>
      razorpayService.verifyPaymentSignature({
        orderId: 'order_abc123',
        paymentId: 'pay_xyz789',
        signature: 'not-valid-hex-at-all!!',
      })
    ).not.toThrow()
    expect(
      razorpayService.verifyPaymentSignature({
        orderId: 'order_abc123',
        paymentId: 'pay_xyz789',
        signature: 'not-valid-hex-at-all!!',
      })
    ).toBe(false)
  })

  it('rejects an empty signature without throwing', () => {
    expect(
      razorpayService.verifyPaymentSignature({ orderId: 'order_abc123', paymentId: 'pay_xyz789', signature: '' })
    ).toBe(false)
  })
})

describe('razorpayService.verifyWebhookSignature (Phase 11B)', () => {
  // Matches tests/jest.setup.ts's fallback value, same pattern as
  // KEY_SECRET above — deliberately a DIFFERENT env var/secret from
  // verifyPaymentSignature's, since that's the whole point of this being
  // a separate method with a separate formula.
  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!

  function realWebhookSignature(rawBody: string): string {
    return crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
  }

  it('accepts a correctly computed signature over the raw body', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} })
    const signature = realWebhookSignature(rawBody)

    expect(razorpayService.verifyWebhookSignature(rawBody, signature)).toBe(true)
  })

  it('accepts a Buffer body identically to the equivalent string', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} })
    const signature = realWebhookSignature(rawBody)

    expect(razorpayService.verifyWebhookSignature(Buffer.from(rawBody, 'utf8'), signature)).toBe(true)
  })

  it('rejects a signature computed over a different body — e.g. one byte changed in transit', () => {
    const original = JSON.stringify({ event: 'payment.captured', payload: { a: 1 } })
    const tampered = JSON.stringify({ event: 'payment.captured', payload: { a: 2 } })
    const signature = realWebhookSignature(original)

    expect(razorpayService.verifyWebhookSignature(tampered, signature)).toBe(false)
  })

  it('rejects a signature computed with a different (e.g. forged, or the wrong) secret', () => {
    const rawBody = JSON.stringify({ event: 'refund.created', payload: {} })
    const forged = crypto.createHmac('sha256', 'not-the-real-webhook-secret').update(rawBody).digest('hex')

    expect(razorpayService.verifyWebhookSignature(rawBody, forged)).toBe(false)
  })

  it("rejects verifyPaymentSignature's own HMAC formula/secret being reused here by mistake", () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} })
    // Uses RAZORPAY_KEY_SECRET (verifyPaymentSignature's secret), not
    // RAZORPAY_WEBHOOK_SECRET — must NOT verify against this method.
    const wrongSecretSignature = crypto.createHmac('sha256', KEY_SECRET).update(rawBody).digest('hex')

    expect(razorpayService.verifyWebhookSignature(rawBody, wrongSecretSignature)).toBe(false)
  })

  it('rejects a garbage/malformed signature without throwing', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} })
    expect(() => razorpayService.verifyWebhookSignature(rawBody, 'not-valid-hex-at-all!!')).not.toThrow()
    expect(razorpayService.verifyWebhookSignature(rawBody, 'not-valid-hex-at-all!!')).toBe(false)
  })

  it('rejects an empty signature without throwing', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} })
    expect(razorpayService.verifyWebhookSignature(rawBody, '')).toBe(false)
  })
})

describe('razorpayService.createOrder', () => {
  afterEach(() => jest.clearAllMocks())

  it('passes amount/currency/receipt/notes straight through and maps the result', async () => {
    mockOrdersCreate.mockResolvedValue({ id: 'order_new123', amount: 99900, currency: 'INR', status: 'created' })

    const result = await razorpayService.createOrder({
      amountInSubunits: 99900,
      currency: 'INR',
      receipt: 'receipt-1',
      notes: { userId: 'user-1', planId: 'plan-1' },
    })

    expect(mockOrdersCreate).toHaveBeenCalledWith({
      amount: 99900,
      currency: 'INR',
      receipt: 'receipt-1',
      notes: { userId: 'user-1', planId: 'plan-1' },
    })
    expect(result).toEqual({ id: 'order_new123', amount: 99900, currency: 'INR' })
  })

  it('wraps an SDK failure in RazorpayApiError rather than leaking it raw', async () => {
    mockOrdersCreate.mockRejectedValue(new Error('network blip'))

    await expect(
      razorpayService.createOrder({ amountInSubunits: 100, currency: 'INR', receipt: 'r' })
    ).rejects.toThrow(RazorpayApiError)
  })
})
