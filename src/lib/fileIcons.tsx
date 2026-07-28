import { FileText, Image, FileSpreadsheet, Video, Music, Archive, Code2, File as FileIcon } from 'lucide-react'

// Real backend gives us a MIME type (or none, for folders) rather than the
// hand-picked FileKind enum the dummy data used — this maps mime/extension
// to the same visual treatment so file icons/colors are unchanged.
export type FileKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'video' | 'audio' | 'zip' | 'code' | 'other'

export const fileKindMeta: Record<FileKind, { icon: typeof FileIcon; bg: string; fg: string }> = {
  pdf: { icon: FileText, bg: 'bg-red-50 dark:bg-red-900/20', fg: 'text-danger' },
  image: { icon: Image, bg: 'bg-violet-50 dark:bg-violet-900/20', fg: 'text-violet-600' },
  doc: { icon: FileText, bg: 'bg-blue-50 dark:bg-blue-900/20', fg: 'text-brand-600' },
  sheet: { icon: FileSpreadsheet, bg: 'bg-green-50 dark:bg-green-900/20', fg: 'text-success' },
  video: { icon: Video, bg: 'bg-pink-50 dark:bg-pink-900/20', fg: 'text-pink-600' },
  audio: { icon: Music, bg: 'bg-orange-50 dark:bg-orange-900/20', fg: 'text-orange-600' },
  zip: { icon: Archive, bg: 'bg-amber-50 dark:bg-amber-900/20', fg: 'text-warning' },
  code: { icon: Code2, bg: 'bg-slate-100 dark:bg-slate-800/40', fg: 'text-ink-700 dark:text-ink-300' },
  other: { icon: FileIcon, bg: 'bg-surface-100 dark:bg-dark-surface2', fg: 'text-ink-500' },
}

const EXT_MAP: Record<string, FileKind> = {
  pdf: 'pdf',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
  doc: 'doc', docx: 'doc', txt: 'doc', rtf: 'doc',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio', m4a: 'audio',
  zip: 'zip', rar: 'zip', tar: 'zip', gz: 'zip', '7z': 'zip',
  ts: 'code', tsx: 'code', js: 'code', jsx: 'code', json: 'code', py: 'code', go: 'code', rs: 'code', java: 'code', css: 'code', html: 'code',
}

export function kindFromName(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MAP[ext] ?? 'other'
}
