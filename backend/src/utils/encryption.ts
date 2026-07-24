import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env } from '../config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // recommended for GCM
const AUTH_TAG_LENGTH = 16

const key = Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'hex')

/**
 * Reversible encryption for secrets the backend needs the plaintext of
 * again later (e.g. a per-user Nextcloud WebDAV app password) — NOT for
 * anything that only ever needs comparison, which is what bcrypt (one-way)
 * is for. Never use this for login passwords.
 *
 * Output is a single string: base64(iv) + '.' + base64(authTag) + '.' +
 * base64(ciphertext) — self-contained, so decrypt() needs nothing but the
 * key and this string.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decrypt(encoded: string): string {
  const parts = encoded.split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext: expected iv.authTag.ciphertext')
  }
  const [ivB64, authTagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Malformed ciphertext: unexpected iv/authTag length')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
