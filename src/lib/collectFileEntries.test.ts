import { describe, it, expect } from 'vitest'
import { collectFromDataTransfer, collectFromFileList, topLevelName, isFromFolder } from './collectFileEntries'

function makeFile(name: string, content = 'x'): File {
  return new File([content], name)
}

describe('topLevelName / isFromFolder', () => {
  it('a flat file has itself as the top-level name and is not "from a folder"', () => {
    expect(topLevelName('photo.png')).toBe('photo.png')
    expect(isFromFolder('photo.png')).toBe(false)
  })
  it('a nested path reports its top folder and is "from a folder"', () => {
    expect(topLevelName('Trip/Day 1/photo.png')).toBe('Trip')
    expect(isFromFolder('Trip/Day 1/photo.png')).toBe(true)
  })
})

describe('collectFromFileList', () => {
  it('uses the plain file name when there is no webkitRelativePath', () => {
    const file = makeFile('photo.png')
    const list = { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) } as unknown as FileList
    const result = collectFromFileList(list)
    expect(result).toEqual([{ file, relativePath: 'photo.png' }])
  })

  it('uses webkitRelativePath when present (folder-picker input)', () => {
    const file = makeFile('photo.png') as File & { webkitRelativePath?: string }
    Object.defineProperty(file, 'webkitRelativePath', { value: 'Trip/Day 1/photo.png' })
    const list = { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) } as unknown as FileList
    const result = collectFromFileList(list)
    expect(result).toEqual([{ file, relativePath: 'Trip/Day 1/photo.png' }])
  })
})

// Minimal fakes for the non-standard FileSystemEntry drag-and-drop API.
function fakeFileEntry(name: string, fullPath: string, file: File) {
  return {
    isFile: true,
    isDirectory: false,
    name,
    fullPath,
    file: (success: (f: File) => void) => success(file),
  }
}
function fakeDirEntry(name: string, fullPath: string, children: unknown[]) {
  let read = false
  return {
    isFile: false,
    isDirectory: true,
    name,
    fullPath,
    createReader: () => ({
      readEntries: (success: (entries: unknown[]) => void) => {
        // Real browsers return everything then an empty array on the next
        // call — mimic that so the "keep calling until empty" loop in the
        // implementation is actually exercised.
        if (read) {
          success([])
        } else {
          read = true
          success(children)
        }
      },
    }),
  }
}

function fakeDataTransfer(entries: unknown[]) {
  return {
    items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    files: [],
  } as unknown as DataTransfer
}

describe('collectFromDataTransfer', () => {
  it('passes a single dropped file through unchanged', async () => {
    const file = makeFile('photo.png')
    const dt = fakeDataTransfer([fakeFileEntry('photo.png', '/photo.png', file)])
    const result = await collectFromDataTransfer(dt)
    expect(result).toEqual([{ file, relativePath: 'photo.png' }])
  })

  it('recursively walks a dropped folder, building relative paths', async () => {
    const a = makeFile('a.png')
    const b = makeFile('b.png')
    const dt = fakeDataTransfer([
      fakeDirEntry('Trip', '/Trip', [
        fakeFileEntry('a.png', '/Trip/a.png', a),
        fakeDirEntry('Day 1', '/Trip/Day 1', [fakeFileEntry('b.png', '/Trip/Day 1/b.png', b)]),
      ]),
    ])
    const result = await collectFromDataTransfer(dt)
    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        { file: a, relativePath: 'Trip/a.png' },
        { file: b, relativePath: 'Trip/Day 1/b.png' },
      ])
    )
  })

  it('falls back to the plain file list when webkitGetAsEntry is unavailable', async () => {
    const file = makeFile('photo.png')
    const dt = { items: [{}], files: [file] } as unknown as DataTransfer
    const result = await collectFromDataTransfer(dt)
    expect(result).toEqual([{ file, relativePath: 'photo.png' }])
  })
})
