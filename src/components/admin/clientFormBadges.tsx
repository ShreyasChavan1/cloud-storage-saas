import { Badge } from '@/components/ui/Badge'
import { ClientFormPriority, ClientFormStatus } from '@/api/clientForms'

export const statusLabels: Record<ClientFormStatus, string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  PROPOSAL_SENT: 'Proposal sent',
  CLOSED: 'Closed',
}

const statusTone = { NEW: 'brand', IN_REVIEW: 'warning', PROPOSAL_SENT: 'success', CLOSED: 'neutral' } as const
const priorityTone = { NORMAL: 'neutral', HIGH: 'warning', URGENT: 'danger' } as const

export function StatusBadge({ status }: { status: ClientFormStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>
}

export function PriorityBadge({ priority }: { priority: ClientFormPriority }) {
  return <Badge tone={priorityTone[priority]}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</Badge>
}
