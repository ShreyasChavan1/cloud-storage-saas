import { z } from 'zod'
import { emailField, passwordField } from './auth.validator'

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordField,
  }).refine((v) => v.currentPassword !== v.newPassword, { message: 'New password must be different from the current password', path: ['newPassword'] }),
})

export const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().min(20), password: passwordField }),
})

export const notificationPreferencesSchema = z.object({
  body: z.object({
    fileShared: z.boolean(),
    comments: z.boolean(),
    storageAlmostFull: z.boolean(),
    productUpdates: z.boolean(),
  }),
})

export const forgotEmailSchema = z.object({ body: z.object({ email: emailField }) })
