import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { provisionUser } from '../src/services/userProvisioning.service'
import { ApiError } from '../src/utils/ApiError'

const prisma = new PrismaClient()

// Prices are placeholders — the spec only fixed the storage tiers
// (5GB / 100GB / 500GB), not pricing. Adjust freely before going live.
const plans = [
  { name: 'Free', storageLimit: 5, price: 0 },
  { name: 'Basic', storageLimit: 100, price: 9.99 },
  { name: 'Pro', storageLimit: 500, price: 24.99 },
]

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { storageLimit: plan.storageLimit, price: plan.price },
      create: plan,
    })
    console.log(`✓ Seeded plan: ${plan.name} (${plan.storageLimit}GB, $${plan.price})`)
  }
}

// Optional (Phase 10): with no admin-role route into the app otherwise —
// register() always creates role USER — there'd be no way to reach the
// admin dashboard on a fresh database without this. Entirely skipped if
// the two env vars below aren't set, so this never changes behavior for
// any existing deployment or CI run that doesn't set them.
//
// This goes through the exact same provisionUser() pipeline as a normal
// signup or an admin creating a user from the dashboard — meaning it also
// creates a real Nextcloud account for this admin, and so (like
// register()) needs NEXTCLOUD_AGENT_URL/NEXTCLOUD_AGENT_TOKEN/
// NEXTCLOUD_URL/CREDENTIAL_ENCRYPTION_KEY set and a reachable Nextcloud
// agent — not just a database connection. There is deliberately no
// "just insert a Postgres row with role=ADMIN" shortcut here: an admin
// account that can log in but has no working storage backend would just
// be a different, more confusing bug to debug later.
async function seedBootstrapAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL
  const password = process.env.ADMIN_SEED_PASSWORD
  const name = process.env.ADMIN_SEED_NAME ?? 'Admin'

  if (!email || !password) {
    console.log('ℹ ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set — skipping bootstrap admin.')
    return
  }

  try {
    await provisionUser({ name, email, password, role: 'ADMIN' })
    console.log(`✓ Seeded bootstrap admin: ${email}`)
  } catch (err) {
    // provisionUser throws ApiError.conflict(...) if this email is already
    // registered — the expected, harmless case on every seed run after
    // the first. Anything else (e.g. the Nextcloud agent being
    // unreachable) should still fail the whole seed loudly.
    if (err instanceof ApiError && err.statusCode === 409) {
      console.log(`ℹ Bootstrap admin ${email} already exists — skipping.`)
      return
    }
    throw err
  }
}

async function main() {
  await seedPlans()
  await seedBootstrapAdmin()
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
