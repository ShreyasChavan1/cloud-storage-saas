import { describe, it, expect } from 'vitest'
import { joinPath, dirname, basename, splitExt, uniqueName, isRetryableStatus } from './UploadQueueContext'

describe('joinPath', () => {
  it('joins a segment onto root when base is undefined', () => {
    expect(joinPath(undefined, 'Trip')).toBe('/Trip')
  })
  it('joins a segment onto root when base is "/"', () => {
    expect(joinPath('/', 'Trip')).toBe('/Trip')
  })
  it('joins a segment onto a nested base', () => {
    expect(joinPath('/Trip', 'Day 1')).toBe('/Trip/Day 1')
  })
})

describe('dirname', () => {
  it('returns undefined for a top-level path', () => {
    expect(dirname('/Trip')).toBeUndefined()
  })
  it('returns the parent for a nested path', () => {
    expect(dirname('/Trip/Day 1')).toBe('/Trip')
  })
  it('returns undefined for a bare name with no slash', () => {
    expect(dirname('Trip')).toBeUndefined()
  })
})

describe('basename', () => {
  it('returns the last path segment', () => {
    expect(basename('/Trip/Day 1')).toBe('Day 1')
  })
  it('returns the whole string when there is no slash', () => {
    expect(basename('Trip')).toBe('Trip')
  })
})

describe('splitExt', () => {
  it('splits a normal filename', () => {
    expect(splitExt('photo.png')).toEqual(['photo', '.png'])
  })
  it('treats a leading dot (dotfile) as having no extension', () => {
    expect(splitExt('.gitignore')).toEqual(['.gitignore', ''])
  })
  it('handles a filename with no extension', () => {
    expect(splitExt('README')).toEqual(['README', ''])
  })
  it('uses the last dot for a multi-dot filename', () => {
    expect(splitExt('archive.tar.gz')).toEqual(['archive.tar', '.gz'])
  })
})

describe('uniqueName', () => {
  it('returns the original name if nothing collides', () => {
    expect(uniqueName('photo.png', new Set())).toBe('photo.png')
  })
  it('appends " (1)" before the extension on a first collision', () => {
    expect(uniqueName('photo.png', new Set(['photo.png']))).toBe('photo (1).png')
  })
  it('keeps incrementing until it finds a free name', () => {
    const taken = new Set(['photo.png', 'photo (1).png', 'photo (2).png'])
    expect(uniqueName('photo.png', taken)).toBe('photo (3).png')
  })
  it('works for extensionless names too', () => {
    expect(uniqueName('Trip', new Set(['Trip']))).toBe('Trip (1)')
  })
})

describe('isRetryableStatus', () => {
  it('treats 409 (conflict) as not retryable', () => {
    expect(isRetryableStatus(409)).toBe(false)
  })
  it('treats 400 (bad request) as not retryable', () => {
    expect(isRetryableStatus(400)).toBe(false)
  })
  it('treats a 5xx as retryable', () => {
    expect(isRetryableStatus(503)).toBe(true)
  })
  it('treats an unknown/network error (no status) as retryable', () => {
    expect(isRetryableStatus(undefined)).toBe(true)
  })
})
