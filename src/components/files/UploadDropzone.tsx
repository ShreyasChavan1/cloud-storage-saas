import { useRef, useState } from 'react'
import { UploadCloud, FileUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export function UploadDropzone({ compact }: { compact?: boolean }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        // Phase 1 is UI-only — dropped files are not uploaded anywhere yet.
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors',
        compact ? 'py-8' : 'py-14',
        dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : 'border-line bg-surface-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-dark-border dark:bg-dark-surface2 dark:hover:border-brand-700'
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" />
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
