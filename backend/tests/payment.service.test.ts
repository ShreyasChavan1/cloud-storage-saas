const mockTxSubscriptionUpsert = jest.fn()
const mockTxUserUpdate = jest.fn()
const mockTx = {
  subscription: { upsert: mockTxSubscriptionUpsert },
  user: { update: mockTxUserUpdate },
}
// Mirrors prisma.$transaction's interactive-callback form closely enough
// to exercise applyPlanChange for real: invokes the callback with a `tx`
// whose two methods are controllable per test, and returns whatever the
// callback returns — same as the real thing.
const mockPrismaTransaction = jest.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx))

jest.mock('../src/database/prisma', () => ({
  prisma: { $transaction: mockPrismaTransaction },
}))

const mockFindUserById = jest.fn()
jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { findById: mockFindUserById },
}))

const mockFindPlanById = jest.fn()
const mockFindPlanByName = jest.fn()
jest.mock('../src/repositories/plan.repository', () => ({
  planRepository: { findById: mockFindPlanById, findByName: mockFindPlanByName },
}))

const mockPaymentCreate = jest.fn()
const mockFindByProviderOrderId = jest.fn()
const mockMarkSucceeded = jest.fn()
const mockMarkFailed = jest.fn()
jest.mock('../src/repositories/payment.repository', () => ({
  paymentRepository: {
    create: mockPaymentCreate,
    findByProviderOrderId: mockFindByProviderOrderId,
    markSucceeded: mockMarkSucceeded,
    markFailed: mockMarkFailed,
  },
}))

const mockFindSubscriptionByUserId = jest.fn()
const mockMarkQuotaSynced = jest.fn()
const mockSetCancelAtPeriodEnd = jest.fn()
jest.mock('../src/repositories/subscription.repository', () => ({
  subscriptionRepository: {
    findByUserId: mockFindSubscriptionByUserId,
    markQuotaSynced: mockMarkQuotaSynced,
    setCancelAtPeriodEnd: mockSetCancelAtPeriodEnd,
  },
}))

const mockBillingFindById = jest.fn()
const mockBillingCreate = jest.fn()
const mockBillingFindByRazorpaySubscriptionId = jest.fn()
const mockBillingFindByUserId = jest.fn()
const mockBillingFindActiveForUser = jest.fn()
const mockBillingFindForUserPlan = jest.fn()
const mockBillingUpdateStatus = jest.fn()
const mockBillingAttachLocalSubscription = jest.fn()
jest.mock('../src/repositories/billingSubscription.repository', () => ({
  billingSubscriptionRepository: {
    findById: mockBillingFindById,
    create: mockBillingCreate,
    findByRazorpaySubscriptionId: mockBillingFindByRazorpaySubscriptionId,
    findByUserId: mockBillingFindByUserId,
    findActiveForUser: mockBillingFindActiveForUser,
    findForUserPlan: mockBillingFindForUserPlan,
    updateStatus: mockBillingUpdateStatus,
    attachLocalSubscription: mockBillingAttachLocalSubscription,
  },
}))

const mockVerifyPaymentSignature = jest.fn()
const mockCreateOrder = jest.fn()
const mockCreateSubscription = jest.fn()
const mockVerifySubscriptionSignature = jest.fn()
const mockCancelSubscription = jest.fn()
jest.mock('../src/services/RazorpayService', () => {
  const actual = jest.requireActual('../src/services/RazorpayService')
  return {
    ...actual,
    razorpayService: { keyId: 'rzp_test_key', verifyPaymentSignature: mockVerifyPaymentSignature, createOrder: mockCreateOrder, createSubscription: mockCreateSubscription, verifySubscriptionSignature: mockVerifySubscriptionSignature, cancelSubscription: mockCancelSubscription },
  }
})

const mockSetQuota = jest.fn()
jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return { ...actual, nextcloudService: { setQuota: mockSetQuota } }
})

import { paymentService } from '../src/services/payment.service'
import { NextcloudApiError } from '../src/services/NextcloudService'

const USER_ID = 'user-1'

function userRow(overrides: Record<string, unknown> = {}) {
  return { id: USER_ID, nextcloudUsername: 'nc-user-1', ...overrides }
}

