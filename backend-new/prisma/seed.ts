import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Prices are placeholders — the spec only fixed the storage tiers
// (5GB / 100GB / 500GB), not pricing. Adjust freely before going live.
const plans = [
  { name: 'Free', storageLimit: 5, price: 0 },
  { name: 'Basic', storageLimit: 100, price: 9.99 },
  { name: 'Pro', storageLimit: 500, price: 24.99 },
]

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { storageLimit: plan.storageLimit, price: plan.price },
      create: plan,
    })
    console.log(`✓ Seeded plan: ${plan.name} (${plan.storageLimit}GB, $${plan.price})`)
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
