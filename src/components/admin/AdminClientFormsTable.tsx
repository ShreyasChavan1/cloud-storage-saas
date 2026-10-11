import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAdminClientForms } from '@/hooks/useAdminClientForms'
import { ClientFormStatus } from '@/api/clientForms'
import { StatusBadge, PriorityBadge, statusLabels } from './clientFormBadges'

const PAGE_SIZE = 10

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

// Submissions of the public Client Requirement & Discovery Form.
export function AdminClientFormsTable() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [status, setStatus] = useState<'' | ClientFormStatus>('')
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [search, status])

  const { data, isLoading, isError } = useAdminClientForms({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-4 w-4" />
          Client requirement forms
          {!!data?.newCount && <Badge tone="brand">{data.newCount} new</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search company, contact, email…"
              aria-label="Search client forms"
              className="h-9 w-56 rounded-xl border border-line bg-surface-0 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface2"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | ClientFormStatus)}
            aria-label="Filter by status"
            className="h-9 rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface2"
          >
            <option value="">All statuses</option>
            {(Object.keys(statusLabels) as ClientFormStatus[]).map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-ink-400">Loading…</p>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-danger">Couldn't load client forms.</p>
        ) : data && data.forms.length > 0 ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400 dark:border-dark-border">
                <th className="py-2 pr-3 font-medium">Client</th>
                <th className="py-2 pr-3 font-medium">Services</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.forms.map((f) => (
                <tr
                  key={f.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate(`/admin/client-forms/${f.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/client-forms/${f.id}`)}
                  className="cursor-pointer border-b border-line/60 transition-colors hover:bg-surface-50 focus:bg-surface-50 focus:outline-none dark:border-dark-border/60 dark:hover:bg-dark-surface2"
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium">{f.companyName}</div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">{f.contactPerson} · {f.email}</div>
                  </td>
                  <td className="max-w-[220px] py-3 pr-3 text-xs text-ink-500 dark:text-ink-400">
                    {f.services.join(', ')}
                  </td>
                  <td className="py-3 pr-3"><StatusBadge status={f.status} /></td>
                  <td className="py-3 pr-3"><PriorityBadge priority={f.priority} /></td>
                  <td className="whitespace-nowrap py-3 text-xs text-ink-500 dark:text-ink-400">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-ink-400">No client forms yet.</p>
        )}
      </div>

      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
