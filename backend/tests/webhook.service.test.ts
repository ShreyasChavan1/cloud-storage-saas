import crypto from 'crypto'
import { ApiError } from '../src/utils/ApiError'

const mockVerifyWebhookSignature = jest.fn()
jest.mock('../src/services/RazorpayService', () => {
  const actual = jest.requireActual('../src/services/RazorpayService')
  return { ...actual, razorpayService: { verifyWebhookSignature: mockVerifyWebhookSignature } }
})

const mockConfirmPayment = jest.fn()
const mockCancelSubscription = jest.fn()
jest.mock('../src/services/payment.service', () => ({
  paymentService: { confirmPayment: mockConfirmPayment, cancelSubscription: mockCancelSubscription },
}))

const mockFindByProviderOrderId = jest.fn()
const mockFindByProviderPaymentId = jest.fn()
const mockMarkFailed = jest.fn()
const mockMarkRefunded = jest.fn()
jest.mock('../src/repositories/payment.repository', () => ({
  paymentRepository: {
    findByProviderOrderId: mockFindByProviderOrderId,
    findByProviderPaymentId: mockFindByProviderPaymentId,
    markFailed: mockMarkFailed,
    markRefunded: mockMarkRefunded,
  },
}))

const mockFindSubscriptionByUserId = jest.fn()
const mockMarkPastDue = jest.fn()
jest.mock('../src/repositories/subscription.repository', () => ({
  subscriptionRepository: { findByUserId: mockFindSubscriptionByUserId, markPastDue: mockMarkPastDue },
}))

const mockWebhookFindById = jest.fn()
const mockWebhookCreate = jest.fn()
const mockWebhookMarkProcessed = jest.fn()
const mockWebhookMarkFailed = jest.fn()
jest.mock('../src/repositories/webhookEvent.repository', () => ({
  webhookEventRepository: {
    findById: mockWebhookFindById,
    create: mockWebhookCreate,
    markProcessed: mockWebhookMarkProcessed,
    markFailed: mockWebhookMarkFailed,
  },
}))

import { webhookService } from '../src/services/webhook.service'

function rawBodyFor(payload: unknown): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf8')
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    userId: 'user-1',
    planId: 'plan-pro',
    status: 'PENDING',
    providerOrderId: 'order_123',
    providerPaymentId: null,
    subscriptionId: null,
    ...overrides,
  }
}

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return { id: 'sub-1', userId: 'user-1', planId: 'plan-pro', status: 'ACTIVE', ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockVerifyWebhookSignature.mockReturnValue(true)
  mockWebhookFindById.mockResolvedValue(null)
  mockWebhookCreate.mockResolvedValue(undefined)
  mockWebhookMarkProcessed.mockResolvedValue(undefined)
  mockWebhookMarkFailed.mockResolvedValue(undefined)
})

