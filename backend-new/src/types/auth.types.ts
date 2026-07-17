export interface AuthTokenPayload {
  sub: string // user id
  email: string
}

// Shape returned to the client — mirrors the frontend's AuthUser interface
// in src/context/AuthContext.tsx (plan is now the Plan.name string, e.g.
// "Free"/"Basic"/"Pro", coming from the real plans table instead of an enum).
export interface AuthUserDTO {
  id: string
  name: string
  email: string
  avatarInitials: string
  plan: string | null
  role: 'USER' | 'ADMIN'
}

export interface AuthResponseDTO {
  user: AuthUserDTO
  accessToken: string
}
