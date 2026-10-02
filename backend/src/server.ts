import { createApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { connectDatabase, disconnectDatabase } from './database/prisma'

async function bootstrap() {
  await connectDatabase()

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Nimbus API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`)
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
