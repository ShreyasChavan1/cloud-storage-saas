import { z } from 'zod'

export const submitFeedbackSchema = z.object({
  body: z.object({
    rating: z
      .number({ invalid_type_error: 'Choose a star rating' })
      .int('Choose a star rating')
      .min(1, 'Choose a star rating')
      .max(5, 'Choose a star rating'),
    description: z.string().trim().min(3, 'Please tell us a little more').max(2000, 'Please keep it under 2000 characters'),
  }),
})

export const listFeedbackSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    search: z.string().trim().max(200).optional(),
  }),
})

export const feedbackIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid id') }),
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>['body']
export type ListFeedbackQuery = z.infer<typeof listFeedbackSchema>['query']
