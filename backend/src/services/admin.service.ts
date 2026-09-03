import { Prisma } from '@prisma/client'
import { userRepository } from '../repositories/user.repository'
import { sessionRepository } from '../repositories/session.repository'
import { paymentRepository } from '../repositories/payment.repository'
import { planRepository } from '../repositories/plan.repository'
import { provisionUser } from './userProvisioning.service'
import { reconciliationService, ReconciliationSummary } from './reconciliation.service'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { filesService } from './files.service'
import { toAdminUserDTO, AdminUserDTO } from '../models/user.model'
import { toSessionDTO, SessionDTO } from '../models/session.model'
import { toPaymentDTO, PaymentDTO } from '../models/payment.model'
import { toPlanDTO, PlanDTO } from '../models/plan.model'
import { hashPassword } from '../utils/password'
import { generateRandomToken } from '../utils/token'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'
import {
  CreateUserInput,
  UpdateUserQuotaInput,
  ListUsersQuery,
} from '../validators/admin.validator'

// Shared by setUserStatus and deleteUser — both need "is this the last
// admin account?" before proceeding, so a single admin can never suspend
// or delete their way into an app with zero admins left to fix it.
// `excludeId` is the target user itself: we're asking "are there OTHER
// admins besides this one", not "is this user an admin".
async function assertNotLastAdmin(target: { id: string; role: string }) {
  if (target.role !== 'ADMIN') return
  const remaining = await userRepository.countAdmins(target.id)
  if (remaining === 0) {
    throw ApiError.badRequest('Cannot remove the last remaining admin account.')
  }
}

function assertNotSelf(targetId: string, actingAdminId: string, action: string) {
  if (targetId === actingAdminId) {
    throw ApiError.badRequest(`You can't ${action} your own account from the admin panel.`)
  }
}

async function getRequiredUser(id: string) {
  const user = await userRepository.findById(id)
  if (!user) throw ApiError.notFound('User not found')
  return user
}

