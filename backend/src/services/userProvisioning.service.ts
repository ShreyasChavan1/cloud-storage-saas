import { userRepository } from '../repositories/user.repository'
import { planRepository } from '../repositories/plan.repository'
import { nextcloudService, NextcloudApiError } from './NextcloudService'
import { encrypt } from '../utils/encryption'
import { hashPassword } from '../utils/password'
import { ApiError } from '../utils/ApiError'
import { DEFAULT_PLAN_NAME } from '../config/plans'
import { logger } from '../config/logger'
import { UserWithPlan } from '../models/user.model'

export interface ProvisionUserInput {
  name: string
  email: string
  password: string
  // Omitted → resolves to the seeded default plan, exactly like a normal
  // self-registration always has. Only admin-initiated creation (Phase 10)
  // ever passes this explicitly.
  planId?: string
  // Omitted → 'USER', same default the `role` column itself has. Only
  // admin-initiated creation can produce another ADMIN account this way —
  // self-registration never passes this.
  role?: 'USER' | 'ADMIN'
}

/**
 * The full account-creation pipeline: validates the email is free, resolves
 * a plan, creates the Postgres row, provisions the matching Nextcloud
 * account (quota-limited to the plan), and rolls the Postgres row back if
 * Nextcloud provisioning fails — so there's never a Postgres user left
 * behind with no storage backend, regardless of which caller triggered
 * this.
 *
 * Used by both auth.service.ts's register() (self-signup, always role
 * USER, always the default plan) and admin.service.ts's createUser()
 * (Phase 10 — an admin may pick a specific plan and/or role). Keeping this
 * one path shared means a future change to the provisioning sequence only
 * has to happen once.
 */
export async function provisionUser(input: ProvisionUserInput): Promise<UserWithPlan> {
  const existing = await userRepository.findByEmail(input.email)
  if (existing) {
    throw ApiError.conflict('An account with this email already exists')
  }

  const plan = input.planId
    ? await planRepository.findById(input.planId)
    : await planRepository.findByName(DEFAULT_PLAN_NAME)

  if (!plan) {
    if (input.planId) {
      // Caller-supplied id that doesn't exist — a bad request, not a
      // server misconfiguration.
      throw ApiError.badRequest('Invalid plan')
    }
    // Fails loudly rather than silently creating a plan-less account —
    // almost always means `npm run prisma:seed` hasn't been run yet.
    throw ApiError.internal(
      `Default plan "${DEFAULT_PLAN_NAME}" not found. Run "npm run prisma:seed" to seed plans.`
    )
  }

  const passwordHash = await hashPassword(input.password)

  // 1. Create the PostgreSQL user first — it's the source of truth for
  // "does this account exist", and gives us a stable, unique id to use
  // as the Nextcloud username (sidesteps Nextcloud's username character
  // restrictions entirely — a UUID is always valid).
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role ?? 'USER',
    plan: { connect: { id: plan.id } },
  })

  // 2. Provision the matching Nextcloud account, quota-limited to the
  // resolved plan. If this fails, roll back the Postgres user rather than
  // leaving an account with no storage backend behind it.
  const nextcloudUsername = user.id
  let webdavPassword: string
  try {
    const result = await nextcloudService.createUser(
      nextcloudUsername,
      input.password,
      plan.storageLimit,
      input.name,
      input.email
    )
    webdavPassword = result.webdavPassword
  } catch (err) {
    await userRepository.delete(user.id)
    const detail = err instanceof NextcloudApiError ? err.message : 'unknown error'
    logger.error({ userId: user.id, detail }, 'Nextcloud provisioning failed — rolled back Postgres user')
    throw ApiError.serviceUnavailable('Could not set up the storage account. Please try again.')
  }

  // 3. Store the nextcloud_username and the encrypted WebDAV app password
  // now that provisioning succeeded. The plaintext webdavPassword never
  // touches the database or a log line — only encrypt()'s output does.
  return userRepository.update(user.id, {
    nextcloudUsername,
    nextcloudWebdavPasswordEncrypted: encrypt(webdavPassword),
  })
}
