import { Prisma, User } from '@prisma/client'
import { AuthUserDTO } from '../types/auth.types'
import { initialsFromName } from '../utils/initials'

// The shape we actually query users in (repository always includes `plan`
// so this mapper can read `plan.name` without a second query).
export type UserWithPlan = User & { plan: Prisma.PlanGetPayload<{}> | null }

// Strips passwordHash and any other internal-only fields before a User
// ever leaves the service layer. Controllers/services should always pass
// through this rather than spreading the Prisma row directly into a response.
export function toAuthUserDTO(user: UserWithPlan): AuthUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarInitials: initialsFromName(user.name),
    plan: user.plan?.name ?? null,
    role: user.role,
  }
}
