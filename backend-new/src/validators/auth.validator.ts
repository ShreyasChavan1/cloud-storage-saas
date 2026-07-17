import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body']
