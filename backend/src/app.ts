import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { httpLogger } from './config/httpLogger'
import routes from './routes'
import webhookRoutes from './routes/webhook.routes'
import { notFoundMiddleware } from './middleware/notFound.middleware'
import { errorMiddleware } from './middleware/error.middleware'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true, // required so the browser sends/receives the refresh-token cookie
    })
  )
  app.use(httpLogger)

  // Phase 11B — mounted BEFORE the app-wide express.json() below, and
  // given its own express.raw() rather than the parsed JSON body every
  // other route gets. Razorpay's webhook signature
  // (RazorpayService.verifyWebhookSignature) is computed over the exact
  // raw request bytes; re-serializing an already-JSON.parse'd body is not
  // guaranteed to reproduce those bytes (key order, whitespace, number
  // formatting can all differ), which would silently break verification.
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes)

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  app.use('/api', routes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
