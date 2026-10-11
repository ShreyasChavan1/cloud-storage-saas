import { Prisma, ClientFormStatus } from '@prisma/client'
import { prisma } from '../database/prisma'

export const clientFormRepository = {
  create(data: Prisma.ClientRequirementFormCreateInput) {
    return prisma.clientRequirementForm.create({ data })
  },

  findById(id: string) {
    return prisma.clientRequirementForm.findUnique({ where: { id } })
  },

  findMany(params: { where?: Prisma.ClientRequirementFormWhereInput; skip?: number; take?: number }) {
    return prisma.clientRequirementForm.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    })
  },

  count(where?: Prisma.ClientRequirementFormWhereInput) {
    return prisma.clientRequirementForm.count({ where })
  },

  countByStatus(status: ClientFormStatus) {
    return prisma.clientRequirementForm.count({ where: { status } })
  },

  update(id: string, data: Prisma.ClientRequirementFormUpdateInput) {
    return prisma.clientRequirementForm.update({ where: { id }, data })
  },
}
