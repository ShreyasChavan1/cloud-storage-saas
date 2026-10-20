import { useRef, useState, DragEvent, ChangeEvent, InputHTMLAttributes } from 'react'
import { UploadCloud, FileUp, FolderUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { collectFromDataTransfer, collectFromFileList, CollectedFile } from '@/lib/collectFileEntries'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { useUploadStatus } from '@/hooks/useUploadStatus'

// webkitdirectory/directory aren't in React's InputHTMLAttributes typings
// (they're a long-standing non-standard extension every major browser
// still supports) — extend locally rather than reaching for `any`.
type DirectoryInputProps = InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string
  directory?: string
}

interface UploadDropzoneProps {
  compact?: boolean
  onItemsSelected: (items: CollectedFile[]) => void
}

export function UploadDropzone({ compact, onItemsSelected }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [processingDrop, setProcessingDrop] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  // When the account can't add data (storage full / payment overdue past the
  // grace window) the controls stay visible but inactive, with the reason.
  const { data: uploadStatus } = useUploadStatus()
  const blocked = uploadStatus?.canUpload === false
  const blockedHint =
    uploadStatus?.reason === 'PAST_DUE' ? 'Renew your plan to upload again.' : 'Delete files or upgrade your plan to upload again.'
  const warnBlocked = () => showToast(uploadStatus?.message ?? 'Uploads are paused for this account.', 'error')

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (blocked) return warnBlocked()
    if (!e.dataTransfer) return
    setProcessingDrop(true)
    try {
      const items = await collectFromDataTransfer(e.dataTransfer)
      if (items.length === 0) {
        showToast("Couldn't read anything from that drop — try the folder picker instead.", 'error')
        return
      }
      onItemsSelected(items)
    } catch (err) {
      // Previously this had no catch at all — a traversal failure (a
      // permission quirk, an unreadable entry, etc.) would silently
      // vanish as an unhandled promise rejection with zero feedback,
      // which looked exactly like "nothing happens" on drop.
      console.error('Failed to read dropped files/folders:', err)
      showToast(getErrorMessage(err, "Couldn't read the dropped files/folders."), 'error')
    } finally {
      setProcessingDrop(false)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (blocked) {
      e.target.value = ''
      return warnBlocked()
    }
    const items = collectFromFileList(e.target.files ?? ({} as FileList))
    if (items.length) onItemsSelected(items)
    e.target.value = '' // allow re-selecting the same file(s)/folder later
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors',
        blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        compact ? 'py-8' : 'py-14',
        blocked
          ? 'border-line bg-surface-50 dark:border-dark-border dark:bg-dark-surface2'
          : dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : 'border-line bg-surface-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-dark-border dark:bg-dark-surface2 dark:hover:border-brand-700'
      )}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        // Selects an entire folder's contents — supported in every current
        // major browser despite never being formally standardized.
        {...({ webkitdirectory: '', directory: '' } as DirectoryInputProps)}
      />

      <div
        onClick={() => (blocked ? warnBlocked() : fileInputRef.current?.click())}
        className="flex flex-col items-center gap-2"
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full transition-colors',
            compact ? 'h-10 w-10' : 'h-14 w-14',
            dragging ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/40'
          )}
        >
          {dragging ? <FileUp className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
        </div>
        <p className={cn('font-medium text-ink-900 dark:text-white', compact ? 'text-sm' : 'text-base')}>
          {processingDrop ? 'Reading dropped items…' : blocked ? 'Uploads are paused' : dragging ? 'Drop to upload' : 'Drag & drop files or folders here'}
        </p>
        {blocked ? (
          <p className="px-4 text-center text-sm text-ink-400">{blockedHint}</p>
        ) : (
          !compact && <p className="text-sm text-ink-400">or click to browse from your device</p>
        )}
      </div>

      <button
        type="button"
        disabled={blocked}
        onClick={(e) => {
          e.stopPropagation()
          folderInputRef.current?.click()
        }}
        className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-brand-400 dark:hover:bg-brand-900/20"
      >
        <FolderUp className="h-3.5 w-3.5" />
        Upload a folder instead
      </button>
    </div>
  )
}
