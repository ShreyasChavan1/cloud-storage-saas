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

  // Used both to compensate a failed registration (Postgres user created
  // but Nextcloud provisioning failed) and, as of Phase 10, by
  // adminService.deleteUser — cascades to that user's sessions,
  // subscriptions, payments, and password reset tokens (all `onDelete:
  // Cascade` in schema.prisma), so there's nothing left to clean up
  // manually on this side once this resolves.
  delete(id: string): Promise<UserWithPlan> {
    return prisma.user.delete({ where: { id }, include: { plan: true } })
  },

  // Added for Phase 10's admin user list — search/filter/paginate in one
  // query rather than fetching everything and filtering in memory, so this
  // stays cheap regardless of how many accounts exist.
  findMany(params: {
    where?: Prisma.UserWhereInput
    skip?: number
    take?: number
  }): Promise<UserWithPlan[]> {
    return prisma.user.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    })
  },

  count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where })
  },

  // Guards adminService's "don't lock the app out" checks (can't
  // suspend/delete the last remaining admin). `excludeId` lets a caller
  // ask "how many admins are there OTHER than this one" in a single query
  // rather than fetching and filtering client-side.
  countAdmins(excludeId?: string): Promise<number> {
    return prisma.user.count({
      where: { role: 'ADMIN', ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  },
}