function planRow(overrides: Record<string, unknown> = {}) {
  return { id: 'plan-pro', name: 'Pro', storageLimit: 500, price: { toString: () => '24.99' } as any, ...overrides }
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    userId: USER_ID,
    planId: 'plan-pro',
    amount: { toString: () => '24.99' } as any,
    status: 'PENDING',
    provider: 'razorpay',
    providerOrderId: 'order_123',
    providerPaymentId: null,
    subscriptionId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: USER_ID,
    planId: 'plan-pro',
    status: 'ACTIVE',
    renewalDate: new Date('2026-02-01T00:00:00.000Z'),
    quotaSyncedAt: null,
    cancelAtPeriodEnd: false,
    plan: { id: 'plan-pro', name: 'Pro', storageLimit: 500, price: { toString: () => '24.99' } as any },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: the transaction's own subscription.upsert returns something
  // with a `plan` on it (matching what a real `include: { plan: true }`
  // upsert would) unless a test overrides it.
  mockTxSubscriptionUpsert.mockImplementation(async (args: any) =>
    subscriptionRow({ planId: args.create.planId, status: args.create.status })
  )
  mockTxUserUpdate.mockResolvedValue(undefined)
  mockBillingFindById.mockResolvedValue(null)
  mockBillingFindByRazorpaySubscriptionId.mockResolvedValue(null)
  mockBillingFindByUserId.mockResolvedValue([])
  mockBillingFindActiveForUser.mockResolvedValue(null)
  mockBillingFindForUserPlan.mockResolvedValue(null)
  mockBillingUpdateStatus.mockResolvedValue(undefined)
  mockBillingAttachLocalSubscription.mockResolvedValue(undefined)
})

describe('paymentService.createOrder', () => {
  it('rejects an unknown plan', async () => {
    mockFindPlanById.mockResolvedValue(null)
    await expect(paymentService.createOrder(USER_ID, { planId: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects a free ($0) plan, pointing at upgrade-plan instead', async () => {
    mockFindPlanById.mockResolvedValue(planRow({ price: { toString: () => '0.00' } }))
    await expect(paymentService.createOrder(USER_ID, { planId: 'plan-free' })).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockCreateOrder).not.toHaveBeenCalled()
  })

  it('rejects re-purchasing the plan the user is already actively on, well within the current period', async () => {
    mockFindPlanById.mockResolvedValue(planRow())
    mockFindSubscriptionByUserId.mockResolvedValue(
      subscriptionRow({ planId: 'plan-pro', status: 'ACTIVE', renewalDate: new Date('2099-01-01T00:00:00.000Z') })
    )

    await expect(paymentService.createOrder(USER_ID, { planId: 'plan-pro' })).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockCreateOrder).not.toHaveBeenCalled()
  })

  it('allows repurchasing the current plan as a renewal once inside the renewal window', async () => {
    const plan = planRow()
    mockFindPlanById.mockResolvedValue(plan)
    // renewalDate 3 days out — inside RENEWAL_WINDOW_DAYS (7)
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    mockFindSubscriptionByUserId.mockResolvedValue(
      subscriptionRow({ planId: 'plan-pro', status: 'ACTIVE', renewalDate: soon })
    )
    mockCreateOrder.mockResolvedValue({ id: 'order_renew1', amount: 2499, currency: 'INR' })
    mockPaymentCreate.mockResolvedValue(paymentRow({ id: 'payment-renew', providerOrderId: 'order_renew1' }))

    const result = await paymentService.createOrder(USER_ID, { planId: 'plan-pro' })

    expect(mockCreateOrder).toHaveBeenCalled()
    expect(result.orderId).toBe('order_renew1')
  })

  it('allows repurchasing the current plan once renewalDate has already passed', async () => {
    const plan = planRow()
    mockFindPlanById.mockResolvedValue(plan)
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    mockFindSubscriptionByUserId.mockResolvedValue(
      subscriptionRow({ planId: 'plan-pro', status: 'ACTIVE', renewalDate: past })
    )
    mockCreateOrder.mockResolvedValue({ id: 'order_renew2', amount: 2499, currency: 'INR' })
    mockPaymentCreate.mockResolvedValue(paymentRow({ id: 'payment-renew2', providerOrderId: 'order_renew2' }))

    await expect(paymentService.createOrder(USER_ID, { planId: 'plan-pro' })).resolves.toMatchObject({
      orderId: 'order_renew2',
    })
  })

  it('creates a Razorpay order in paise and a PENDING Payment row linked to it', async () => {
    const plan = planRow()
    mockFindPlanById.mockResolvedValue(plan)
    mockFindSubscriptionByUserId.mockResolvedValue(null)
    mockCreateOrder.mockResolvedValue({ id: 'order_new1', amount: 2499, currency: 'INR' })
    mockPaymentCreate.mockResolvedValue(paymentRow({ id: 'payment-new', providerOrderId: 'order_new1' }))

    const result = await paymentService.createOrder(USER_ID, { planId: 'plan-pro' })

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountInSubunits: 2499, notes: { userId: USER_ID, planId: 'plan-pro' } })
    )
    expect(mockPaymentCreate).toHaveBeenCalledWith({
      userId: USER_ID,
      planId: 'plan-pro',
      amount: plan.price,
      provider: 'razorpay',
      providerOrderId: 'order_new1',
    })
    expect(result).toEqual({
      orderId: 'order_new1',
      amount: 2499,
      currency: 'INR',
      keyId: 'rzp_test_key',
      paymentId: 'payment-new',
    })
  })
})

