import { z } from 'zod'
import { emailField } from './auth.validator'

const optionalText = (max: number) => z.string().trim().max(max).optional()
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()

// Section 3-6 answers are free-form by design (which fields exist depends on
// the services the client ticked), so they're validated for shape and size
// only — field key -> one string, or a list of ticked options.
const answerValue = z.union([
  z.string().trim().max(2000),
  z.array(z.string().trim().max(200)).max(30),
])

export const submitClientFormSchema = z.object({
  body: z.object({
    companyName: z.string().trim().min(2, 'Company / client name is required').max(200),
    contactPerson: z.string().trim().min(2, 'Contact person is required').max(120),
    designation: optionalText(120),
    // Looser than the registration phone rule on purpose: a prospect typing
    // "098765 43210" or "+91-98765-43210" shouldn't be bounced.
    mobile: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,18}$/, 'Enter a valid mobile number'),
    email: emailField,
    industry: optionalText(120),
    city: optionalText(120),
    website: optionalText(200),
    services: z
      .array(z.string().trim().min(1).max(100))
      .min(1, 'Select at least one service')
      .max(20),
    answers: z
      .record(z.string().max(60), answerValue)
      .refine((v) => Object.keys(v).length <= 80, 'Too many answers')
      .default({}),
    confirmed: z.literal(true, {
      errorMap: () => ({ message: 'Please confirm the details before submitting' }),
    }),
  }),
})

const statusEnum = z.enum(['NEW', 'IN_REVIEW', 'PROPOSAL_SENT', 'CLOSED'])
const priorityEnum = z.enum(['NORMAL', 'HIGH', 'URGENT'])
const idParam = z.object({ id: z.string().uuid('Invalid id') })

export const listClientFormsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: statusEnum.optional(),
  }),
})

export const clientFormIdParamSchema = z.object({ params: idParam })

// Only the admin-owned fields — the client's own answers are never editable
// through this route.
export const updateClientFormSchema = z.object({
  params: idParam,
  body: z.object({
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    recommendedService: nullableText(200),
    estimatedScope: nullableText(500),
    suggestedArchitecture: nullableText(1000),
    thirdPartyServices: nullableText(500),
    migrationSetup: z.boolean().nullable().optional(),
    customDevelopment: z.boolean().nullable().optional(),
    proposalRequiredBy: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .nullable()
      .optional(),
    technicalNotes: nullableText(5000),
  }),
})

export type SubmitClientFormInput = z.infer<typeof submitClientFormSchema>['body']
export type ListClientFormsQuery = z.infer<typeof listClientFormsSchema>['query']
export type UpdateClientFormInput = z.infer<typeof updateClientFormSchema>['body']
