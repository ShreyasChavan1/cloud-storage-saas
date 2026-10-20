import { createApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { reconciliationService } from './services/reconciliation.service'
import { connectDatabase, disconnectDatabase } from './database/prisma'
import { runAuthCleanup } from './services/authCleanup.service'

async function bootstrap() {
  await connectDatabase()

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 DVT Solutions API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`)
  })

  // Node's HTTP server defaults to requestTimeout = 300s: the ENTIRE request
  // (headers + body) must arrive within 5 minutes or the socket is destroyed.
  // A large upload over a normal connection takes longer than that, so it
  // died midway. 0 disables that cap; slow/stalled connections are still
  // cut off by the OS and by the proxy in front of this app.
  server.requestTimeout = 0
  server.timeout = 0
  server.headersTimeout = 60_000
  server.keepAliveTimeout = 65_000

  // Housekeeping for auth tables: expired/rotated sessions and used or expired
  // reset/verification tokens. Without it they accumulate forever. unref() so
  // the timer never keeps the process alive during shutdown.
  void runAuthCleanup()
  const cleanupTimer = setInterval(() => void runAuthCleanup(), 60 * 60 * 1000)
  cleanupTimer.unref()

  // Billing sweep: marks overdue subscriptions PAST_DUE and, once the grace
  // window (PAST_DUE_GRACE_DAYS) has run out, moves them to the Free plan.
  // Nothing else calls reconciliationService on a schedule, so without this
  // an unpaid account would stay on its paid plan indefinitely. Runs shortly
  // after start and then every RECONCILE_INTERVAL_HOURS (default 6; set 0 to
  // turn it off if an external scheduler already calls
  // POST /admin/reconcile-subscriptions). Safe to run more than once — every
  // step is idempotent.
  const reconcileHours = Number(process.env.RECONCILE_INTERVAL_HOURS ?? 6)
  if (Number.isFinite(reconcileHours) && reconcileHours > 0) {
    const runReconcile = () =>
      reconciliationService
        .run()
        .then((summary) => logger.info({ summary }, 'Subscription reconciliation finished'))
        .catch((err) => logger.error({ err }, 'Subscription reconciliation failed'))
    setTimeout(() => void runReconcile(), 60_000).unref()
    setInterval(() => void runReconcile(), reconcileHours * 60 * 60 * 1000).unref()
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
  })
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception')
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server')
  process.exit(1)
})