describe('webhookService.handleRazorpayWebhook — signature & envelope handling', () => {
  it('rejects a missing signature header without ever recording or processing the delivery', async () => {
    const rawBody = rawBodyFor({ event: 'payment.captured', payload: {} })
    await expect(webhookService.handleRazorpayWebhook(rawBody, undefined)).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mockWebhookCreate).not.toHaveBeenCalled()
  })

  it('rejects an invalid signature without recording or processing the delivery', async () => {
    mockVerifyWebhookSignature.mockReturnValue(false)
    const rawBody = rawBodyFor({ event: 'payment.captured', payload: {} })
    await expect(webhookService.handleRazorpayWebhook(rawBody, 'bad-sig')).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mockWebhookCreate).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON after a valid signature check', async () => {
    const rawBody = Buffer.from('not json at all', 'utf8')
    await expect(webhookService.handleRazorpayWebhook(rawBody, 'sig')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a payload with no "event" field', async () => {
    const rawBody = rawBodyFor({ payload: {} })
    await expect(webhookService.handleRazorpayWebhook(rawBody, 'sig')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('is a no-op for an unrecognized event type, but still records + marks it processed', async () => {
    const rawBody = rawBodyFor({ event: 'some.future.event', payload: {} })
    const result = await webhookService.handleRazorpayWebhook(rawBody, 'sig')

    expect(result).toEqual({ status: 'ok' })
    expect(mockWebhookCreate).toHaveBeenCalled()
    expect(mockWebhookMarkProcessed).toHaveBeenCalled()
  })

  it('skips reprocessing a delivery already marked PROCESSED — full idempotency at the transport level', async () => {
    mockWebhookFindById.mockResolvedValue({ id: 'evt-hash', status: 'PROCESSED' })
    const rawBody = rawBodyFor({ event: 'payment.captured', payload: { payment: { entity: { id: 'p', order_id: 'o' } } } })

    const result = await webhookService.handleRazorpayWebhook(rawBody, 'sig')

    expect(result).toEqual({ status: 'duplicate' })
    expect(mockConfirmPayment).not.toHaveBeenCalled()
    expect(mockWebhookCreate).not.toHaveBeenCalled()
  })

  it('retries a delivery previously left at RECEIVED (a prior attempt crashed mid-processing)', async () => {
    mockWebhookFindById.mockResolvedValue({ id: 'evt-hash', status: 'RECEIVED' })
    mockConfirmPayment.mockResolvedValue({
      payment: paymentRow({ status: 'SUCCEEDED' }),
      subscription: subscriptionRow(),
      quotaSynced: true,
    })
    const rawBody = rawBodyFor({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_123' } } },
    })

    const result = await webhookService.handleRazorpayWebhook(rawBody, 'sig')

    expect(result).toEqual({ status: 'ok' })
    expect(mockConfirmPayment).toHaveBeenCalledWith('order_123', 'pay_1')
    // Not re-created (it already existed), but IS marked processed now.
    expect(mockWebhookCreate).not.toHaveBeenCalled()
    expect(mockWebhookMarkProcessed).toHaveBeenCalled()
  })

  it('marks the WebhookEvent row FAILED and re-throws when the handler itself throws', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('db exploded'))
    const rawBody = rawBodyFor({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_123' } } },
    })

    await expect(webhookService.handleRazorpayWebhook(rawBody, 'sig')).rejects.toThrow('db exploded')
    expect(mockWebhookMarkFailed).toHaveBeenCalledWith(expect.any(String), 'db exploded')
    expect(mockWebhookMarkProcessed).not.toHaveBeenCalled()
  })

  it('the idempotency key is a deterministic hash of the exact raw body', async () => {
    const rawBody = rawBodyFor({ event: 'some.future.event', payload: {} })
    const expectedId = crypto.createHash('sha256').update(rawBody).digest('hex')

    await webhookService.handleRazorpayWebhook(rawBody, 'sig')

    expect(mockWebhookFindById).toHaveBeenCalledWith(expectedId)
    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: expectedId, eventType: 'some.future.event' })
    )
  })
})

describe('webhookService — payment.captured', () => {
  function captured(entity: Record<string, unknown>) {
    return rawBodyFor({ event: 'payment.captured', payload: { payment: { entity } } })
  }

  it('confirms the payment via paymentService.confirmPayment', async () => {
    mockConfirmPayment.mockResolvedValue({
      payment: paymentRow({ status: 'SUCCEEDED' }),
      subscription: subscriptionRow(),
      quotaSynced: true,
    })

    await webhookService.handleRazorpayWebhook(captured({ id: 'pay_1', order_id: 'order_123' }), 'sig')

    expect(mockConfirmPayment).toHaveBeenCalledWith('order_123', 'pay_1')
  })

  it('ignores (but still marks processed) an order this backend never created', async () => {
    mockConfirmPayment.mockResolvedValue(null)
    const result = await webhookService.handleRazorpayWebhook(captured({ id: 'pay_1', order_id: 'order_ghost' }), 'sig')
    expect(result).toEqual({ status: 'ok' })
  })

  it('swallows a 409 conflict from confirmPayment (already FAILED/REFUNDED) rather than failing the delivery', async () => {
    const conflict = ApiError.conflict('already refunded')
    mockConfirmPayment.mockRejectedValue(conflict)

    const result = await webhookService.handleRazorpayWebhook(captured({ id: 'pay_1', order_id: 'order_123' }), 'sig')
    expect(result).toEqual({ status: 'ok' })
  })

  it('re-throws (and marks the delivery FAILED) for a non-conflict error from confirmPayment', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('db unreachable'))
    await expect(
      webhookService.handleRazorpayWebhook(captured({ id: 'pay_1', order_id: 'order_123' }), 'sig')
    ).rejects.toThrow('db unreachable')
  })
})

