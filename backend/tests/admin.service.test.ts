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
const mockNcSetQuota = jest.fn()

jest.mock('../src/services/NextcloudService', () => {
  const actual = jest.requireActual('../src/services/NextcloudService')
  return {
    ...actual,
    nextcloudService: {
      deleteUser: mockNcDeleteUser,
      setQuota: mockNcSetQuota,
    },
  }
})

const mockFilesQuota = jest.fn()
const mockFilesStats = jest.fn()

jest.mock('../src/services/files.service', () => ({
  filesService: { quota: mockFilesQuota, stats: mockFilesStats },
}))

