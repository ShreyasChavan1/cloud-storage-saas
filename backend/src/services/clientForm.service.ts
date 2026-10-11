import { ClientRequirementForm, ClientFormStatus, Prisma } from '@prisma/client'
import { clientFormRepository } from '../repositories/clientForm.repository'
import { ApiError } from '../utils/ApiError'
import {
  SubmitClientFormInput,
  ListClientFormsQuery,
  UpdateClientFormInput,
} from '../validators/clientForm.validator'

export interface ClientFormSummaryDTO {
  id: string
  companyName: string
  contactPerson: string
  email: string
  mobile: string
  services: string[]
  status: ClientFormStatus
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
  createdAt: string
}

export interface ClientFormDTO extends ClientFormSummaryDTO {
  designation: string | null
  industry: string | null
  city: string | null
  website: string | null
  answers: Record<string, string | string[]>
  recommendedService: string | null
  estimatedScope: string | null
  suggestedArchitecture: string | null
  thirdPartyServices: string | null
  migrationSetup: boolean | null
  customDevelopment: boolean | null
  proposalRequiredBy: string | null
  technicalNotes: string | null
  updatedAt: string
}

// Empty strings from optional inputs are stored as NULL so "not provided"
// has exactly one representation.
const blankToNull = (v: string | null | undefined) => (v && v.length > 0 ? v : null)

function toSummary(f: ClientRequirementForm): ClientFormSummaryDTO {
  return {
    id: f.id,
    companyName: f.companyName,
    contactPerson: f.contactPerson,
    email: f.email,
    mobile: f.mobile,
    services: f.services,
    status: f.status,
    priority: f.priority,
    createdAt: f.createdAt.toISOString(),
  }
}

function toDTO(f: ClientRequirementForm): ClientFormDTO {
  return {
    ...toSummary(f),
    designation: f.designation,
    industry: f.industry,
    city: f.city,
    website: f.website,
    answers: (f.answers ?? {}) as Record<string, string | string[]>,
    recommendedService: f.recommendedService,
    estimatedScope: f.estimatedScope,
    suggestedArchitecture: f.suggestedArchitecture,
    thirdPartyServices: f.thirdPartyServices,
    migrationSetup: f.migrationSetup,
    customDevelopment: f.customDevelopment,
    proposalRequiredBy: f.proposalRequiredBy ? f.proposalRequiredBy.toISOString().slice(0, 10) : null,
    technicalNotes: f.technicalNotes,
    updatedAt: f.updatedAt.toISOString(),
  }
}

export const clientFormService = {
  async submit(input: SubmitClientFormInput): Promise<{ id: string }> {
    const created = await clientFormRepository.create({
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      designation: blankToNull(input.designation),
      mobile: input.mobile,
      email: input.email,
      industry: blankToNull(input.industry),
      city: blankToNull(input.city),
      website: blankToNull(input.website),
      services: input.services,
      answers: input.answers as Prisma.InputJsonValue,
    })
    return { id: created.id }
  },

  async list(query: ListClientFormsQuery) {
    const where: Prisma.ClientRequirementFormWhereInput = {}
    if (query.status) where.status = query.status
    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search } },
      ]
    }
    const skip = (query.page - 1) * query.limit
    const [rows, total, newCount] = await Promise.all([
      clientFormRepository.findMany({ where, skip, take: query.limit }),
      clientFormRepository.count(where),
      clientFormRepository.countByStatus('NEW'),
    ])
    return { forms: rows.map(toSummary), total, page: query.page, limit: query.limit, newCount }
  },

  async get(id: string): Promise<ClientFormDTO> {
    const form = await clientFormRepository.findById(id)
    if (!form) throw ApiError.notFound('Form not found')
    return toDTO(form)
  },

  async update(id: string, input: UpdateClientFormInput): Promise<ClientFormDTO> {
    const existing = await clientFormRepository.findById(id)
    if (!existing) throw ApiError.notFound('Form not found')

    // `undefined` = leave alone; `null`/'' = clear. Spreading only the keys
    // the admin actually sent keeps a partial save from wiping other fields.
    const data: Prisma.ClientRequirementFormUpdateInput = {}
    if (input.status !== undefined) data.status = input.status
    if (input.priority !== undefined) data.priority = input.priority
    if (input.recommendedService !== undefined) data.recommendedService = blankToNull(input.recommendedService)
    if (input.estimatedScope !== undefined) data.estimatedScope = blankToNull(input.estimatedScope)
    if (input.suggestedArchitecture !== undefined) data.suggestedArchitecture = blankToNull(input.suggestedArchitecture)
    if (input.thirdPartyServices !== undefined) data.thirdPartyServices = blankToNull(input.thirdPartyServices)
    if (input.migrationSetup !== undefined) data.migrationSetup = input.migrationSetup
    if (input.customDevelopment !== undefined) data.customDevelopment = input.customDevelopment
    if (input.proposalRequiredBy !== undefined) {
      data.proposalRequiredBy = input.proposalRequiredBy ? new Date(`${input.proposalRequiredBy}T00:00:00.000Z`) : null
    }
    if (input.technicalNotes !== undefined) data.technicalNotes = blankToNull(input.technicalNotes)

    return toDTO(await clientFormRepository.update(id, data))
  },
}
