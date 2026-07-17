import { NextFunction, Request, Response } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'

// Validates body/query/params against a Zod schema shaped as
// z.object({ body, query, params }) and replaces req fields with the
// parsed (and coerced/trimmed) values.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      if (parsed.body) req.body = parsed.body
      if (parsed.params) req.params = parsed.params
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
        return next(ApiError.badRequest('Validation failed', details))
      }
      next(err)
    }
  }
}
