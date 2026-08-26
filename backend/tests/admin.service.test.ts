const mockFindById = jest.fn()
const mockFindMany = jest.fn()
const mockCount = jest.fn()
const mockCountAdmins = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()

jest.mock('../src/repositories/user.repository', () => ({
  userRepository: {
    findById: mockFindById,
    findMany: mockFindMany,
    count: mockCount,
    countAdmins: mockCountAdmins,
    update: mockUpdate,
    delete: mockDelete,
  },
}))

const mockDeleteAllForUser = jest.fn()
const mockFindManyForUser = jest.fn()
const mockDeleteOneForUser = jest.fn()
const mockCountActive = jest.fn()

jest.mock('../src/repositories/session.repository', () => ({
  sessionRepository: {
    deleteAllForUser: mockDeleteAllForUser,
    findManyForUser: mockFindManyForUser,
    deleteOneForUser: mockDeleteOneForUser,
    countActive: mockCountActive,
  },
}))

const mockFindManyPayments = jest.fn()

jest.mock('../src/repositories/payment.repository', () => ({
  paymentRepository: { findManyForUser: mockFindManyPayments },
}))

const mockFindAllPlans = jest.fn()

jest.mock('../src/repositories/plan.repository', () => ({
  planRepository: { findAll: mockFindAllPlans },
}))

const mockProvisionUser = jest.fn()

jest.mock('../src/services/userProvisioning.service', () => ({
  provisionUser: mockProvisionUser,
}))

const mockNcDeleteUser = jest.fn()
const mockNcChangePassword = jest.fn()
const mockNcSetQuota = jest.fn()

jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return {
    ...actual,
    nextcloudService: {
      deleteUser: mockNcDeleteUser,
      changePassword: mockNcChangePassword,
      setQuota: mockNcSetQuota,
    },
  }
})

const mockFilesQuota = jest.fn()
const mockFilesStats = jest.fn()

jest.mock('../src/services/files.service', () => ({
  filesService: { quota: mockFilesQuota, stats: mockFilesStats },
}))

// Mocked so this suite never touches the real bcrypt native binding —
// resetPassword only needs to know *that* hashPassword was called with the
// right plaintext, not exercise real hashing cost/output.
jest.mock('../src/utils/password', () => ({
  hashPassword: jest.fn(async (plain: string) => `hashed:${plain}`),
}))

import { adminService } from '../src/services/admin.service'
import { NextcloudApiError } from '../src/services/NextcloudService'

