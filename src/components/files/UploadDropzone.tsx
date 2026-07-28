import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { UploadCloud, FileUp } from 'lucide-react'
import { cn } from '@/lib/cn'

interface UploadDropzoneProps {
  compact?: boolean
  onFilesSelected: (files: File[]) => void
}

export function UploadDropzone({ compact, onFilesSelected }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFilesSelected(files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFilesSelected(files)
    e.target.value = '' // allow re-selecting the same file later
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors',
        compact ? 'py-8' : 'py-14',
        dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : 'border-line bg-surface-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-dark-border dark:bg-dark-surface2 dark:hover:border-brand-700'
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleInputChange} />
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
        {dragging ? 'Drop to upload' : 'Drag & drop files here'}
      </p>
      {!compact && <p className="text-sm text-ink-400">or click to browse from your device</p>}
    </div>
  )
}
