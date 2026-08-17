// Normalizes the two different browser APIs that can hand us files —
// drag-and-drop (DataTransfer, which can contain whole folders) and a
// plain <input type="file">, including the webkitdirectory variant — into
// one flat shape the upload queue can work with regardless of source.
export interface CollectedFile {
  file: File
  // Path relative to whatever the user dropped/selected. A plain file
  // picked with no folder is just its name ("photo.png"). A file that
  // came from a folder keeps the folder in front ("Trip/Day 1/photo.png")
  // so the queue can recreate that structure on the server.
  relativePath: string
}

// Minimal typing for the non-standard (but universally supported in
// Chromium/Firefox/Safari) File System Access entries used for drag-and-drop
// folder traversal. Not in lib.dom.d.ts, so declared locally.
interface FileSystemEntryLike {
  isFile: boolean
  isDirectory: boolean
  name: string
  fullPath: string
}
interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file(success: (file: File) => void, error?: (err: unknown) => void): void
}
interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader(): FileSystemDirectoryReaderLike
}
interface FileSystemDirectoryReaderLike {
  readEntries(success: (entries: FileSystemEntryLike[]) => void, error?: (err: unknown) => void): void
}

function isDirectoryEntry(entry: FileSystemEntryLike): entry is FileSystemDirectoryEntryLike {
  return entry.isDirectory
}
function isFileEntry(entry: FileSystemEntryLike): entry is FileSystemFileEntryLike {
  return entry.isFile
}

function readAllEntries(reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntryLike[] = []
    // Chromium only returns up to 100 entries per readEntries() call —
    // must keep calling until it returns an empty array.
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all)
          return
        }
        all.push(...batch)
        readBatch()
      }, reject)
    }
    readBatch()
  })
}

function readFile(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function walkEntry(entry: FileSystemEntryLike, out: CollectedFile[]): Promise<void> {
  if (isFileEntry(entry)) {
    const file = await readFile(entry)
    // fullPath is always "/"-prefixed ("/Trip/Day 1/photo.png") — strip
    // the leading slash so it matches the plain-file case's shape.
    out.push({ file, relativePath: entry.fullPath.replace(/^\/+/, '') })
    return
  }
  if (isDirectoryEntry(entry)) {
    const reader = entry.createReader()
    const children = await readAllEntries(reader)
    for (const child of children) {
      await walkEntry(child, out)
    }
  }
}

// Handles a drop event's DataTransfer — walks any dropped folders
// recursively, and passes plain files through as-is.
export async function collectFromDataTransfer(dataTransfer: DataTransfer): Promise<CollectedFile[]> {
  const items = dataTransfer.items
  const out: CollectedFile[] = []

  // `items`/webkitGetAsEntry isn't available in every environment (or in
  // tests) — fall back to the plain file list, which loses folder
  // structure but still uploads the files themselves.
  if (!items || typeof items[0]?.webkitGetAsEntry !== 'function') {
    return Array.from(dataTransfer.files).map((file) => ({ file, relativePath: file.name }))
  }

  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry?.() as FileSystemEntryLike | null)
    .filter((entry): entry is FileSystemEntryLike => entry !== null)

  for (const entry of entries) {
    await walkEntry(entry, out)
  }
  return out
}

// Handles a plain <input type="file"> FileList, including the
// webkitdirectory variant where each File carries a non-standard
// `webkitRelativePath` property Chromium/Firefox/Safari all populate.
export function collectFromFileList(fileList: FileList): CollectedFile[] {
  return Array.from(fileList).map((file) => {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    return { file, relativePath: relative && relative.length > 0 ? relative : file.name }
  })
}

// The top-level name a batch of collected files should be grouped/checked
// under for duplicate detection — the folder name for anything that came
// from a folder, or the file's own name for a flat file.
export function topLevelName(relativePath: string): string {
  return relativePath.split('/')[0]
}

export function isFromFolder(relativePath: string): boolean {
  return relativePath.includes('/')
}
