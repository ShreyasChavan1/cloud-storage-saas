import { randomBytes } from 'crypto'

// The raw token that goes to the user (email link, or dev-mode response).
// Only its hash (see utils/jwt.ts hashToken) is ever persisted.
export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

// Random credential for the user's Nextcloud account. Nobody (including the
// user) ever types it; it exists only so the agent can mint a WebDAV app
// password. The fixed suffix guarantees every character class so it also
// satisfies Nextcloud's password_policy app if that is enabled.
export function generateStorageSecret(): string {
  return `${randomBytes(30).toString('base64')}-Aa1`
}
