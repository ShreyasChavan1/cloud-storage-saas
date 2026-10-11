import { Request, Response } from 'express'
import { clientFormService } from '../services/clientForm.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'
import { ListClientFormsQuery } from '../validators/clientForm.validator'

export const clientFormController = {
  // Public — see routes/clientForm.routes.ts.
  submit: asyncHandler(async (req: Request, res: Response) => {
    const result = await clientFormService.submit(req.body)
    return sendSuccess(res, result, 201)
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await clientFormService.list(req.query as unknown as ListClientFormsQuery)
    return sendSuccess(res, result)
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const form = await clientFormService.get(req.params.id)
    return sendSuccess(res, { form })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const form = await clientFormService.update(req.params.id, req.body)
    return sendSuccess(res, { form })
  }),
}
