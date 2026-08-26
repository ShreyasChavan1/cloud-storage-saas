import { z } from 'zod'

// Exported so other validators (Phase 10's admin.validator.ts, for
// creating a user) apply the exact same rules rather than re-declaring
// them and risking the two drifting apart.
export const emailField = z.string().trim().toLowerCase().email('Enter a valid email address')
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
export const personNameField = z.string().trim().min(2, 'Name must be at least 2 characters').max(80)

export const registerSchema = z.object({
  body: z.object({
    name: personNameField,
    email: emailField,
    password: passwordField,
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
  }),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailField,
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body']
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body']
