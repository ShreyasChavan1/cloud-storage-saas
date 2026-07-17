import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { httpLogger } from './config/httpLogger'
import routes from './routes'
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
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(httpLogger)

  app.use('/api', routes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