describe('webhookService — payment.failed', () => {
  function failed(entity: Record<string, unknown>) {
    return rawBodyFor({ event: 'payment.failed', payload: { payment: { entity } } })
  }

  it('marks a PENDING payment FAILED', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'PENDING' }))
    mockFindSubscriptionByUserId.mockResolvedValue(null)

    await webhookService.handleRazorpayWebhook(failed({ id: 'pay_1', order_id: 'order_123' }), 'sig')

    expect(mockMarkFailed).toHaveBeenCalledWith('payment-1')
  })

  it('marks the subscription PAST_DUE when the failed payment was a renewal of the plan the user is currently on', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'PENDING', planId: 'plan-pro' }))
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'ACTIVE', planId: 'plan-pro' }))

    await webhookService.handleRazorpayWebhook(failed({ id: 'pay_1', order_id: 'order_123' }), 'sig')

    expect(mockMarkPastDue).toHaveBeenCalledWith('sub-1')
  })

  it('does NOT mark the subscription PAST_DUE for a failed attempt to switch to a different plan', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'PENDING', planId: 'plan-enterprise' }))
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'ACTIVE', planId: 'plan-pro' }))

    await webhookService.handleRazorpayWebhook(failed({ id: 'pay_1', order_id: 'order_123' }), 'sig')

    expect(mockMarkPastDue).not.toHaveBeenCalled()
  })

  it('ignores a failure notification for a payment that already SUCCEEDED elsewhere', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'SUCCEEDED' }))

    await webhookService.handleRazorpayWebhook(failed({ id: 'pay_1', order_id: 'order_123' }), 'sig')

    expect(mockMarkFailed).not.toHaveBeenCalled()
    expect(mockMarkPastDue).not.toHaveBeenCalled()
  })

  it('ignores an unknown order id', async () => {
    mockFindByProviderOrderId.mockResolvedValue(null)
    await webhookService.handleRazorpayWebhook(failed({ id: 'pay_1', order_id: 'order_ghost' }), 'sig')
    expect(mockMarkFailed).not.toHaveBeenCalled()
  })
})

describe('webhookService — refund.created / refund.processed', () => {
  function refund(event: string, entity: Record<string, unknown>) {
    return rawBodyFor({ event, payload: { refund: { entity } } })
  }

  it('marks a SUCCEEDED payment REFUNDED and reverts the funded subscription to Free', async () => {
    mockFindByProviderPaymentId.mockResolvedValue(
      paymentRow({ status: 'SUCCEEDED', subscriptionId: 'sub-1' })
    )
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ id: 'sub-1', status: 'ACTIVE' }))
    mockCancelSubscription.mockResolvedValue({ subscription: subscriptionRow({ status: 'CANCELED' }), quotaSynced: true })

    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')

    expect(mockMarkRefunded).toHaveBeenCalledWith('payment-1')
    expect(mockCancelSubscription).toHaveBeenCalledWith('user-1')
  })

  it('is idempotent across refund.created followed by refund.processed for the same refund', async () => {
    mockFindByProviderPaymentId.mockResolvedValueOnce(paymentRow({ status: 'SUCCEEDED', subscriptionId: 'sub-1' }))
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ id: 'sub-1', status: 'ACTIVE' }))
    mockCancelSubscription.mockResolvedValue({ subscription: subscriptionRow({ status: 'CANCELED' }), quotaSynced: true })

    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')

    // Second delivery: the payment is now REFUNDED.
    mockFindByProviderPaymentId.mockResolvedValueOnce(paymentRow({ status: 'REFUNDED', subscriptionId: 'sub-1' }))

    await webhookService.handleRazorpayWebhook(refund('refund.processed', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')

    expect(mockMarkRefunded).toHaveBeenCalledTimes(1)
    expect(mockCancelSubscription).toHaveBeenCalledTimes(1)
  })

  it('does not downgrade a subscription the refunded payment no longer funds (superseded by a later payment)', async () => {
    mockFindByProviderPaymentId.mockResolvedValue(
      paymentRow({ status: 'SUCCEEDED', subscriptionId: 'old-sub' })
    )
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ id: 'sub-1', status: 'ACTIVE' }))

    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')

    expect(mockMarkRefunded).toHaveBeenCalledWith('payment-1')
    expect(mockCancelSubscription).not.toHaveBeenCalled()
  })

  it('ignores a refund for a payment that was never SUCCEEDED', async () => {
    mockFindByProviderPaymentId.mockResolvedValue(paymentRow({ status: 'PENDING' }))
    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')
    expect(mockMarkRefunded).not.toHaveBeenCalled()
  })

  it('ignores a refund for an unknown payment id', async () => {
    mockFindByProviderPaymentId.mockResolvedValue(null)
    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_ghost' }), 'sig')
    expect(mockMarkRefunded).not.toHaveBeenCalled()
  })

  it('does not call cancelSubscription again if the subscription is already CANCELED', async () => {
    mockFindByProviderPaymentId.mockResolvedValue(
      paymentRow({ status: 'SUCCEEDED', subscriptionId: 'sub-1' })
    )
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ id: 'sub-1', status: 'CANCELED' }))

    await webhookService.handleRazorpayWebhook(refund('refund.created', { id: 'rfnd_1', payment_id: 'pay_1' }), 'sig')

    expect(mockMarkRefunded).toHaveBeenCalledWith('payment-1')
    expect(mockCancelSubscription).not.toHaveBeenCalled()
  })
})
