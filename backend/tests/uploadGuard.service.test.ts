const mockFindByUserId = jest.fn()
jest.mock('../src/repositories/subscription.repository', () => ({
  subscriptionRepository: { findByUserId: mockFindByUserId },
}))

const mockQuota = jest.fn()
jest.mock('../src/services/files.service', () => ({
  filesService: { quota: mockQuota },
}))

jest.mock('../src/config/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const mockPlans = { BLOCK_UPLOADS_WHEN_PAST_DUE: false, PAST_DUE_GRACE_DAYS: 30 }
jest.mock('../src/config/plans', () => ({
  get BLOCK_UPLOADS_WHEN_PAST_DUE() {
    return mockPlans.BLOCK_UPLOADS_WHEN_PAST_DUE
  },
  get PAST_DUE_GRACE_DAYS() {
    return mockPlans.PAST_DUE_GRACE_DAYS
  },
}))

import { uploadGuardService } from '../src/services/uploadGuard.service'

const DAY = 24 * 60 * 60 * 1000

describe('uploadGuardService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPlans.BLOCK_UPLOADS_WHEN_PAST_DUE = false
    mockFindByUserId.mockResolvedValue({ status: 'ACTIVE', renewalDate: new Date() })
    mockQuota.mockResolvedValue({ used: 1, available: 10_000 })
  })

  it('allows an upload that fits', async () => {
    await expect(uploadGuardService.assertCanUpload('u1', 500)).resolves.toBeUndefined()
  })

  it('allows everything when the quota is unlimited', async () => {
    mockQuota.mockResolvedValue({ used: 99, available: 'unlimited' })
    await expect(uploadGuardService.assertCanUpload('u1', 10 ** 12)).resolves.toBeUndefined()
  })

  it('blocks with 507 when no space is left', async () => {
    mockQuota.mockResolvedValue({ used: 5000, available: 0 })
    await expect(uploadGuardService.assertCanUpload('u1', 1)).rejects.toMatchObject({ statusCode: 507 })
  })

  it('blocks with 507 when the account is over its limit (negative space)', async () => {
    mockQuota.mockResolvedValue({ used: 9000, available: -4000 })
    const status = await uploadGuardService.getStatus('u1')
    expect(status).toMatchObject({ canUpload: false, reason: 'OVER_QUOTA' })
  })

  it('blocks a file larger than the remaining space', async () => {
    mockQuota.mockResolvedValue({ used: 1, available: 100 })
    await expect(uploadGuardService.assertCanUpload('u1', 101)).rejects.toMatchObject({ statusCode: 507 })
  })

  it('keeps uploads open during the grace window by default and reports when it ends', async () => {
    const renewalDate = new Date(Date.now() - 5 * DAY)
    mockFindByUserId.mockResolvedValue({ status: 'PAST_DUE', renewalDate })
    const status = await uploadGuardService.getStatus('u1')
    expect(status.canUpload).toBe(true)
    expect(status.graceEndsAt).toBe(new Date(renewalDate.getTime() + 30 * DAY).toISOString())
  })

  it('pauses uploads while PAST_DUE when the strict option is on (402)', async () => {
    mockPlans.BLOCK_UPLOADS_WHEN_PAST_DUE = true
    mockFindByUserId.mockResolvedValue({ status: 'PAST_DUE', renewalDate: new Date(Date.now() - DAY) })
    await expect(uploadGuardService.assertCanUpload('u1', 1)).rejects.toMatchObject({ statusCode: 402 })
  })

  it('does not block when the storage server cannot be reached', async () => {
    mockQuota.mockRejectedValue(new Error('storage down'))
    const status = await uploadGuardService.getStatus('u1', 50)
    expect(status.canUpload).toBe(true)
  })
})
