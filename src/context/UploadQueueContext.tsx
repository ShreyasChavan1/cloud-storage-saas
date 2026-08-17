import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { filesApi, FileEntry } from '@/api/files'
import { filesQueryKey } from '@/hooks/useFiles'
import { CollectedFile, topLevelName, isFromFolder } from '@/lib/collectFileEntries'
import { FileKind, kindFromName } from '@/lib/fileIcons'
import { getErrorMessage } from '@/lib/getErrorMessage'

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'error' | 'canceled'
export type ConflictAction = 'skip' | 'replace' | 'keep-both'

export interface UploadEntry {
  id: string
  kind: 'file'
  // Basename only — used for the file-type icon and for a11y labels.
  name: string
  // What's actually shown to the person: the basename for a flat file,
  // or "SubFolder/photo.png" for something that came from a folder upload,
  // so two files that happen to share a name in different subfolders
  // don't look identical in the queue.
  displayPath: string
  fileKind: FileKind
  status: UploadStatus
  percent: number
  error?: string
  retryable: boolean
  isFolderItem: boolean
  // Set only for files that came from a folder upload — lets the panel
  // group every file from the same dropped/picked folder under one
  // collapsible row with an aggregate progress bar, instead of listing
  // (potentially) hundreds of individual rows. `folderName` is the
  // top-level folder's name (post-rename if "keep both" applied).
  folderGroupId?: string
  folderName?: string
}

export interface ConflictEntry {
  id: string
  kind: 'conflict'
  name: string
  isFolder: boolean
  fileCount: number
}

export type QueueEntry = UploadEntry | ConflictEntry

// How many uploads run at once. High enough that a batch of small files
// moves quickly, low enough not to flood the browser (or Nextcloud) with
// dozens of simultaneous multipart requests.
const MAX_CONCURRENT = 3
// How long a finished (success) item stays visible before it's removed —
// long enough to notice, short enough not to clutter. Errors/cancellations
// stay until the person dismisses or retries them.
const SUCCESS_REMOVE_DELAY_MS = 2500

let nextId = 0
const makeId = () => `up_${nextId++}`

// Path helpers (joinPath/dirname/basename/splitExt/isUnderDir) now live in
// '@/lib/paths' so drag-to-move can share them too — re-exported here so
// existing imports (including this file's own tests) keep working.
export { joinPath, dirname, basename, splitExt, isUnderDir } from '@/lib/paths'
import { joinPath, dirname, basename, splitExt, isUnderDir } from '@/lib/paths'

export function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  const [stem, ext] = splitExt(base)
  let i = 1
  let candidate = `${stem} (${i})${ext}`
  while (taken.has(candidate)) {
    i += 1
    candidate = `${stem} (${i})${ext}`
  }
  return candidate
}

// Not every failure should offer a "Retry" that just fails again the same
// way — a 409 (conflict) or 400 (bad request, e.g. invalid name) needs the
// person to change something first, not just retry. Anything else
// (network blip, timeout, 5xx) is worth a genuine retry.
function isRetryableStatus(status: number | undefined): boolean {
  return status !== 400 && status !== 409
}

interface InternalFileRecord {
  kind: 'file'
  file: File
  targetPath: string | undefined
  // The actual browser File's .name is immutable — when a duplicate is
  // resolved as "keep both", this carries the new name so it's what
  // actually gets sent to the server, not the original colliding one.
  uploadName: string
  controller?: AbortController
}
interface PendingGroup {
  files: CollectedFile[]
  targetDir: string | undefined
  isFolder: boolean
}
interface InternalConflictRecord {
  kind: 'conflict'
  group: PendingGroup
  existingNames: Set<string>
}
type InternalRecord = InternalFileRecord | InternalConflictRecord

interface UploadQueueContextValue {
  entries: QueueEntry[]
  enqueue: (files: CollectedFile[], targetPath: string | undefined) => void
  cancelUpload: (id: string) => void
  retryUpload: (id: string) => void
  dismissUpload: (id: string) => void
  resolveConflict: (id: string, action: ConflictAction) => void
  cancelAll: () => void
  clearFinished: () => void
}

