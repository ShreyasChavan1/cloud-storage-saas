export const currentUser = {
  name: 'Asha Kapoor',
  email: 'asha@example.com',
  avatarInitials: 'AK',
  plan: 'Pro',
}

export const storage = {
  usedGB: 12,
  totalGB: 100,
}

export type FileKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'video' | 'audio' | 'zip' | 'code' | 'other'

export interface FileItem {
  id: string
  type: 'file'
  name: string
  kind: FileKind
  size: string
  modified: string
  favorite: boolean
  shared: boolean
  color?: string
}

export interface FolderItem {
  id: string
  type: 'folder'
  name: string
  itemCount: number
  size: string
  modified: string
  favorite: boolean
  color?: string
}

export type Entry = FileItem | FolderItem

export const folders: FolderItem[] = [
  { id: 'f1', type: 'folder', name: 'Product Launch', itemCount: 24, size: '1.2 GB', modified: 'Jul 3', favorite: true, color: 'bg-brand-500' },
  { id: 'f2', type: 'folder', name: 'Client Contracts', itemCount: 12, size: '340 MB', modified: 'Jun 29', favorite: false, color: 'bg-warning' },
  { id: 'f3', type: 'folder', name: 'Design Assets', itemCount: 87, size: '3.4 GB', modified: 'Jul 5', favorite: true, color: 'bg-success' },
  { id: 'f4', type: 'folder', name: 'Team Photos', itemCount: 56, size: '2.1 GB', modified: 'Jun 18', favorite: false, color: 'bg-danger' },
]

export const files: FileItem[] = [
  { id: 'e1', type: 'file', name: 'Q3 Roadmap.pdf', kind: 'pdf', size: '2.4 MB', modified: 'Jul 6', favorite: true, shared: true },
  { id: 'e2', type: 'file', name: 'Brand Guidelines.pdf', kind: 'pdf', size: '8.1 MB', modified: 'Jul 5', favorite: false, shared: false },
  { id: 'e3', type: 'file', name: 'hero-shot-final.png', kind: 'image', size: '5.6 MB', modified: 'Jul 5', favorite: false, shared: true },
  { id: 'e4', type: 'file', name: 'Revenue Model.xlsx', kind: 'sheet', size: '1.1 MB', modified: 'Jul 4', favorite: false, shared: false },
  { id: 'e5', type: 'file', name: 'Onboarding Script.docx', kind: 'doc', size: '640 KB', modified: 'Jul 3', favorite: false, shared: false },
  { id: 'e6', type: 'file', name: 'Demo Walkthrough.mp4', kind: 'video', size: '184 MB', modified: 'Jul 2', favorite: true, shared: true },
  { id: 'e7', type: 'file', name: 'podcast-ep-04.mp3', kind: 'audio', size: '42 MB', modified: 'Jun 30', favorite: false, shared: false },
  { id: 'e8', type: 'file', name: 'archive-2024.zip', kind: 'zip', size: '312 MB', modified: 'Jun 28', favorite: false, shared: false },
  { id: 'e9', type: 'file', name: 'api-client.ts', kind: 'code', size: '18 KB', modified: 'Jun 27', favorite: false, shared: false },
  { id: 'e10', type: 'file', name: 'Investor Update.pdf', kind: 'pdf', size: '3.2 MB', modified: 'Jun 25', favorite: false, shared: true },
]

export const allEntries: Entry[] = [...folders, ...files]

export const recentFiles: FileItem[] = files.slice(0, 5)

export interface ActivityItem {
  id: string
  actor: string
  action: string
  target: string
  time: string
  kind: 'upload' | 'share' | 'delete' | 'edit' | 'comment'
}

export const recentActivity: ActivityItem[] = [
  { id: 'a1', actor: 'You', action: 'uploaded', target: 'Demo Walkthrough.mp4', time: '2h ago', kind: 'upload' },
  { id: 'a2', actor: 'Rohan Mehta', action: 'shared', target: 'Brand Guidelines.pdf', time: '5h ago', kind: 'share' },
  { id: 'a3', actor: 'You', action: 'moved', target: 'Revenue Model.xlsx', time: '1d ago', kind: 'edit' },
  { id: 'a4', actor: 'Priya Nair', action: 'commented on', target: 'Q3 Roadmap.pdf', time: '1d ago', kind: 'comment' },
  { id: 'a5', actor: 'You', action: 'deleted', target: 'old-logo-draft.ai', time: '2d ago', kind: 'delete' },
]

export interface PricingPlan {
  id: string
  name: string
  price: number
  cadence: 'mo'
  storageGB: number
  description: string
  features: string[]
  highlighted?: boolean
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    cadence: 'mo',
    storageGB: 5,
    description: 'For getting your files off your desktop.',
    features: ['5 GB storage', '1 device sync', 'Basic sharing links', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    cadence: 'mo',
    storageGB: 100,
    description: 'For individuals who live in their files.',
    features: ['100 GB storage', 'Unlimited devices', 'Password-protected links', 'Version history (30 days)', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 28,
    cadence: 'mo',
    storageGB: 500,
    description: 'For teams sharing one source of truth.',
    features: ['500 GB pooled storage', 'Shared team folders', 'Admin controls', 'Version history (180 days)', 'SSO (coming soon)'],
  },
]
