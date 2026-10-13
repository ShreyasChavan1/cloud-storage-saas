import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import multer from 'multer'
import { ApiError } from '../utils/ApiError'
import { sendError } from '../utils/response'
import { logger } from '../config/logger'
import { env } from '../config/env'
import { InvalidPathError } from '../utils/davPath'

// Must be registered last, after all routes. Express recognizes it as an
// error handler purely by its 4-argument signature.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error({ err, reqId: req.id }, 'Non-operational error')
    }
    return sendError(res, err.statusCode, err.message, err.details)
  }

  if (err instanceof InvalidPathError) {
    return sendError(res, 400, err.message)
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return sendError(res, statusCode, err.message)
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

  // Raw error text can contain SQL, file paths or upstream URLs. Show it only
  // when NODE_ENV is explicitly 'development'; every other value (including
  // a misconfigured one) gets the generic message.
  const message = env.NODE_ENV === 'development' ? (err as Error)?.message : 'Internal server error'
  return sendError(res, 500, message ?? 'Internal server error')
}