const UploadQueueContext = createContext<UploadQueueContextValue | undefined>(undefined)

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  // Mirrors `entries` so imperative code (the scheduler) can read the
  // latest queue synchronously without ever running a side effect inside
  // a setState updater — React 18 StrictMode double-invokes those on
  // purpose in dev, which would otherwise fire every upload twice.
  const entriesRef = useRef<QueueEntry[]>([])
  const records = useRef<Map<string, InternalRecord>>(new Map())
  const queryClient = useQueryClient()

  // The ref is the actual source of truth for anything that needs a
  // synchronous, always-current read (the scheduler). `setEntries` just
  // mirrors it into React state so the UI re-renders — it must never be
  // used the other way around (updating the ref *from inside* a setState
  // updater), because React doesn't guarantee those run synchronously,
  // which would let the scheduler read stale data right after a mutation.
  const commitEntries = useCallback((next: QueueEntry[]) => {
    entriesRef.current = next
    setEntries(next)
  }, [])

  const invalidateFolder = useCallback(
    (path: string | undefined) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey(path) })
      queryClient.invalidateQueries({ queryKey: ['quota'] })
    },
    [queryClient]
  )

  const patchEntry = useCallback(
    (id: string, patch: Partial<UploadEntry>) => {
      commitEntries(
        entriesRef.current.map((item) => (item.id === id && item.kind === 'file' ? { ...item, ...patch } : item))
      )
    },
    [commitEntries]
  )

  const removeEntry = useCallback(
    (id: string) => {
      commitEntries(entriesRef.current.filter((item) => item.id !== id))
      records.current.delete(id)
    },
    [commitEntries]
  )

  // `startUpload` and `pump` call each other (pump starts uploads; a
  // finished upload triggers pump again to fill its freed slot). Routing
  // that second call through a ref sidesteps the declaration-order/stale-
  // closure problem of two useCallbacks depending on one another directly.
  const pumpRef = useRef<() => void>(() => {})

  const startUpload = useCallback(
    async (id: string) => {
      const record = records.current.get(id)
      if (!record || record.kind !== 'file') return

      const controller = new AbortController()
      record.controller = controller
      patchEntry(id, { status: 'uploading', percent: 0, error: undefined })

      try {
        await filesApi.upload(
          record.targetPath,
          record.file,
          (percent) => patchEntry(id, { percent }),
          controller.signal,
          record.uploadName
        )
        patchEntry(id, { status: 'success', percent: 100 })
        invalidateFolder(record.targetPath)
        setTimeout(() => removeEntry(id), SUCCESS_REMOVE_DELAY_MS)
      } catch (err) {
        if (controller.signal.aborted) {
          patchEntry(id, { status: 'canceled', retryable: true })
        } else {
          const status = err instanceof AxiosError ? err.response?.status : undefined
          patchEntry(id, {
            status: 'error',
            error: getErrorMessage(err, 'Upload failed.'),
            retryable: isRetryableStatus(status),
          })
        }
      } finally {
        pumpRef.current()
      }
    },
    [invalidateFolder, patchEntry, removeEntry]
  )

  // Pure read of the current queue + fire-and-forget side effects to
  // start as many queued items as there are free concurrency slots.
  // Never wrapped in setState — see the entriesRef comment above.
  const pump = useCallback(() => {
    const items = entriesRef.current
    const active = items.filter((i) => i.kind === 'file' && i.status === 'uploading').length
    let slots = MAX_CONCURRENT - active
    if (slots <= 0) return
    for (const item of items) {
      if (slots <= 0) break
      if (item.kind !== 'file' || item.status !== 'queued') continue
      slots -= 1
      void startUpload(item.id)
    }
  }, [startUpload])

  useEffect(() => {
    pumpRef.current = pump
  }, [pump])

  // Turns a resolved (non-conflicting, or already-decided) group of files
  // into real queue entries: creates whatever folder structure the batch
  // needs first, then pushes one queued item per file and kicks the pump.
  const releaseGroup = useCallback(
    async (group: PendingGroup, renameTo?: string) => {
      type Planned = { id: string; record: InternalFileRecord; entry: UploadEntry; dir: string | undefined }
      const planned: Planned[] = []
      const dirsNeeded = new Set<string>()
      // One id shared by every file in this batch, only when it's a real
      // folder upload — a flat file drop has no group to aggregate.
      const folderGroupId = group.isFolder ? makeId() : undefined
      const folderName = group.isFolder ? renameTo ?? topLevelName(group.files[0].relativePath) : undefined

      for (const { file, relativePath } of group.files) {
        const segments = relativePath.split('/')
        if (renameTo) segments[0] = renameTo
        const fileName = segments[segments.length - 1]
        const dirSegments = segments.slice(0, -1)

        let dir = group.targetDir
        for (const seg of dirSegments) {
          dir = joinPath(dir, seg)
          dirsNeeded.add(dir)
        }

        const id = makeId()
        const record: InternalFileRecord = { kind: 'file', file, targetPath: dir, uploadName: fileName }
        const entry: UploadEntry = {
          id,
          kind: 'file',
          name: fileName,
          displayPath: dirSegments.length ? `${dirSegments.join('/')}/${fileName}` : fileName,
          fileKind: kindFromName(fileName),
          status: 'queued',
          percent: 0,
          retryable: true,
          isFolderItem: group.isFolder,
          folderGroupId,
          folderName,
        }
        planned.push({ id, record, entry, dir })
      }

      // Create every implied folder, shallowest first, so a parent always
      // exists before anything tries to create a child inside it. A 409
      // just means the folder already exists — fine, reuse it (this is
      // exactly the "replace" / merge case).
      const orderedDirs = Array.from(dirsNeeded).sort((a, b) => a.split('/').length - b.split('/').length)
      const failedDirs: string[] = []

      for (const dir of orderedDirs) {
        if (failedDirs.some((failed) => isUnderDir(dir, failed))) continue // parent already failed
        try {
          await filesApi.createFolder(dirname(dir), basename(dir))
        } catch (err) {
          if (err instanceof AxiosError && err.response?.status === 409) continue // already exists — fine
          failedDirs.push(dir)
        }
      }

      const succeeded = planned.filter((p) => !failedDirs.some((failed) => p.dir !== undefined && isUnderDir(p.dir, failed)))
      const failed = planned.filter((p) => !succeeded.includes(p))

      for (const p of succeeded) records.current.set(p.id, p.record)

      if (failed.length > 0) {
        const message = 'Could not create the destination folder.'
        commitEntries([
          ...entriesRef.current,
          ...failed.map((p) => ({ ...p.entry, status: 'error' as const, error: message })),
        ])
      }
      if (succeeded.length > 0) {
        commitEntries([...entriesRef.current, ...succeeded.map((p) => p.entry)])
        invalidateFolder(group.targetDir)
        pump()
      }
    },
    [commitEntries, invalidateFolder, pump]
  )

  const applyConflict = useCallback(
    (id: string, name: string, isFolder: boolean, fileCount: number) => {
      commitEntries([...entriesRef.current, { id, kind: 'conflict', name, isFolder, fileCount }])
    },
    [commitEntries]
  )

  const enqueue = useCallback(
    async (files: CollectedFile[], targetPath: string | undefined) => {
      if (files.length === 0) return

      // Group by top-level name: every file under "Trip/..." shares one
      // conflict decision (does "Trip" already exist here?); a flat file
      // gets its own.
      const groups = new Map<string, CollectedFile[]>()
      for (const item of files) {
        const key = topLevelName(item.relativePath)
        const list = groups.get(key)
        if (list) list.push(item)
        else groups.set(key, [item])
      }

      // One listing fetch for the whole batch's destination folder — cheap,
      // and reused across every group's conflict check. Falls back to "no
      // known conflicts" if the listing can't be read, rather than
      // blocking the upload entirely on it.
      let existingNames = new Set<string>()
      try {
        const cached = queryClient.getQueryData<FileEntry[]>(filesQueryKey(targetPath))
        const list = cached ?? (await filesApi.list(targetPath))
        existingNames = new Set(list.map((e) => e.name))
        if (!cached) queryClient.setQueryData(filesQueryKey(targetPath), list)
      } catch {
        // proceed without duplicate detection for this batch
      }

      for (const [name, groupFiles] of groups) {
        const isFolder = isFromFolder(groupFiles[0].relativePath)
        const group: PendingGroup = { files: groupFiles, targetDir: targetPath, isFolder }

        if (existingNames.has(name)) {
          const id = makeId()
          records.current.set(id, { kind: 'conflict', group, existingNames })
          applyConflict(id, name, isFolder, groupFiles.length)
        } else {
          void releaseGroup(group)
        }
      }
    },
    [applyConflict, queryClient, releaseGroup]
  )

  const resolveConflict = useCallback(
    (id: string, action: ConflictAction) => {
      const record = records.current.get(id)
      if (!record || record.kind !== 'conflict') return
      removeEntry(id)

      if (action === 'skip') return
      if (action === 'replace') {
        void releaseGroup(record.group)
        return
      }
      // keep-both: rename the top-level name to the first free variant,
      // then proceed exactly like a non-conflicting batch.
      const originalTop = topLevelName(record.group.files[0].relativePath)
      const renamed = uniqueName(originalTop, record.existingNames)
      void releaseGroup(record.group, renamed)
    },
    [releaseGroup, removeEntry]
  )

  const cancelUpload = useCallback(
    (id: string) => {
      const record = records.current.get(id)
      if (!record) return
      if (record.kind === 'conflict') {
        removeEntry(id)
        return
      }
      if (record.controller) {
        record.controller.abort()
      } else {
        // Never started (still queued) — nothing to abort, just mark it.
        patchEntry(id, { status: 'canceled' })
        pump()
      }
    },
    [patchEntry, pump, removeEntry]
  )

  const retryUpload = useCallback(
    (id: string) => {
      const record = records.current.get(id)
      if (!record || record.kind !== 'file') return
      record.controller = undefined
      patchEntry(id, { status: 'queued', percent: 0, error: undefined })
      pump()
    },
    [patchEntry, pump]
  )

  const dismissUpload = useCallback((id: string) => removeEntry(id), [removeEntry])

  const cancelAll = useCallback(() => {
    for (const [id, record] of records.current) {
      if (record.kind === 'file') cancelUpload(id)
    }
  }, [cancelUpload])

  const clearFinished = useCallback(() => {
    const isFinished = (item: QueueEntry) =>
      item.kind === 'file' && (item.status === 'success' || item.status === 'canceled' || item.status === 'error')
    for (const item of entriesRef.current) {
      if (isFinished(item)) records.current.delete(item.id)
    }
    commitEntries(entriesRef.current.filter((item) => !isFinished(item)))
  }, [commitEntries])

  return (
    <UploadQueueContext.Provider
      value={{ entries, enqueue, cancelUpload, retryUpload, dismissUpload, resolveConflict, cancelAll, clearFinished }}
    >
      {children}
    </UploadQueueContext.Provider>
  )
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider')
  return ctx
}

export { isRetryableStatus }