describe('paymentService.verifyPayment', () => {
  it('404s if no Payment row matches the given order id', async () => {
    mockFindByProviderOrderId.mockResolvedValue(null)
    await expect(
      paymentService.verifyPayment(USER_ID, {
        razorpayOrderId: 'order_ghost',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig',
      })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it("403s if the matched order belongs to a different user", async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ userId: 'someone-else' }))
    await expect(
      paymentService.verifyPayment(USER_ID, {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig',
      })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('marks the payment FAILED and rejects when the signature is invalid — without ever touching the subscription', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow())
    mockVerifyPaymentSignature.mockReturnValue(false)

    await expect(
      paymentService.verifyPayment(USER_ID, {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'bad-sig',
      })
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(mockMarkFailed).toHaveBeenCalledWith('payment-1')
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
    expect(mockSetQuota).not.toHaveBeenCalled()
  })

  it('rejects re-verifying a payment that is already FAILED, without re-running the signature check', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'FAILED' }))
    await expect(
      paymentService.verifyPayment(USER_ID, {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig',
      })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockVerifyPaymentSignature).not.toHaveBeenCalled()
  })

  it('on a valid signature: applies the plan change, links + succeeds the payment, and syncs quota', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow())
    mockVerifyPaymentSignature.mockReturnValue(true)
    mockFindPlanById.mockResolvedValue(planRow())
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)
    mockMarkSucceeded.mockResolvedValue(paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1' }))

    const result = await paymentService.verifyPayment(USER_ID, {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'good-sig',
    })

    expect(mockTxUserUpdate).toHaveBeenCalledWith({ where: { id: USER_ID }, data: { planId: 'plan-pro' } })
    expect(mockSetQuota).toHaveBeenCalledWith('nc-user-1', 500)
    expect(mockMarkSucceeded).toHaveBeenCalledWith('payment-1', {
      providerPaymentId: 'pay_1',
      subscriptionId: 'sub-1',
    })
    expect(result.quotaSynced).toBe(true)
    expect(result.subscription.status).toBe('ACTIVE')
  })

  it('still marks the payment SUCCEEDED even if the Nextcloud quota sync fails, and reports quotaSynced: false', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow())
    mockVerifyPaymentSignature.mockReturnValue(true)
    mockFindPlanById.mockResolvedValue(planRow())
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockRejectedValue(new NextcloudApiError('agent unreachable'))
    mockMarkSucceeded.mockResolvedValue(paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1' }))

    const result = await paymentService.verifyPayment(USER_ID, {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'good-sig',
    })

    expect(mockMarkSucceeded).toHaveBeenCalled()
    expect(mockMarkQuotaSynced).not.toHaveBeenCalled()
    expect(result.quotaSynced).toBe(false)
  })

  describe('replay / duplicate-verification safety', () => {
    it('short-circuits an already-SUCCEEDED order: no second signature check, plan change, or quota sync', async () => {
      mockFindByProviderOrderId.mockResolvedValue(
        paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1', subscriptionId: 'sub-1' })
      )
      mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ quotaSyncedAt: new Date() }))

      const result = await paymentService.verifyPayment(USER_ID, {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'whatever-is-sent-this-time',
      })

      expect(mockVerifyPaymentSignature).not.toHaveBeenCalled()
      expect(mockPrismaTransaction).not.toHaveBeenCalled()
      expect(mockSetQuota).not.toHaveBeenCalled()
      expect(mockMarkSucceeded).not.toHaveBeenCalled()
      expect(result.quotaSynced).toBe(true)
    })

    it('calling verifyPayment twice in a row for the same order only ever syncs quota and succeeds the payment once', async () => {
      const pending = paymentRow()
      mockFindByProviderOrderId.mockResolvedValueOnce(pending)
      mockVerifyPaymentSignature.mockReturnValue(true)
      mockFindPlanById.mockResolvedValue(planRow())
      mockFindUserById.mockResolvedValue(userRow())
      mockSetQuota.mockResolvedValue(undefined)
      mockMarkQuotaSynced.mockResolvedValue(undefined)
      const succeeded = paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1', subscriptionId: 'sub-1' })
      mockMarkSucceeded.mockResolvedValue(succeeded)

      const input = { razorpayOrderId: 'order_123', razorpayPaymentId: 'pay_1', razorpaySignature: 'good-sig' }
      await paymentService.verifyPayment(USER_ID, input)

      // Second call: the row this repository would now actually return is
      // the SUCCEEDED one from above — simulate that explicitly rather
      // than relying on shared mutable state between mocks.
      mockFindByProviderOrderId.mockResolvedValueOnce(succeeded)
      mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ quotaSyncedAt: new Date() }))

      await paymentService.verifyPayment(USER_ID, input)

      expect(mockSetQuota).toHaveBeenCalledTimes(1)
      expect(mockMarkSucceeded).toHaveBeenCalledTimes(1)
    })
  })
})

