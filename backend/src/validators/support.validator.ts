import { z } from 'zod'
import { emailField } from './auth.validator'

export const sendSupportMessageSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    message: z.string().trim().min(1, 'Message is required').max(5000),
  }),
})

export const updateSupportContactSchema = z.object({
  body: z.object({
    email: emailField,
    // Deliberately not a strict phone-format validator — this is a
    // free-typed contact number, not something dialed programmatically
    // anywhere in this codebase, so over-validating (country codes,
    // formatting) would only reject legitimate values for no real benefit.
    phone: z.string().trim().min(5, 'Enter a valid phone number').max(30),
  }),
})

export type SendSupportMessageInput = z.infer<typeof sendSupportMessageSchema>['body']
export type UpdateSupportContactInput = z.infer<typeof updateSupportContactSchema>['body']
