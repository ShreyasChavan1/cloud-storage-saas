// Field definitions for the public "Client Requirement & Discovery Form",
// transcribed from DVT_Client_Requirement_Discovery_Form_Final.pdf.
//
// Sections 1-6 are what the client fills in. Section 7 ("DVT Internal
// Assessment") is NOT here on purpose — it's staff-only and lives in the
// admin panel (see AdminClientFormDetail). Section 8 is the confirmation
// step at the bottom of the page.
//
// The same definitions drive the form (pages/ClientRequirementForm.tsx) and
// the admin's read-only view of a submission, so a label only exists once.

export type FieldType = 'text' | 'textarea' | 'single' | 'multi'

export interface FormField {
  /** Key in the submission's `answers` object, e.g. "storage.currentData". */
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  /** For `multi`: picking one of these clears the other options (e.g. "None"). */
  exclusive?: string[]
}

export interface FormGroup {
  title?: string
  fields: FormField[]
}

export interface FormSection {
  id: string
  title: string
  hint?: string
  /** Shown only if at least one of these services is ticked. Omit = always shown. */
  visibleForServices?: string[]
  groups: FormGroup[]
}

// ── Section 1: client details (top-level columns on the submission) ──────────
export interface DetailField {
  key: 'companyName' | 'contactPerson' | 'designation' | 'mobile' | 'email' | 'industry' | 'city' | 'website'
  label: string
  type: 'text' | 'tel' | 'email'
  required?: boolean
  placeholder?: string
}

export const detailFields: DetailField[] = [
  { key: 'companyName', label: 'Company / Client Name', type: 'text', required: true },
  { key: 'contactPerson', label: 'Contact Person', type: 'text', required: true },
  { key: 'designation', label: 'Designation', type: 'text' },
  { key: 'mobile', label: 'Mobile Number', type: 'tel', required: true, placeholder: '+91 98765 43210' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'industry', label: 'Business / Industry', type: 'text' },
  { key: 'city', label: 'City / Location', type: 'text' },
  { key: 'website', label: 'Website (if any)', type: 'text' },
]

// ── Section 2: services required ─────────────────────────────────────────────
export const SERVICES = {
  storage: 'Cloud Storage / Backup',
  recovery: 'Data Recovery / Backup Planning',
  cctv: 'CCTV Cloud Archive',
  web: 'Website / Web Portal',
  mobile: 'Mobile Application',
  social: 'Social Media Management',
  ads: 'Digital Advertising',
  maintenance: 'Website / App Maintenance',
  custom: 'Custom Managed Digital Solution',
  other: 'Other',
} as const

export const serviceOptions: string[] = Object.values(SERVICES)

/** Free-text companion to ticking "Other". Stored in `answers`. */
export const OTHER_SERVICE_KEY = 'services.other'

const yesNoNotSure = ['Yes', 'No', 'Not sure']
const yesNoRecommend = ['Yes', 'No', 'Need recommendation']

