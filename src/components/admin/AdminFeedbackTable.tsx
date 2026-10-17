import { useEffect, useState } from 'react'
import { MessageSquare, Search, Star, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAdminFeedback, useDeleteFeedback } from '@/hooks/useAdminFeedback'
import { useToast } from '@/context/ToastContext'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { FeedbackEntry } from '@/api/feedback'

const PAGE_SIZE = 10

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`}
        />
      ))}
    </span>
  )
}

// Submissions of the public "Share your feedback" form on the home page.
export function AdminFeedbackTable() {
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [rating, setRating] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<FeedbackEntry | null>(null)
  const deleteFeedback = useDeleteFeedback()

  useEffect(() => setPage(1), [search, rating])

  const { data, isLoading, isError } = useAdminFeedback({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    rating: rating || undefined,
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    deleteFeedback.mutate(deleteTarget.id, {
      onSuccess: () => {
        showToast('Feedback deleted', 'success')
        setDeleteTarget(null)
      },
      onError: (err) => showToast(getErrorMessage(err, 'Could not delete this feedback.'), 'error'),
    })
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Feedback
          {!!data?.overallTotal && (
            <Badge tone="brand">
              {data.averageRating?.toFixed(1)} ★ average · {data.overallTotal} total
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search feedback or email…"
              aria-label="Search feedback"
              className="h-9 w-56 rounded-xl border border-line bg-surface-0 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface2"
            />
          </div>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')}
            aria-label="Filter by rating"
            className="h-9 rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface2"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'star' : 'stars'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-ink-400">Loading…</p>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-danger">Couldn't load feedback.</p>
        ) : data && data.feedback.length > 0 ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400 dark:border-dark-border">
                <th className="py-2 pr-3 font-medium">Rating</th>
                <th className="py-2 pr-3 font-medium">Feedback</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Submitted</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.feedback.map((f) => (
                <tr key={f.id} className="border-b border-line/60 align-top dark:border-dark-border/60">
                  <td className="whitespace-nowrap py-3 pr-3">
                    <RatingStars rating={f.rating} />
                  </td>
                  <td className="max-w-[360px] whitespace-pre-wrap break-words py-3 pr-3">{f.description}</td>
                  <td className="py-3 pr-3 text-xs">
                    {f.email ? (
                      <a className="text-brand-600 hover:underline dark:text-brand-400" href={`mailto:${f.email}`}>
                        {f.email}
                      </a>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-xs text-ink-500 dark:text-ink-400">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(f)}
                      aria-label="Delete feedback"
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-surface-100 hover:text-danger dark:hover:bg-dark-surface2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-ink-400">No feedback yet.</p>
        )}
      </div>

      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
          <span>
            Page {page} of {totalPages}
          </span>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete feedback?"
        message="This permanently removes this feedback entry. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleteFeedback.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  )
}
