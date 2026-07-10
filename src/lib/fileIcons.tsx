import {
  FileText,
  Image,
  FileSpreadsheet,
  Video,
  Music,
  Archive,
  Code2,
  File as FileIcon,
} from 'lucide-react'
import { FileKind } from '@/data/dummyData'

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
