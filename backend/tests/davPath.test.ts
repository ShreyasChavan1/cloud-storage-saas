import { sanitizeDavPath, InvalidPathError, assertSafeFileName, isSafeSegmentId } from '../src/utils/davPath'

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

  it('rejects ".." segments instead of silently resolving them', () => {
    for (const attempt of ['/Documents/../../../etc/passwd', '/a/../b', '..', '../x', 'x/..']) {
      expect(() => sanitizeDavPath(attempt)).toThrow(InvalidPathError)
    }
  })

  it('rejects backslashes and control characters', () => {
    for (const attempt of ['..\\secret', '/a\\b', '/a\r\nb', '/a\x07b']) {
      expect(() => sanitizeDavPath(attempt)).toThrow(InvalidPathError)
    }
  })

  it('treats percent-encoded traversal as literal text, never decoding it', () => {
    // %2e%2e is just characters in one segment; it is re-encoded on the way
    // out (to %252e%252e), so it cannot become "..".
    expect(sanitizeDavPath('/%2e%2e/%2e%2e/secret')).toBe('/%2e%2e/%2e%2e/secret')
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

describe('assertSafeFileName', () => {
  it('accepts ordinary names', () => {
    expect(assertSafeFileName('report (final).pdf')).toBe('report (final).pdf')
  })
  it('rejects anything that is not a single plain segment', () => {
    for (const bad of ['..', '.', '../x', 'a/b', 'a\\b', '', 'x\0y', 'a'.repeat(256), 5 as unknown as string]) {
      expect(() => assertSafeFileName(bad)).toThrow(InvalidPathError)
    }
  })
})

describe('isSafeSegmentId', () => {
  it('allows Nextcloud-style trash ids (spaces, unicode, dots)', () => {
    expect(isSafeSegmentId('my report.pdf.d1699999999')).toBe(true)
    expect(isSafeSegmentId('résumé.docx.d1699999999')).toBe(true)
  })
  it('rejects ids that could re-point the URL', () => {
    for (const bad of ['', '.', '..', 'a/b', '../x', 'a\\b']) expect(isSafeSegmentId(bad)).toBe(false)
  })
})
