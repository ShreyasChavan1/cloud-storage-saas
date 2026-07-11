import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { sendError } from '../utils/response'
import { logger } from '../config/logger'
import { env } from '../config/env'

// Must be registered last, after all routes. Express recognizes it as an
// error handler purely by its 4-argument signature.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error({ err, reqId: req.id }, 'Non-operational error')
    }
    return sendError(res, err.statusCode, err.message, err.details)
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'A record with this value already exists', { fields: err.meta?.target })
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'Record not found')
    }
  }

  logger.error({ err, reqId: req.id }, 'Unhandled error')

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error)?.message
  return sendError(res, 500, message ?? 'Internal server error')
}
