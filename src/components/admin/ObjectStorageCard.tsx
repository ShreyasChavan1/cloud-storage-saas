import { useState } from 'react'
import { Cloud, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PromptDialog } from '@/components/ui/PromptDialog'
import { useAdminObjectStorageOverview } from '@/hooks/useAdminUsers'
import { useUpdateObjectStorageCapacity } from '@/hooks/useAdminMutations'
import { useToast } from '@/context/ToastContext'
import { formatBytes } from '@/lib/formatBytes'
import { getErrorMessage } from '@/lib/getErrorMessage'

const GB = 1024 ** 3

export function ObjectStorageCard() {
  const { showToast } = useToast()
  const { data, isLoading, isFetching, isError } = useAdminObjectStorageOverview()
  const updateCapacity = useUpdateObjectStorageCapacity()
  const [editingCapacity, setEditingCapacity] = useState(false)

  const handleSetCapacity = (value: string) => {
    const gb = Number(value)
    if (!Number.isFinite(gb) || gb <= 0) {
      showToast('Enter a valid number of GB.', 'error')
      return
    }
    updateCapacity.mutate(gb, {
      onSuccess: () => setEditingCapacity(false),
      onError: (err) => showToast(getErrorMessage(err, 'Could not update capacity.'), 'error'),
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-400">
          <Cloud className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Object storage (IDrive e2)</span>
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin text-ink-300" />}
        </div>
        {data?.configured && (
          <button
            type="button"
            aria-label="Edit purchased capacity"
            onClick={() => setEditingCapacity(true)}
            className="rounded-lg p-1 text-ink-400 hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-dark-surface2"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
          <span className="text-sm text-ink-400">Listing bucket contents…</span>
        </div>
      ) : isError ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          Couldn't load
        </p>
      ) : !data?.configured ? (
        <div className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          <p>Not connected yet.</p>
          <p className="mt-1 text-xs text-ink-400">
            Set IDRIVE_E2_ENDPOINT, IDRIVE_E2_BUCKET, IDRIVE_E2_ACCESS_KEY_ID and IDRIVE_E2_SECRET_ACCESS_KEY on the
            backend to enable this.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-2xl font-bold text-ink-900 dark:text-white">
              {formatBytes(data.usedBytes ?? 0)}
              <span className="ml-1 text-sm font-normal text-ink-400">used</span>
            </p>
            {data.capacityBytes != null && (
              <p className="text-sm text-ink-400">of {formatBytes(data.capacityBytes)}</p>
            )}
          </div>

          {data.capacityBytes != null ? (
            <>
              <ProgressBar value={data.usedBytes ?? 0} max={Math.max(data.capacityBytes, 1)} className="mt-2" />
              <p className={`mt-1.5 text-xs ${data.remainingBytes! < 0 ? 'text-danger' : 'text-ink-400'}`}>
                {data.remainingBytes! < 0
                  ? `${formatBytes(Math.abs(data.remainingBytes!))} over the purchased capacity`
                  : `${formatBytes(data.remainingBytes!)} remaining`}
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditingCapacity(true)}
              className="mt-1.5 text-xs font-medium text-brand-600 hover:underline"
            >
              Set purchased capacity to see remaining space
            </button>
          )}

          {data.objectCount != null && (
            <p className="mt-2 text-xs text-ink-400">{data.objectCount.toLocaleString()} objects in bucket</p>
          )}
        </div>
      )}

      <PromptDialog
        open={editingCapacity}
        title="Set purchased capacity"
        label="Total capacity (GB)"
        initialValue={data?.capacityBytes != null ? String(Math.round(data.capacityBytes / GB)) : ''}
        confirmLabel="Save"
        loading={updateCapacity.isPending}
        onCancel={() => setEditingCapacity(false)}
        onConfirm={handleSetCapacity}
      />
    </Card>
  )
}