export const formSections: FormSection[] = [
  {
    id: 'storage',
    title: '3. Cloud Storage & Backup Requirements',
    hint: 'Complete if storage, backup or data protection is required.',
    visibleForServices: [SERVICES.storage, SERVICES.recovery],
    groups: [
      {
        fields: [
          { key: 'storage.currentData', label: 'Approx. Current Data', type: 'single', options: ['<1 TB', '1-5 TB', '5-10 TB', '10-25 TB', '25+ TB'] },
          { key: 'storage.growth', label: 'Expected Growth', type: 'single', options: ['Low', 'Medium', 'High', 'Not sure'] },
          { key: 'storage.dataSource', label: 'Data Source', type: 'multi', options: ['PC/Laptop', 'Server', 'NAS', 'CCTV/NVR', 'Other'] },
          { key: 'storage.devices', label: 'Devices / Servers', type: 'text' },
          { key: 'storage.frequency', label: 'Backup Frequency', type: 'single', options: ['Daily', 'Multiple/day', 'Weekly', 'Custom', 'Not sure'] },
          { key: 'storage.retention', label: 'Retention', type: 'single', options: ['7 days', '30 days', '90 days', '1 year', 'Custom'] },
          { key: 'storage.internet', label: 'Internet', type: 'single', options: ['Fiber/Broadband', 'Leased line', 'Other'] },
          { key: 'storage.currentBackup', label: 'Current Backup', type: 'multi', options: ['None', 'External HDD', 'NAS', 'Cloud', 'Other'], exclusive: ['None'] },
          { key: 'storage.critical', label: 'Critical Data?', type: 'single', options: ['Yes', 'No', 'Partly'] },
          { key: 'storage.recoveryNeed', label: 'Recovery Need', type: 'single', options: ['Fast', 'Standard', 'Not sure'] },
          { key: 'storage.offsite', label: 'Offsite Copy', type: 'single', options: yesNoRecommend },
          { key: 'storage.immutable', label: 'Immutable Backup', type: 'single', options: yesNoRecommend },
          { key: 'storage.encryption', label: 'Encryption', type: 'single', options: ['Standard', 'Client-side', 'Need recommendation'] },
          { key: 'storage.dataTypes', label: 'Type of data to protect (documents, accounts, media, project files, database, etc.)', type: 'textarea' },
          { key: 'storage.problem', label: 'Current backup problem / data-loss concern', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'cctv',
    title: '4. CCTV Archive Requirements',
    visibleForServices: [SERVICES.cctv],
    groups: [
      {
        fields: [
          { key: 'cctv.cameras', label: 'Number of Cameras', type: 'text' },
          { key: 'cctv.resolution', label: 'Resolution', type: 'single', options: ['1080p', '2K', '4K', 'Mixed / Not sure'] },
          { key: 'cctv.recording', label: 'Recording', type: 'single', options: ['24×7', 'Motion-based', 'Other'] },
          { key: 'cctv.retention', label: 'Retention', type: 'single', options: ['7 days', '15 days', '30 days', '90 days', 'Custom'] },
          { key: 'cctv.nvrStorage', label: 'Current NVR/DVR Storage', type: 'text' },
          { key: 'cctv.remoteAccess', label: 'Remote Access', type: 'single', options: ['Yes', 'No'] },
        ],
      },
    ],
  },
  {
    id: 'digital',
    title: '5. Managed Digital Services',
    hint: 'Complete only the relevant areas.',
    visibleForServices: [SERVICES.web, SERVICES.mobile, SERVICES.social, SERVICES.ads, SERVICES.maintenance],
    groups: [
      {
        title: 'Website / Web Portal',
        fields: [
          { key: 'web.requirement', label: 'Requirement', type: 'multi', options: ['New', 'Redesign', 'Portal', 'Maintenance'] },
          { key: 'web.type', label: 'Website Type', type: 'single', options: ['Portfolio', 'Business', 'E-commerce', 'Portal', 'Custom'] },
          { key: 'web.domain', label: 'Domain', type: 'single', options: ['Available', 'Need assistance'] },
          { key: 'web.hosting', label: 'Hosting', type: 'single', options: ['Available', 'Need assistance'] },
          { key: 'web.adminPanel', label: 'Admin Panel', type: 'single', options: yesNoNotSure },
          { key: 'web.traffic', label: 'Traffic', type: 'single', options: ['Standard', 'High', 'Scalable', 'Not sure'] },
          { key: 'web.features', label: 'Main website features', type: 'textarea' },
        ],
      },
      {
        title: 'Mobile Application',
        fields: [
          { key: 'mobile.platform', label: 'Platform', type: 'single', options: ['Android', 'iOS', 'Both', 'Not sure'] },
          { key: 'mobile.userLogin', label: 'User Login', type: 'single', options: ['Yes', 'No'] },
          { key: 'mobile.adminPanel', label: 'Admin Panel', type: 'single', options: yesNoNotSure },
          { key: 'mobile.payments', label: 'Payments / APIs', type: 'single', options: ['Yes', 'No', 'Discuss'] },
          { key: 'mobile.purpose', label: 'App purpose and key features', type: 'textarea' },
        ],
      },
      {
        title: 'Social Media & Digital Marketing',
        fields: [
          { key: 'social.platforms', label: 'Platforms', type: 'multi', options: ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'Other'] },
          { key: 'social.service', label: 'Service', type: 'multi', options: ['Page handling', 'Content Posting', 'Ads', 'Complete'] },
          { key: 'social.existingPages', label: 'Existing Pages', type: 'single', options: ['Yes', 'No'] },
          { key: 'social.contentAvailable', label: 'Content Available', type: 'single', options: ['Yes', 'No', 'Partly'] },
          { key: 'social.adBudget', label: 'Ad Budget', type: 'single', options: ['Discuss', 'Client will define separately'] },
          { key: 'social.goal', label: 'Main marketing goal', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'business',
    title: '6. Business & Project Requirements',
    groups: [
      {
        fields: [
          { key: 'business.primaryGoal', label: 'Primary Goal', type: 'single', options: ['Data protection', 'Cost control', 'Digital presence', 'Automation', 'Growth'] },
          { key: 'business.expectedStart', label: 'Expected Start', type: 'single', options: ['Immediate', '<1 month', '1-3 months', 'Flexible'] },
          { key: 'business.decisionTimeline', label: 'Decision Timeline', type: 'single', options: ['Immediate', 'This month', 'Discuss'] },
          { key: 'business.budget', label: 'Budget', type: 'single', options: ['Proposal first', 'Budget available', 'Discuss'] },
          { key: 'business.support', label: 'Support', type: 'single', options: ['Business hours', 'Extended', 'Project-only', 'Managed monthly'] },
          { key: 'business.problem', label: 'What problem are you mainly trying to solve?', type: 'textarea' },
          { key: 'business.success', label: 'What result would make this project successful?', type: 'textarea' },
          { key: 'business.existing', label: 'Existing vendor / software / cloud / infrastructure to consider', type: 'textarea' },
          { key: 'business.compliance', label: 'Compliance, privacy, data-location or internal IT requirement', type: 'textarea' },
        ],
      },
    ],
  },
]

export function sectionIsVisible(section: FormSection, services: string[]): boolean {
  if (!section.visibleForServices) return true
  return section.visibleForServices.some((s) => services.includes(s))
}

// Social-media/ads and web/mobile share section 5, so hide the sub-groups
// that don't match what was ticked.
const groupServices: Record<string, string[]> = {
  'Website / Web Portal': [SERVICES.web, SERVICES.maintenance],
  'Mobile Application': [SERVICES.mobile, SERVICES.maintenance],
  'Social Media & Digital Marketing': [SERVICES.social, SERVICES.ads],
}

export function groupIsVisible(group: FormGroup, services: string[]): boolean {
  if (!group.title) return true
  const needed = groupServices[group.title]
  if (!needed) return true
  return needed.some((s) => services.includes(s))
}

const labelByKey: Record<string, string> = {}
for (const section of formSections) {
  for (const group of section.groups) {
    for (const field of group.fields) labelByKey[field.key] = field.label
  }
}
labelByKey[OTHER_SERVICE_KEY] = 'Other service (specified by client)'

export function labelForKey(key: string): string {
  return labelByKey[key] ?? key
}
