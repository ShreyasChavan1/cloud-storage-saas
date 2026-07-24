import { posix } from 'path'

const MAX_PATH_LENGTH = 1024

export class InvalidPathError extends Error {}

/**
 * Normalizes and validates a user-supplied file path, guaranteeing the
 * result can never escape their own WebDAV root — this is the only thing
 * standing between a request like `path=../../other-user` and actually
 * reaching another user's files, so every one of the 9 file routes must
 * run its path argument(s) through this before building a WebDAV request.
 */
export function sanitizeDavPath(rawPath: string | undefined | null): string {
  if (rawPath === undefined || rawPath === null || rawPath === '') {
    return '/'
  }
  if (typeof rawPath !== 'string') {
    throw new InvalidPathError('Path must be a string')
  }
  if (rawPath.includes('\0')) {
    throw new InvalidPathError('Path must not contain null bytes')
  }
  if (rawPath.length > MAX_PATH_LENGTH) {
    throw new InvalidPathError('Path is too long')
  }

  // Anchor to root BEFORE normalizing. path.posix.normalize() collapses any
  // ".." that would climb above a leading "/" back down to "/" — this is
  // what actually neutralizes something like "../../../etc/passwd".
  const anchored = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const normalized = posix.normalize(anchored)

  // Defense in depth: explicitly refuse anything that still looks like it
  // escapes upward after normalizing, rather than trusting normalize()
  // alone to have handled every case.
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new InvalidPathError('Path escapes the allowed root')
  }

  // Strip a single trailing slash, except for root itself.
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}
