import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'
import { logger } from '../config/logger'

// A single, shared PrismaClient instance. In dev, Node's module cache can
// still get blown away by tsx's watch-mode reloads, so we stash the client
// on `global` to avoid exhausting Postgres connections across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

export async function connectDatabase() {
  await prisma.$connect()
  logger.info('✅ Connected to PostgreSQL via Prisma')
}

export async function disconnectDatabase() {
  await prisma.$disconnect()
}
