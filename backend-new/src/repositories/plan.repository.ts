import { prisma } from '../database/prisma'

export const planRepository = {
  findByName(name: string) {
    return prisma.plan.findUnique({ where: { name } })
  },

  findById(id: string) {
    return prisma.plan.findUnique({ where: { id } })
  },

  findAll() {
    return prisma.plan.findMany({ orderBy: { price: 'asc' } })
  },
}