describe('paymentService.confirmPayment (Phase 11B — webhook path)', () => {
  it('returns null for an order this backend never created', async () => {
    mockFindByProviderOrderId.mockResolvedValue(null)
    const result = await paymentService.confirmPayment('order_ghost', 'pay_1')
    expect(result).toBeNull()
  })

  it('throws a 409 conflict for a payment already FAILED or REFUNDED', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow({ status: 'FAILED' }))
    await expect(paymentService.confirmPayment('order_123', 'pay_1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('is idempotent for an already-SUCCEEDED payment: no second plan change or quota sync', async () => {
    mockFindByProviderOrderId.mockResolvedValue(
      paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1', subscriptionId: 'sub-1' })
    )
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ quotaSyncedAt: new Date() }))

    const result = await paymentService.confirmPayment('order_123', 'pay_1')

    expect(mockPrismaTransaction).not.toHaveBeenCalled()
    expect(mockSetQuota).not.toHaveBeenCalled()
    expect(mockMarkSucceeded).not.toHaveBeenCalled()
    expect(result?.quotaSynced).toBe(true)
  })

  it('confirms a PENDING payment: applies the plan change, links + succeeds the payment, syncs quota', async () => {
    mockFindByProviderOrderId.mockResolvedValue(paymentRow())
    mockFindPlanById.mockResolvedValue(planRow())
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)
    mockMarkSucceeded.mockResolvedValue(paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1' }))

    const result = await paymentService.confirmPayment('order_123', 'pay_1')

    // No checkout-signature check here — that's verifyPayment's job, not
    // this webhook-facing flow's, which trusts the caller (webhook.service.ts)
    // to have already verified the webhook's own signature.
    expect(mockVerifyPaymentSignature).not.toHaveBeenCalled()
    expect(mockMarkSucceeded).toHaveBeenCalledWith('payment-1', {
      providerPaymentId: 'pay_1',
      subscriptionId: 'sub-1',
    })
    expect(result?.subscription.status).toBe('ACTIVE')
    expect(result?.quotaSynced).toBe(true)
  })

  it('calling it twice for the same order only ever succeeds the payment and syncs quota once', async () => {
    const pending = paymentRow()
    mockFindByProviderOrderId.mockResolvedValueOnce(pending)
    mockFindPlanById.mockResolvedValue(planRow())
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)
    const succeeded = paymentRow({ status: 'SUCCEEDED', providerPaymentId: 'pay_1', subscriptionId: 'sub-1' })
    mockMarkSucceeded.mockResolvedValue(succeeded)

    await paymentService.confirmPayment('order_123', 'pay_1')

    mockFindByProviderOrderId.mockResolvedValueOnce(succeeded)
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ quotaSyncedAt: new Date() }))

    await paymentService.confirmPayment('order_123', 'pay_1')

    expect(mockSetQuota).toHaveBeenCalledTimes(1)
    expect(mockMarkSucceeded).toHaveBeenCalledTimes(1)
  })
})

