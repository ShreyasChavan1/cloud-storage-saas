const calls: string[] = []
const track = (name: string, impl: (...a: any[]) => any = async () => undefined) =>
  jest.fn(async (...a: any[]) => { calls.push(name); return impl(...a) })

const mockRevoke = track('revokeAccessTokens')
const mockDeleteSessions = track('deleteSessions')
const mockFindBilling = track('findBilling', async () => [])
const mockUpdateBilling = track('updateBilling')
const mockCancel = track('cancelRazorpay')
const mockNcDelete = track('deleteNextcloud')
const mockDeleteUser = track('deleteUser')
const mockFindById = jest.fn()
const mockCompare = jest.fn()

jest.mock('../src/repositories/user.repository', () => ({
  userRepository: { revokeAccessTokens: mockRevoke, findById: mockFindById, delete: mockDeleteUser },
}))
jest.mock('../src/repositories/session.repository', () => ({ sessionRepository: { deleteAllForUser: mockDeleteSessions } }))
jest.mock('../src/repositories/billingSubscription.repository', () => ({
  billingSubscriptionRepository: { findByUserId: mockFindBilling, updateStatus: mockUpdateBilling },
}))
jest.mock('../src/services/RazorpayService', () => ({ razorpayService: { cancelSubscription: mockCancel } }))
jest.mock('../src/services/NextcloudService', () => ({
  nextcloudService: { deleteUser: mockNcDelete },
  NextcloudApiError: class extends Error {},
}))
jest.mock('../src/utils/password', () => ({ comparePassword: mockCompare }))

import { accountDeletionService, deleteAccountData } from '../src/services/accountDeletion.service'

const target = { id: 'u1', nextcloudUsername: 'nc-u1' }
beforeEach(() => { calls.length = 0; jest.clearAllMocks(); mockFindBilling.mockImplementation(async () => { calls.push('findBilling'); return [] }) })

describe('deleteAccountData', () => {
  it('revokes access first, then billing, then storage, and deletes the row last', async () => {
    mockFindBilling.mockImplementation(async () => { calls.push('findBilling'); return [{ id: 'b1', status: 'ACTIVE', razorpaySubscriptionId: 'sub_1' }] })
    await deleteAccountData(target)
    expect(calls).toEqual(['revokeAccessTokens', 'deleteSessions', 'findBilling', 'cancelRazorpay', 'updateBilling', 'deleteNextcloud', 'deleteUser'])
    expect(mockCancel).toHaveBeenCalledWith('sub_1', false)
  })

  it('skips already-terminal subscriptions', async () => {
    mockFindBilling.mockImplementation(async () => [{ id: 'b1', status: 'CANCELLED', razorpaySubscriptionId: 'sub_1' }])
    await deleteAccountData(target)
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('FAILS CLOSED if Razorpay cancellation fails: nothing else is deleted', async () => {
    mockFindBilling.mockImplementation(async () => [{ id: 'b1', status: 'ACTIVE', razorpaySubscriptionId: 'sub_1' }])
    mockCancel.mockRejectedValueOnce(new Error('razorpay down'))
    await expect(deleteAccountData(target)).rejects.toMatchObject({ statusCode: 503 })
    expect(mockNcDelete).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('FAILS CLOSED if Nextcloud deletion fails: the Postgres user is kept so it can be retried', async () => {
    mockNcDelete.mockRejectedValueOnce(new Error('nextcloud down'))
    await expect(deleteAccountData(target)).rejects.toMatchObject({ statusCode: 503 })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })
})

describe('deleteOwnAccount', () => {
  const user = { id: 'u1', role: 'USER', passwordHash: 'h', nextcloudUsername: 'nc-u1' }

  it('requires the correct password', async () => {
    mockFindById.mockResolvedValue(user); mockCompare.mockResolvedValue(false)
    await expect(accountDeletionService.deleteOwnAccount('u1', 'wrong')).rejects.toMatchObject({ statusCode: 401 })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('refuses to self-delete an admin account', async () => {
    mockFindById.mockResolvedValue({ ...user, role: 'ADMIN' }); mockCompare.mockResolvedValue(true)
    await expect(accountDeletionService.deleteOwnAccount('u1', 'pw')).rejects.toMatchObject({ statusCode: 403 })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('deletes with the right password', async () => {
    mockFindById.mockResolvedValue(user); mockCompare.mockResolvedValue(true)
    await accountDeletionService.deleteOwnAccount('u1', 'pw')
    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
  })
})
