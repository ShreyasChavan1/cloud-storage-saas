import { userRepository } from '../repositories/user.repository'
import { sessionRepository } from '../repositories/session.repository'
import { billingSubscriptionRepository } from '../repositories/billingSubscription.repository'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { razorpayService } from './RazorpayService'
import { comparePassword } from '../utils/password'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'

const TERMINAL_BILLING_STATUSES = new Set(['CANCELLED', 'COMPLETED', 'EXPIRED'])

/**
 * The one place an account is torn down, shared by self-service deletion and
 * admin deletion so the two cannot drift apart.
 *
 * Order matters, and every external step fails CLOSED (abort, leave the
 * account in place, let the caller retry) rather than leaving something
 * dangling:
 *   1. Revoke every session and live access token, so nobody keeps acting as
 *      the user while deletion is in flight.
 *   2. Cancel recurring Razorpay billing. Deleting only our rows would leave
 *      the customer's autopay running with no account to show for it.
 *   3. Delete the Nextcloud account (and with it all their files).
 *   4. Delete the Postgres row; sessions, shares, tokens, subscriptions and
 *      payments cascade (see schema.prisma — note payment history goes too).
 */
export async function deleteAccountData(target: { id: string; nextcloudUsername: string | null }): Promise<void> {
  await userRepository.revokeAccessTokens(target.id)
  await sessionRepository.deleteAllForUser(target.id)

  const billingRows = await billingSubscriptionRepository.findByUserId(target.id)
  for (const row of billingRows) {
    if (TERMINAL_BILLING_STATUSES.has(row.status)) continue
    try {
      await razorpayService.cancelSubscription(row.razorpaySubscriptionId, false)
      await billingSubscriptionRepository.updateStatus(row.id, 'CANCELLED')
    } catch (err) {
      logger.error({ userId: target.id, billingSubscriptionId: row.id, err }, 'Could not cancel Razorpay subscription — account NOT deleted')
      throw ApiError.serviceUnavailable('Could not cancel your subscription, so the account was not deleted. Please try again.')
    }
  }

  if (target.nextcloudUsername) {
    try {
      await nextcloudService.deleteUser(target.nextcloudUsername)
    } catch (err) {
      const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
      logger.error({ userId: target.id, detail }, 'Nextcloud account deletion failed — Postgres user NOT deleted')
      throw ApiError.serviceUnavailable('Could not delete the storage account. Please try again.')
    }
  }

  await userRepository.delete(target.id)
}

export const accountDeletionService = {
  // Self-service. Re-authenticates with the password so a stolen access token
  // alone cannot destroy an account and all its files.
  async deleteOwnAccount(userId: string, password: string): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')

    if (!(await comparePassword(password, user.passwordHash))) {
      throw ApiError.unauthorized('Password is incorrect')
    }
    // Admin accounts are removed by another admin (which also enforces the
    // "never delete the last admin" rule in adminService).
    if (user.role === 'ADMIN') {
      throw ApiError.forbidden('Admin accounts cannot be self-deleted. Ask another admin to remove it.')
    }

    await deleteAccountData(user)
    logger.info({ userId }, 'Account deleted by its owner')
  },
}
