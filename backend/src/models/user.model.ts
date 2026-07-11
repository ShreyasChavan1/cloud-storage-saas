import { User } from '@prisma/client'
import { AuthUserDTO } from '../types/auth.types'

// Strips passwordHash and any other internal-only fields before a User
// ever leaves the service layer. Controllers/services should always pass
// through this rather than spreading the Prisma row directly into a response.
export function toAuthUserDTO(user: User): AuthUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarInitials: user.avatarInitials,
    plan: user.plan,
  }
}