const ADMIN_ID = 'admin-1'
const OTHER_ADMIN_ID = 'admin-2'
const USER_ID = 'user-1'

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    status: 'ACTIVE',
    nextcloudUsername: 'nc-user-1',
    plan: { name: 'Free' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('adminService', () => {
  afterEach(() => jest.clearAllMocks())

  describe('listUsers', () => {
    it('builds a case-insensitive OR filter on name/email from `search`, and role/status as equality filters', async () => {
      mockFindMany.mockResolvedValue([userRow()])
      mockCount.mockResolvedValue(1)

      await adminService.listUsers({ page: 2, limit: 10, search: 'ash', role: 'USER', status: 'ACTIVE' })

      const expectedWhere = {
        OR: [
          { name: { contains: 'ash', mode: 'insensitive' } },
          { email: { contains: 'ash', mode: 'insensitive' } },
        ],
        role: 'USER',
        status: 'ACTIVE',
      }
      expect(mockFindMany).toHaveBeenCalledWith({ where: expectedWhere, skip: 10, take: 10 })
      expect(mockCount).toHaveBeenCalledWith(expectedWhere)
    })

    it('returns pagination metadata alongside the mapped users', async () => {
      mockFindMany.mockResolvedValue([userRow()])
      mockCount.mockResolvedValue(37)

      const result = await adminService.listUsers({ page: 1, limit: 20 })

      expect(result).toEqual({
        users: [expect.objectContaining({ id: USER_ID, plan: 'Free' })],
        total: 37,
        page: 1,
        limit: 20,
      })
    })
  })

  describe('getUser', () => {
    it('throws 404 for a missing user', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(adminService.getUser('missing')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('createUser', () => {
    it('delegates entirely to provisionUser and maps the result', async () => {
      mockProvisionUser.mockResolvedValue(userRow({ role: 'ADMIN' }))

      const result = await adminService.createUser({
        name: 'New Admin',
        email: 'new-admin@example.com',
        password: 'supersecret123',
        role: 'ADMIN',
        planId: 'plan-1',
      })

      expect(mockProvisionUser).toHaveBeenCalledWith({
        name: 'New Admin',
        email: 'new-admin@example.com',
        password: 'supersecret123',
        role: 'ADMIN',
        planId: 'plan-1',
      })
      expect(result.role).toBe('ADMIN')
    })
  })

  describe('setUserStatus', () => {
    it('refuses to let an admin suspend their own account', async () => {
      await expect(adminService.setUserStatus(ADMIN_ID, 'SUSPENDED', ADMIN_ID)).rejects.toMatchObject({
        statusCode: 400,
      })
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('refuses to suspend the last remaining admin', async () => {
      mockFindById.mockResolvedValue(userRow({ id: ADMIN_ID, role: 'ADMIN' }))
      mockCountAdmins.mockResolvedValue(0)

      await expect(adminService.setUserStatus(ADMIN_ID, 'SUSPENDED', OTHER_ADMIN_ID)).rejects.toMatchObject({
        statusCode: 400,
      })
      expect(mockCountAdmins).toHaveBeenCalledWith(ADMIN_ID)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('allows suspending an admin when another admin remains, and revokes all their sessions', async () => {
      mockFindById.mockResolvedValue(userRow({ id: ADMIN_ID, role: 'ADMIN' }))
      mockCountAdmins.mockResolvedValue(1)
      mockUpdate.mockResolvedValue(userRow({ id: ADMIN_ID, role: 'ADMIN', status: 'SUSPENDED' }))

      const result = await adminService.setUserStatus(ADMIN_ID, 'SUSPENDED', OTHER_ADMIN_ID)

      expect(mockUpdate).toHaveBeenCalledWith(ADMIN_ID, { status: 'SUSPENDED' })
      expect(mockDeleteAllForUser).toHaveBeenCalledWith(ADMIN_ID)
      expect(result.status).toBe('SUSPENDED')
    })

    it('does not touch sessions when reactivating a user', async () => {
      mockFindById.mockResolvedValue(userRow({ status: 'SUSPENDED' }))
      mockUpdate.mockResolvedValue(userRow({ status: 'ACTIVE' }))

      await adminService.setUserStatus(USER_ID, 'ACTIVE', ADMIN_ID)

      expect(mockDeleteAllForUser).not.toHaveBeenCalled()
    })

    it('does not last-admin-check a plain USER account', async () => {
      mockFindById.mockResolvedValue(userRow({ role: 'USER' }))
      mockUpdate.mockResolvedValue(userRow({ role: 'USER', status: 'SUSPENDED' }))

      await adminService.setUserStatus(USER_ID, 'SUSPENDED', ADMIN_ID)

      expect(mockCountAdmins).not.toHaveBeenCalled()
    })
  })

  describe('deleteUser', () => {
    it('refuses to let an admin delete their own account', async () => {
      await expect(adminService.deleteUser(ADMIN_ID, ADMIN_ID)).rejects.toMatchObject({ statusCode: 400 })
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('refuses to delete the last remaining admin', async () => {
      mockFindById.mockResolvedValue(userRow({ id: ADMIN_ID, role: 'ADMIN' }))
      mockCountAdmins.mockResolvedValue(0)

      await expect(adminService.deleteUser(ADMIN_ID, OTHER_ADMIN_ID)).rejects.toMatchObject({ statusCode: 400 })
      expect(mockNcDeleteUser).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('deletes the Nextcloud account before the Postgres row', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcDeleteUser.mockResolvedValue(undefined)
      mockDelete.mockResolvedValue(userRow())

      await adminService.deleteUser(USER_ID, ADMIN_ID)

      const ncOrder = mockNcDeleteUser.mock.invocationCallOrder[0]
      const pgOrder = mockDelete.mock.invocationCallOrder[0]
      expect(ncOrder).toBeLessThan(pgOrder)
      expect(mockNcDeleteUser).toHaveBeenCalledWith('nc-user-1')
      expect(mockDelete).toHaveBeenCalledWith(USER_ID)
    })

    it('aborts and leaves the Postgres row intact if Nextcloud deletion fails', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcDeleteUser.mockRejectedValue(new NextcloudApiError('agent unreachable'))

      await expect(adminService.deleteUser(USER_ID, ADMIN_ID)).rejects.toMatchObject({ statusCode: 503 })
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('skips the Nextcloud call entirely for a user with no provisioned account, but still deletes the row', async () => {
      mockFindById.mockResolvedValue(userRow({ nextcloudUsername: null }))
      mockDelete.mockResolvedValue(userRow())

      await adminService.deleteUser(USER_ID, ADMIN_ID)

      expect(mockNcDeleteUser).not.toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith(USER_ID)
    })
  })

  describe('resetPassword', () => {
    it('generates a password and returns it once when none is supplied', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcChangePassword.mockResolvedValue(undefined)
      mockUpdate.mockResolvedValue(userRow())

      const result = await adminService.resetPassword(USER_ID, undefined)

      expect(result.temporaryPassword).toEqual(expect.any(String))
      expect(result.temporaryPassword!.length).toBeGreaterThanOrEqual(8)
    })

    it('does not echo back an admin-supplied password', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcChangePassword.mockResolvedValue(undefined)
      mockUpdate.mockResolvedValue(userRow())

      const result = await adminService.resetPassword(USER_ID, 'a-chosen-password-1')

      expect(result).toEqual({})
      expect(mockNcChangePassword).toHaveBeenCalledWith('nc-user-1', 'a-chosen-password-1')
    })

    it('never updates the Postgres password hash if the Nextcloud change fails', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcChangePassword.mockRejectedValue(new NextcloudApiError('down'))

      await expect(adminService.resetPassword(USER_ID, 'whatever12')).rejects.toMatchObject({ statusCode: 503 })
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('revokes all sessions after a successful reset', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcChangePassword.mockResolvedValue(undefined)
      mockUpdate.mockResolvedValue(userRow())

      await adminService.resetPassword(USER_ID, 'whatever12')

      expect(mockDeleteAllForUser).toHaveBeenCalledWith(USER_ID)
    })

    it('throws without calling Nextcloud if the account has no storage backend provisioned', async () => {
      mockFindById.mockResolvedValue(userRow({ nextcloudUsername: null }))

      await expect(adminService.resetPassword(USER_ID, undefined)).rejects.toMatchObject({ statusCode: 500 })
      expect(mockNcChangePassword).not.toHaveBeenCalled()
    })
  })

  describe('setUserQuota', () => {
    it('calls nextcloudService.setQuota with the target user and requested GB', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcSetQuota.mockResolvedValue(undefined)

      await adminService.setUserQuota(USER_ID, { storageLimitGb: 250 })

      expect(mockNcSetQuota).toHaveBeenCalledWith('nc-user-1', 250)
    })

    it('surfaces a 503 (not a raw error) if the Nextcloud call fails', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockNcSetQuota.mockRejectedValue(new NextcloudApiError('down'))

      await expect(adminService.setUserQuota(USER_ID, { storageLimitGb: 250 })).rejects.toMatchObject({
        statusCode: 503,
      })
    })
  })

  describe('storage / payments / sessions passthroughs', () => {
    it('getUserStorage 404s for a missing user without calling filesService', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(adminService.getUserStorage('missing')).rejects.toMatchObject({ statusCode: 404 })
      expect(mockFilesQuota).not.toHaveBeenCalled()
    })

    it('getUserStorage reuses filesService.quota with the same id — no separate WebDAV path', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockFilesQuota.mockResolvedValue({ used: 100, available: 900 })

      const result = await adminService.getUserStorage(USER_ID)

      expect(mockFilesQuota).toHaveBeenCalledWith(USER_ID)
      expect(result).toEqual({ used: 100, available: 900 })
    })

    it('getUserStorageBreakdown reuses filesService.stats with the same id', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockFilesStats.mockResolvedValue({ totalFiles: 3, totalFolders: 1, largestFiles: [], recentUploads: [] })

      await adminService.getUserStorageBreakdown(USER_ID)

      expect(mockFilesStats).toHaveBeenCalledWith(USER_ID)
    })

    it('getUserPayments maps rows through toPaymentDTO', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockFindManyPayments.mockResolvedValue([
        {
          id: 'pay-1',
          amount: { toString: () => '9.99' },
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_123',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])

      const result = await adminService.getUserPayments(USER_ID)

      expect(result).toEqual([
        {
          id: 'pay-1',
          amount: '9.99',
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_123',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ])
    })

    it('getUserSessions maps rows through toSessionDTO', async () => {
      mockFindById.mockResolvedValue(userRow())
      mockFindManyForUser.mockResolvedValue([
        {
          id: 'sess-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date('2026-01-08T00:00:00.000Z'),
          userAgent: 'Mozilla/5.0',
          ipAddress: '203.0.113.5',
        },
      ])

      const result = await adminService.getUserSessions(USER_ID)

      expect(result[0]).toMatchObject({ id: 'sess-1', userAgent: 'Mozilla/5.0', ipAddress: '203.0.113.5' })
    })
  })

  describe('revokeSession', () => {
    it('throws 404 if no matching session was deleted (wrong id, or belongs to a different user)', async () => {
      mockDeleteOneForUser.mockResolvedValue({ count: 0 })
      await expect(adminService.revokeSession(USER_ID, 'not-a-real-session')).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('succeeds silently when exactly one session was deleted', async () => {
      mockDeleteOneForUser.mockResolvedValue({ count: 1 })
      await expect(adminService.revokeSession(USER_ID, 'sess-1')).resolves.toBeUndefined()
    })
  })

  describe('listPlans', () => {
    it('maps plans through toPlanDTO, serializing the Decimal price to a string', async () => {
      mockFindAllPlans.mockResolvedValue([
        { id: 'plan-1', name: 'Pro', storageLimit: 500, price: { toString: () => '24.99' } },
      ])

      const result = await adminService.listPlans()

      expect(result).toEqual([{ id: 'plan-1', name: 'Pro', storageLimitGb: 500, price: '24.99' }])
    })
  })

  describe('getOverview', () => {
    it('returns cheap Postgres-only counts, never calling Nextcloud or WebDAV', async () => {
      mockCount.mockResolvedValueOnce(50) // total
      mockCount.mockResolvedValueOnce(45) // active
      mockCount.mockResolvedValueOnce(5) // suspended
      mockCount.mockResolvedValueOnce(2) // admins
      mockCountActive.mockResolvedValue(12)

      const result = await adminService.getOverview()

      expect(result).toEqual({
        totalUsers: 50,
        activeUsers: 45,
        suspendedUsers: 5,
        adminCount: 2,
        activeSessions: 12,
      })
      expect(mockNcSetQuota).not.toHaveBeenCalled()
      expect(mockFilesQuota).not.toHaveBeenCalled()
    })
  })
})
