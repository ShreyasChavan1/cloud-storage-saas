import { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma'
import { UserWithPlan } from '../models/user.model'

// Every read includes `plan` — the mapper (toAuthUserDTO) always needs
// plan.name, so it's simpler to fetch it consistently here than to remember
// to `include` it at every call site.
export const userRepository = {
  findByEmail(email: string): Promise<UserWithPlan | null> {
    return prisma.user.findUnique({ where: { email }, include: { plan: true } })
  },

  findById(id: string): Promise<UserWithPlan | null> {
    return prisma.user.findUnique({ where: { id }, include: { plan: true } })
  },

  create(data: Prisma.UserCreateInput): Promise<UserWithPlan> {
    return prisma.user.create({ data, include: { plan: true } })
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithPlan> {
    return prisma.user.update({ where: { id }, data, include: { plan: true } })
  },

  // Only used to compensate a failed registration (Postgres user created
  // but Nextcloud provisioning failed) — never exposed via any route.
  delete(id: string): Promise<UserWithPlan> {
    return prisma.user.delete({ where: { id }, include: { plan: true } })
  },
}
