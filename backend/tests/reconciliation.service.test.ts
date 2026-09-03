const mockFindDueForRenewal = jest.fn()
const mockFindPastDueExpired = jest.fn()
const mockFindPendingQuotaSync = jest.fn()
const mockMarkPastDue = jest.fn()
const mockMarkQuotaSynced = jest.fn()
jest.mock('../src/repositories/subscription.repository', () => ({
  subscriptionRepository: {
    findDueForRenewal: mockFindDueForRenewal,
    findPastDueExpired: mockFindPastDueExpired,
    findPendingQuotaSync: mockFindPendingQuotaSync,
    markPastDue: mockMarkPastDue,
    markQuotaSynced: mockMarkQuotaSynced,
  },
}))

const mockFindUserById = jest.fn()
jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { findById: mockFindUserById },
}))

const mockCancelSubscription = jest.fn()
const mockExpireSubscriptionToFree = jest.fn()
jest.mock('../src/services/payment.service', () => ({
  paymentService: { cancelSubscription: mockCancelSubscription, expireSubscriptionToFree: mockExpireSubscriptionToFree },
}))

const mockSetQuota = jest.fn()
jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return { ...actual, nextcloudService: { setQuota: mockSetQuota } }
})

import { reconciliationService } from '../src/services/reconciliation.service'
import { NextcloudApiError } from '../src/services/NextcloudService'

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-pro',
    status: 'ACTIVE',
    cancelAtPeriodEnd: false,
    renewalDate: new Date('2026-01-01T00:00:00.000Z'),
    quotaSyncedAt: null,
    plan: { id: 'plan-pro', name: 'Pro', storageLimit: 500, price: { toString: () => '24.99' } as any },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindDueForRenewal.mockResolvedValue([])
  mockFindPastDueExpired.mockResolvedValue([])
  mockFindPendingQuotaSync.mockResolvedValue([])
})

describe('reconciliationService.run — due-for-renewal sweep', () => {
  it('reverts a subscription with cancelAtPeriodEnd via the same immediate-effect path as user-initiated cancellation', async () => {
    mockFindDueForRenewal.mockResolvedValue([subscriptionRow({ cancelAtPeriodEnd: true })])
    mockCancelSubscription.mockResolvedValue({ subscription: subscriptionRow({ status: 'CANCELED' }), quotaSynced: true })

    const summary = await reconciliationService.run()

    expect(mockCancelSubscription).toHaveBeenCalledWith('user-1')
    expect(mockMarkPastDue).not.toHaveBeenCalled()
    expect(summary.canceledAtPeriodEnd).toBe(1)
  })

  it('marks a paid plan with no cancelAtPeriodEnd and no renewal payment PAST_DUE', async () => {
    mockFindDueForRenewal.mockResolvedValue([subscriptionRow({ cancelAtPeriodEnd: false })])

    const summary = await reconciliationService.run()

    expect(mockMarkPastDue).toHaveBeenCalledWith('sub-1')
    expect(mockCancelSubscription).not.toHaveBeenCalled()
    expect(summary.markedPastDue).toBe(1)
  })

  it('does nothing for a $0 (Free) plan reaching its own renewalDate', async () => {
    mockFindDueForRenewal.mockResolvedValue([
      subscriptionRow({ cancelAtPeriodEnd: false, plan: { id: 'plan-free', name: 'Free', storageLimit: 5, price: { toString: () => '0.00' } } }),
    ])

    const summary = await reconciliationService.run()

    expect(mockMarkPastDue).not.toHaveBeenCalled()
    expect(mockCancelSubscription).not.toHaveBeenCalled()
    expect(summary.markedPastDue).toBe(0)
    expect(summary.canceledAtPeriodEnd).toBe(0)
  })

  it('records an error and keeps processing the rest of the batch if one subscription throws', async () => {
    mockFindDueForRenewal.mockResolvedValue([
      subscriptionRow({ id: 'sub-a', userId: 'user-a', cancelAtPeriodEnd: true }),
      subscriptionRow({ id: 'sub-b', userId: 'user-b', cancelAtPeriodEnd: false }),
    ])
    mockCancelSubscription.mockRejectedValueOnce(new Error('boom'))

    const summary = await reconciliationService.run()

    expect(summary.errors).toHaveLength(1)
    expect(summary.errors[0]).toContain('sub-a')
    expect(mockMarkPastDue).toHaveBeenCalledWith('sub-b')
    expect(summary.markedPastDue).toBe(1)
  })
})

describe('reconciliationService.run — PAST_DUE grace-window sweep', () => {
  it('downgrades an expired PAST_DUE subscription to Free with status EXPIRED, via expireSubscriptionToFree', async () => {
    mockFindPastDueExpired.mockResolvedValue([subscriptionRow({ status: 'PAST_DUE' })])
    mockExpireSubscriptionToFree.mockResolvedValue({ subscription: subscriptionRow({ status: 'EXPIRED' }), quotaSynced: true })

    const summary = await reconciliationService.run()

    expect(mockExpireSubscriptionToFree).toHaveBeenCalledWith('user-1')
    // Distinct from the cancelAtPeriodEnd path — never calls cancelSubscription.
    expect(mockCancelSubscription).not.toHaveBeenCalled()
    expect(summary.expiredToFree).toBe(1)
  })

  it('records an error per subscription without aborting the whole sweep', async () => {
    mockFindPastDueExpired.mockResolvedValue([subscriptionRow({ status: 'PAST_DUE' })])
    mockExpireSubscriptionToFree.mockRejectedValue(new Error('default plan missing'))

    const summary = await reconciliationService.run()

    expect(summary.expiredToFree).toBe(0)
    expect(summary.errors).toHaveLength(1)
  })
})

describe('reconciliationService.run — pending quota-sync retry sweep', () => {
  it('retries and marks synced for a subscription whose plan change never got its quota update', async () => {
    mockFindPendingQuotaSync.mockResolvedValue([subscriptionRow({ quotaSyncedAt: null })])
    mockFindUserById.mockResolvedValue({ id: 'user-1', nextcloudUsername: 'nc-user-1' })
    mockSetQuota.mockResolvedValue(undefined)

    const summary = await reconciliationService.run()

    expect(mockSetQuota).toHaveBeenCalledWith('nc-user-1', 500)
    expect(mockMarkQuotaSynced).toHaveBeenCalledWith('sub-1', expect.any(Date))
    expect(summary.quotaSynced).toBe(1)
    expect(summary.quotaSyncStillFailing).toBe(0)
  })

  it('counts a still-failing retry without throwing', async () => {
    mockFindPendingQuotaSync.mockResolvedValue([subscriptionRow({ quotaSyncedAt: null })])
    mockFindUserById.mockResolvedValue({ id: 'user-1', nextcloudUsername: 'nc-user-1' })
    mockSetQuota.mockRejectedValue(new NextcloudApiError('agent unreachable'))

    const summary = await reconciliationService.run()

    expect(mockMarkQuotaSynced).not.toHaveBeenCalled()
    expect(summary.quotaSyncStillFailing).toBe(1)
    expect(summary.quotaSynced).toBe(0)
  })

  it('skips (and counts as still-failing) a user with no provisioned Nextcloud account', async () => {
    mockFindPendingQuotaSync.mockResolvedValue([subscriptionRow({ quotaSyncedAt: null })])
    mockFindUserById.mockResolvedValue({ id: 'user-1', nextcloudUsername: null })

    const summary = await reconciliationService.run()

    expect(mockSetQuota).not.toHaveBeenCalled()
    expect(summary.quotaSyncStillFailing).toBe(1)
  })
})
