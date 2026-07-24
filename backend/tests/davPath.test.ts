import { sanitizeDavPath, InvalidPathError } from '../src/utils/davPath'

describe('sanitizeDavPath', () => {
  it('defaults empty/undefined/null to root', () => {
    expect(sanitizeDavPath(undefined)).toBe('/')
    expect(sanitizeDavPath(null)).toBe('/')
    expect(sanitizeDavPath('')).toBe('/')
  })

  it('passes through ordinary paths, adding a leading slash if missing', () => {
    expect(sanitizeDavPath('/Documents/report.pdf')).toBe('/Documents/report.pdf')
    expect(sanitizeDavPath('Documents/report.pdf')).toBe('/Documents/report.pdf')
  })

  it('strips a trailing slash, except for root', () => {
    expect(sanitizeDavPath('/Documents/')).toBe('/Documents')
    expect(sanitizeDavPath('/')).toBe('/')
  })

  it('collapses harmless "." and double-slash noise', () => {
    expect(sanitizeDavPath('/Documents/./report.pdf')).toBe('/Documents/report.pdf')
    expect(sanitizeDavPath('//Documents//report.pdf')).toBe('/Documents/report.pdf')
  })

  it('neutralizes simple upward traversal rather than escaping root', () => {
    // Whether this throws or silently clamps to root is fine — what matters
    // is the result never points outside the root, checked explicitly below.
    for (const attempt of ['..', '../', '../secret', '../../secret', '/../secret']) {
      let result: string | undefined
      let threw = false
      try {
        result = sanitizeDavPath(attempt)
      } catch (err) {
        threw = true
        expect(err).toBeInstanceOf(InvalidPathError)
      }
      if (!threw) {
        expect(result!.startsWith('/')).toBe(true)
        expect(result).not.toContain('..')
      }
    }
  })

  it('fully collapses traversal buried mid-path down to a still-rooted result', () => {
    // Whatever this normalizes to, it can never climb above the anchor "/" —
    // path.posix.normalize() mathematically cannot produce that. The
    // WebDAV client's own base URL already has this user's root baked in
    // (…/files/<uuid>), so a normalized "/etc/passwd" here means a file
    // INSIDE that user's own space, never the real server filesystem.
    const result = sanitizeDavPath('/Documents/../../../etc/passwd')
    expect(result).toBe('/etc/passwd')
    expect(result).not.toContain('..')
  })

  it('rejects null bytes', () => {
    expect(() => sanitizeDavPath('/Documents/report.pdf\0.exe')).toThrow(InvalidPathError)
  })

  it('rejects absurdly long paths', () => {
    expect(() => sanitizeDavPath('/' + 'a'.repeat(2000))).toThrow(InvalidPathError)
  })

  it('rejects non-string input', () => {
    // @ts-expect-error deliberately wrong type, exercising the runtime guard
    expect(() => sanitizeDavPath(123)).toThrow(InvalidPathError)
  })
})
