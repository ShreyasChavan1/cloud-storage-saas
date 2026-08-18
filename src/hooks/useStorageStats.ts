import { useQuery } from '@tanstack/react-query'
import { filesApi } from '@/api/files'

export const storageStatsQueryKey = ['dashboard-stats'] as const

// This backs a single Depth:infinity WebDAV scan of the whole account —
// not a cheap call the way a single folder listing is. A 5-minute
// staleTime means revisiting the dashboard doesn't re-trigger it every
// time, while file mutations (upload/delete/rename/move/copy) explicitly
// invalidate this key themselves, so the numbers still update promptly
// right after something actually changes rather than waiting out the
// full window.
const STATS_STALE_TIME_MS = 5 * 60 * 1000

export function useStorageStats() {
  return useQuery({
    queryKey: storageStatsQueryKey,
    queryFn: filesApi.stats,
    staleTime: STATS_STALE_TIME_MS,
  })
}
