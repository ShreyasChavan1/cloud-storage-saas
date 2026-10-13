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

  // Backslashes and control characters have no legitimate use in a path here
  // and are the usual carriers for encoding tricks (`..\\`, CRLF injection).
  // Percent-encoded sequences such as %2e%2e are NOT decoded anywhere in this
  // codebase: they stay literal characters of one segment and are re-encoded
  // on the way out, so they cannot act as traversal.
  // eslint-disable-next-line no-control-regex
  if (/[\\\x00-\x1f\x7f]/.test(rawPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
  // Refuse (rather than silently clamp) any ".." segment, so probing attempts
  // fail loudly instead of quietly resolving to a different location.
  if (rawPath.split('/').includes('..')) {
    throw new InvalidPathError('Path must not contain ".." segments')
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


/**
 * Validates a single file/folder NAME (not a path) supplied separately from a
 * folder, e.g. the multipart `originalname` of an upload. It must stay one
 * segment: joined onto a folder, "../../x" or "a/b" would otherwise place the
 * file somewhere the caller did not name.
 */
export function assertSafeFileName(name: unknown): string {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    throw new InvalidPathError('Invalid file name')
  }
  // eslint-disable-next-line no-control-regex
  if (name === '.' || name === '..' || /[/\\\x00-\x1f\x7f]/.test(name)) {
    throw new InvalidPathError('Invalid file name')
  }
  return name
}

/**
 * Validates an opaque server-issued identifier that is placed into a URL path
 * segment (Nextcloud trash ids). Anything containing a separator, or equal to
 * "." / "..", could re-point the request to a different collection.
 */
export function isSafeSegmentId(id: string): boolean {
  // eslint-disable-next-line no-control-regex
  return id.length > 0 && id.length <= 512 && id !== '.' && id !== '..' && !/[/\\\x00-\x1f\x7f]/.test(id)
}
