import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Loader2, X } from 'lucide-react'
import { FileEntry, filesApi } from '@/api/files'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

interface PreviewModalProps { entry: FileEntry | null; onClose: () => void }

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'sh', 'bash', 'yml', 'yaml', 'ini',
  'log', 'sql', 'env', 'toml', 'svg', 'rtf',
])

function ext(name: string) { return name.split('.').pop()?.toLowerCase() ?? '' }
function kind(entry: FileEntry): 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported' {
  const e = ext(entry.name), m = (entry.mimeType ?? '').toLowerCase()
  if (m.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp','avif'].includes(e)) return 'image'
  if (m === 'application/pdf' || e === 'pdf') return 'pdf'
  if (m.startsWith('video/') || ['mp4','webm','mov','m4v','ogg'].includes(e)) return 'video'
  if (m.startsWith('audio/') || ['mp3','wav','ogg','oga','m4a','flac'].includes(e)) return 'audio'
  if (TEXT_EXTENSIONS.has(e) || m.startsWith('text/') || m.includes('json') || m.includes('xml') || m.includes('javascript')) return 'text'
  return 'unsupported'
}

export function PreviewModal({ entry, onClose }: PreviewModalProps) {
  const { showToast } = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const type = useMemo(() => entry ? kind(entry) : 'unsupported', [entry])

  useEffect(() => {
    if (!entry) return
    let alive = true
    let objectUrl: string | null = null
    setLoading(true); setError(null); setUrl(null); setText(null)
    filesApi.preview(entry.path).then(async (blob) => {
      if (!alive) return
      if (type === 'text') setText(await blob.text())
      else { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch((err) => { if (alive) setError(getErrorMessage(err, 'Could not load the preview.')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [entry, type])

  if (!entry) return null
  const download = async () => {
    try { await filesApi.download(entry.path, entry.name) }
    catch (err) { showToast(getErrorMessage(err, 'Download failed.'), 'error') }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Preview ${entry.name}`} onClick={(e) => e.stopPropagation()}
        className="flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-surface-0 shadow-soft dark:bg-dark-surface">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 dark:border-dark-border">
          <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-brand-500" /><p className="truncate text-sm font-semibold text-ink-900 dark:text-white" title={entry.name}>{entry.name}</p></div>
          <div className="flex items-center gap-1"><Button variant="secondary" size="sm" onClick={download}><Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span></Button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-400 hover:bg-surface-100 hover:text-ink-800 dark:hover:bg-dark-surface2 dark:hover:text-white" aria-label="Close preview"><X className="h-5 w-5" /></button></div>
        </div>
        <div className="min-h-0 flex-1 bg-surface-50 dark:bg-dark-surface2">
          {loading && <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-400"><Loader2 className="h-5 w-5 animate-spin" />Loading preview…</div>}
          {!loading && error && <div className="flex h-full items-center justify-center p-6 text-center text-sm text-danger">{error}</div>}
          {!loading && !error && type === 'image' && url && <div className="flex h-full items-center justify-center overflow-auto p-4 sm:p-8"><img src={url} alt={entry.name} className="max-h-full max-w-full object-contain" /></div>}
          {!loading && !error && type === 'pdf' && url && <iframe src={url} title={entry.name} className="h-full w-full border-0" />}
          {!loading && !error && type === 'video' && url && <div className="flex h-full items-center justify-center p-4"><video src={url} controls className="max-h-full max-w-full" /></div>}
          {!loading && !error && type === 'audio' && url && <div className="flex h-full items-center justify-center p-6"><audio src={url} controls className="w-full max-w-xl" /></div>}
          {!loading && !error && type === 'text' && text !== null && <pre className="h-full overflow-auto p-5 text-left font-mono text-sm leading-6 text-ink-800 dark:text-ink-200"><code>{text}</code></pre>}
          {!loading && !error && type === 'unsupported' && <div className="flex h-full flex-col items-center justify-center p-6 text-center"><FileText className="h-10 w-10 text-ink-300" /><p className="mt-3 font-medium text-ink-800 dark:text-white">Preview isn't available for this file type</p><p className="mt-1 max-w-md text-sm text-ink-400">Download the file to open it with the appropriate application.</p><Button className="mt-5" onClick={download}><Download className="h-4 w-4" />Download</Button></div>}
        </div>
      </div>
    </div>, document.body
  )
}
