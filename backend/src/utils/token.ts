import { randomBytes } from 'crypto'

// The raw token that goes to the user (email link, or dev-mode response).
// Only its hash (see utils/jwt.ts hashToken) is ever persisted.
export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
