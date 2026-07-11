import { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/ApiError'

// Registered after all routes but before the error middleware — catches
// any request that didn't match a route so it goes through the same
// JSON error envelope instead of Express's default HTML 404 page.
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}
