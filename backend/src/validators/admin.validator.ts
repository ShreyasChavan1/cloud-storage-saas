import { z } from 'zod'
import { emailField, passwordField, personNameField, phoneField } from './auth.validator'

const uuidParam = z.string().uuid('Invalid id')

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    // Capped at 100 — this is an admin table, not a bulk-export endpoint;
    // a much larger page size would turn one request into an expensive
    // full-table-ish scan for no real UI benefit.
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  }),
})

export const userIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
})

export const createUserSchema = z.object({
  body: z.object({
    name: personNameField,
    email: emailField,
    phoneNumber: phoneField,
    password: passwordField,
    role: z.enum(['USER', 'ADMIN']).optional(),
    planId: z.string().uuid().optional(),
  }),
})

export const updateUserStatusSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
  }),
})

export const updateUserQuotaSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    // Gigabytes, matching Plan.storageLimit's existing unit throughout
    // the rest of this codebase (see NextcloudService.setQuota).
    // Capped well above the largest seeded plan (500GB) as a sanity
    // check, not a real product ceiling.
    storageLimitGb: z.coerce.number().int().min(1).max(100_000),
  }),
})

export const revokeSessionSchema = z.object({
  params: z.object({ id: uuidParam, sessionId: uuidParam }),
})

export type CreateUserInput = z.infer<typeof createUserSchema>['body']
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>['body']
export type UpdateUserQuotaInput = z.infer<typeof updateUserQuotaSchema>['body']
export type ListUsersQuery = z.infer<typeof listUsersSchema>['query']
