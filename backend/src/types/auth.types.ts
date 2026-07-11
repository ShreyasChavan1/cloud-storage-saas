export interface AuthTokenPayload {
  sub: string // user id
  email: string
}

// Shape returned to the client — mirrors the frontend's AuthUser interface
// in src/context/AuthContext.tsx exactly, so Phase 2 swaps in with zero
// component changes.
export interface AuthUserDTO {
  id: string
  name: string
  email: string
  avatarInitials: string
  plan: 'STARTER' | 'PRO' | 'TEAM'
}

export interface AuthResponseDTO {
  user: AuthUserDTO
  accessToken: string
}