export const adminService = {
  async listUsers(
    query: ListUsersQuery
  ): Promise<{ users: AdminUserDTO[]; total: number; page: number; limit: number }> {
    const where: Prisma.UserWhereInput = {}
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.role) where.role = query.role
    if (query.status) where.status = query.status

    const skip = (query.page - 1) * query.limit
    const [users, total] = await Promise.all([
      userRepository.findMany({ where, skip, take: query.limit }),
      userRepository.count(where),
    ])

    return { users: users.map(toAdminUserDTO), total, page: query.page, limit: query.limit }
  },

  async getUser(id: string): Promise<AdminUserDTO> {
    return toAdminUserDTO(await getRequiredUser(id))
  },

  // Shares the exact same create-Postgres-user + provision-Nextcloud +
  // rollback-on-failure pipeline self-registration uses (see
  // userProvisioning.service.ts) — an admin-created account is
  // provisioned identically, just with an admin able to pick the plan
  // and/or role up front instead of always defaulting to both.
  async createUser(input: CreateUserInput): Promise<AdminUserDTO> {
    const user = await provisionUser({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      planId: input.planId,
    })
    return toAdminUserDTO(user)
  },

  async setUserStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actingAdminId: string
  ): Promise<AdminUserDTO> {
    assertNotSelf(id, actingAdminId, status === 'SUSPENDED' ? 'suspend' : 'reactivate')
    const target = await getRequiredUser(id)
    if (status === 'SUSPENDED') {
      await assertNotLastAdmin(target)
    }

    const updated = await userRepository.update(id, { status })

    // Suspension takes effect immediately rather than only blocking future
    // logins: deleting every session forces a fresh login attempt, which
    // authService.login now rejects outright for a suspended account. An
    // already-issued *access* token can still work until it naturally
    // expires (see the UserStatus enum comment in schema.prisma) — that's
    // an accepted tradeoff of this backend's stateless-access-token
    // design, not something this endpoint can close on its own.
    if (status === 'SUSPENDED') {
      await sessionRepository.deleteAllForUser(id)
    }

    return toAdminUserDTO(updated)
  },

  async deleteUser(id: string, actingAdminId: string): Promise<void> {
    assertNotSelf(id, actingAdminId, 'delete')
    const target = await getRequiredUser(id)
    await assertNotLastAdmin(target)

    // Delete the Nextcloud account FIRST. If that fails, abort and leave
    // both sides intact so the whole operation can simply be retried —
    // the mirror image of registration's rollback (which deletes the
    // JUST-created Postgres row if Nextcloud provisioning fails), but the
    // same underlying rule: never leave a Postgres user and its Nextcloud
    // account out of sync with each other.
    if (target.nextcloudUsername) {
      try {
        await nextcloudService.deleteUser(target.nextcloudUsername)
      } catch (err) {
        const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
        logger.error({ userId: id, detail }, 'Nextcloud account deletion failed — Postgres user NOT deleted')
        throw ApiError.serviceUnavailable('Could not delete the storage account. Please try again.')
      }
    }

    // Cascades to that user's sessions, subscriptions, payments, and
    // password reset tokens automatically — all `onDelete: Cascade` in
    // schema.prisma — so nothing further to clean up here.
    await userRepository.delete(id)
  },

  // Admin-driven password reset. Unlike authService.forgotPassword (which
  // only ever hands back a token outside production, because that
  // endpoint is PUBLIC and there's no email transport to deliver it any
  // other way), this one always returns a generated password when it
  // generates one — the caller here is an authenticated admin, not an
  // anonymous requester, and the whole point of this endpoint is for them
  // to see it and relay it to the user out-of-band.
  async resetPassword(id: string, newPassword: string | undefined): Promise<{ temporaryPassword?: string }> {
    const target = await getRequiredUser(id)
    if (!target.nextcloudUsername) {
      throw ApiError.internal('This account has no storage backend provisioned')
    }

    const wasGenerated = !newPassword
    // 8 random bytes, hex-encoded → 16 characters, well inside the
    // 8-72 char passwordField range and far stronger than it needs to be
    // for something meant to be replaced on first real login.
    const finalPassword = newPassword ?? generateRandomToken(8)

    // Nextcloud first: if this fails, the Postgres passwordHash is left
    // completely untouched, so the login password and the Nextcloud
    // account password can never drift out of sync with each other (see
    // backend/README.md's note on why register() keeps them paired).
    try {
      await nextcloudService.changePassword(target.nextcloudUsername, finalPassword)
    } catch (err) {
      const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
      logger.error({ userId: id, detail }, 'Nextcloud password change failed — Postgres password left unchanged')
      throw ApiError.serviceUnavailable('Could not update the storage account password. Please try again.')
    }

    await userRepository.update(id, { passwordHash: await hashPassword(finalPassword) })

    // An existing session shouldn't keep coasting on the credential that
    // was just invalidated — force everything back through a fresh login.
    await sessionRepository.deleteAllForUser(id)

    return wasGenerated ? { temporaryPassword: finalPassword } : {}
  },

  // Deliberately does NOT touch `planId` or the Plan/Subscription
  // relationship — this is a direct override of the Nextcloud account's
  // storage ceiling via the existing (previously unused outside tests)
  // nextcloudService.setQuota, kept fully separate from the
  // subscription/billing concept. Conflating the two would mean an
  // admin's one-off quota bump either silently misrepresents what plan a
  // user is nominally "on", or forces inventing a new pseudo-plan just to
  // describe an ad-hoc override — neither is what this endpoint is for.
  async setUserQuota(id: string, input: UpdateUserQuotaInput): Promise<void> {
    const target = await getRequiredUser(id)
    if (!target.nextcloudUsername) {
      throw ApiError.internal('This account has no storage backend provisioned')
    }
    try {
      await nextcloudService.setQuota(target.nextcloudUsername, input.storageLimitGb)
    } catch (err) {
      const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
      logger.error({ userId: id, detail }, 'Nextcloud quota update failed')
      throw ApiError.serviceUnavailable('Could not update the storage quota. Please try again.')
    }
  },

  // Reuses the exact same per-user storage-usage path the user's own
  // dashboard already calls (filesService -> webDavService, authenticated
  // via that user's own WebDAV app password) — there's no separate "admin
  // view" of storage usage, just the same one an admin is now also
  // allowed to call on someone else's behalf.
  async getUserStorage(id: string) {
    await getRequiredUser(id)
    return filesService.quota(id)
  },

  // Same reuse as getUserStorage, for the account-wide largest-files /
  // recent-uploads breakdown — genuinely free given filesService.stats
  // already takes a userId, not just "the current user".
  async getUserStorageBreakdown(id: string) {
    await getRequiredUser(id)
    return filesService.stats(id)
  },

  async getUserPayments(id: string): Promise<PaymentDTO[]> {
    await getRequiredUser(id)
    const payments = await paymentRepository.findManyForUser(id)
    return payments.map(toPaymentDTO)
  },

  async getUserSessions(id: string): Promise<SessionDTO[]> {
    await getRequiredUser(id)
    const sessions = await sessionRepository.findManyForUser(id)
    return sessions.map(toSessionDTO)
  },

  async revokeSession(id: string, sessionId: string): Promise<void> {
    const result = await sessionRepository.deleteOneForUser(sessionId, id)
    if (result.count === 0) {
      throw ApiError.notFound('Session not found')
    }
  },

  // Exposes the plans table (already existed since Phase 3, never had a
  // route) so the "create user" form can offer a real plan choice instead
  // of always silently defaulting like self-registration does. Read-only,
  // admin-only — there's still no route to create/edit a plan itself.
  async listPlans(): Promise<PlanDTO[]> {
    const plans = await planRepository.findAll()
    return plans.map(toPlanDTO)
  },

  // Cheap Postgres-only counts for the admin dashboard's summary cards —
  // deliberately does NOT attempt an account-wide storage-usage rollup:
  // that would mean an admin-triggered WebDAV quota call per user (N
  // requests against Nextcloud on every dashboard load), which is a real
  // capability this codebase doesn't have yet and isn't safe to fake here
  // as a "total storage used" number. Per-user usage is available on each
  // user's own detail view (getUserStorage) instead.
  async getOverview() {
    const [totalUsers, activeUsers, suspendedUsers, adminCount, activeSessions] = await Promise.all([
      userRepository.count(),
      userRepository.count({ status: 'ACTIVE' }),
      userRepository.count({ status: 'SUSPENDED' }),
      userRepository.count({ role: 'ADMIN' }),
      sessionRepository.countActive(),
    ])

    return { totalUsers, activeUsers, suspendedUsers, adminCount, activeSessions }
  },

  // Phase 11B — thin pass-through to reconciliation.service.ts, kept here
  // rather than called directly from admin.controller.ts purely so every
  // adminController handler goes through adminService the same way (see
  // this file's own getUserPayments/getUserSessions for the same pattern
  // with other services' repositories).
  reconcileSubscriptions(): Promise<ReconciliationSummary> {
    return reconciliationService.run()
  },
}