describe('paymentService.upgradePlan', () => {
  it('rejects an unknown plan', async () => {
    mockFindPlanById.mockResolvedValue(null)
    await expect(paymentService.upgradePlan(USER_ID, { planId: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects a plan that actually costs something, pointing at the paid flow instead', async () => {
    mockFindPlanById.mockResolvedValue(planRow())
    await expect(paymentService.upgradePlan(USER_ID, { planId: 'plan-pro' })).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it('rejects switching to the plan already active', async () => {
    const freePlan = planRow({ id: 'plan-free', name: 'Free', price: { toString: () => '0.00' } })
    mockFindPlanById.mockResolvedValue(freePlan)
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ planId: 'plan-free', status: 'ACTIVE' }))

    await expect(paymentService.upgradePlan(USER_ID, { planId: 'plan-free' })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('applies the free plan change directly, no Razorpay involved', async () => {
    const freePlan = planRow({ id: 'plan-free', name: 'Free', storageLimit: 5, price: { toString: () => '0.00' } })
    mockFindPlanById.mockResolvedValue(freePlan)
    mockFindSubscriptionByUserId.mockResolvedValue(null)
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)

    const result = await paymentService.upgradePlan(USER_ID, { planId: 'plan-free' })

    expect(mockCreateOrder).not.toHaveBeenCalled()
    expect(mockSetQuota).toHaveBeenCalledWith('nc-user-1', 5)
    expect(result.subscription.status).toBe('ACTIVE')
  })
})

describe('paymentService.cancelSubscription', () => {
  it('rejects when there is no subscription to cancel', async () => {
    mockFindSubscriptionByUserId.mockResolvedValue(null)
    await expect(paymentService.cancelSubscription(USER_ID)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects an already-canceled subscription', async () => {
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'CANCELED' }))
    await expect(paymentService.cancelSubscription(USER_ID)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('reverts to the default (Free) plan with status CANCELED', async () => {
    mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'ACTIVE' }))
    const freePlan = planRow({ id: 'plan-free', name: 'Free', storageLimit: 5, price: { toString: () => '0.00' } })
    mockFindPlanByName.mockResolvedValue(freePlan)
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)

    await paymentService.cancelSubscription(USER_ID)

    expect(mockFindPlanByName).toHaveBeenCalledWith('Free')
    expect(mockTxSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: 'CANCELED', planId: 'plan-free' }) })
    )
    expect(mockSetQuota).toHaveBeenCalledWith('nc-user-1', 5)
  })

  describe('atPeriodEnd: true (Phase 11B)', () => {
    it('rejects when there is no subscription to cancel', async () => {
      mockFindSubscriptionByUserId.mockResolvedValue(null)
      await expect(paymentService.cancelSubscription(USER_ID, { atPeriodEnd: true })).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('rejects scheduling a cancellation that is already scheduled', async () => {
      mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'ACTIVE', cancelAtPeriodEnd: true }))
      await expect(paymentService.cancelSubscription(USER_ID, { atPeriodEnd: true })).rejects.toMatchObject({
        statusCode: 400,
      })
      expect(mockSetCancelAtPeriodEnd).not.toHaveBeenCalled()
    })

    it('flips cancelAtPeriodEnd without touching plan, status, or quota', async () => {
      mockFindSubscriptionByUserId.mockResolvedValue(subscriptionRow({ status: 'ACTIVE', cancelAtPeriodEnd: false }))
      mockSetCancelAtPeriodEnd.mockResolvedValue(subscriptionRow({ status: 'ACTIVE', cancelAtPeriodEnd: true }))

      const result = await paymentService.cancelSubscription(USER_ID, { atPeriodEnd: true })

      expect(mockSetCancelAtPeriodEnd).toHaveBeenCalledWith('sub-1', true)
      expect(mockPrismaTransaction).not.toHaveBeenCalled()
      expect(mockSetQuota).not.toHaveBeenCalled()
      expect(result.subscription.status).toBe('ACTIVE')
      expect(result.subscription.cancelAtPeriodEnd).toBe(true)
    })
  })
})

describe('paymentService.expireSubscriptionToFree (Phase 11B — reconciliation only)', () => {
  it('reverts to the default (Free) plan with status EXPIRED, distinct from user-initiated CANCELED', async () => {
    const freePlan = planRow({ id: 'plan-free', name: 'Free', storageLimit: 5, price: { toString: () => '0.00' } })
    mockFindPlanByName.mockResolvedValue(freePlan)
    mockFindUserById.mockResolvedValue(userRow())
    mockSetQuota.mockResolvedValue(undefined)
    mockMarkQuotaSynced.mockResolvedValue(undefined)

    const result = await paymentService.expireSubscriptionToFree(USER_ID)

    expect(mockFindPlanByName).toHaveBeenCalledWith('Free')
    expect(mockTxSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: 'EXPIRED', planId: 'plan-free' }) })
    )
    expect(mockSetQuota).toHaveBeenCalledWith('nc-user-1', 5)
    expect(result.subscription.status).toBe('EXPIRED')
  })
})
