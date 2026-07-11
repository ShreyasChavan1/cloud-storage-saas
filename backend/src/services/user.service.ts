import { userRepository } from '../repositories/user.repository'
import { toAuthUserDTO } from '../models/user.model'
import { ApiError } from '../utils/ApiError'
import { UpdateProfileInput } from '../validators/auth.validator'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')
    return toAuthUserDTO(user)
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepository.findById(userId)
    if (!user) throw ApiError.notFound('User not found')

    const updated = await userRepository.update(userId, {
      ...(input.name ? { name: input.name, avatarInitials: initials(input.name) } : {}),
    })

    return toAuthUserDTO(updated)
  },
}
