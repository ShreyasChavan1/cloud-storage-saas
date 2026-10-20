import { subscriptionRepository } from '../repositories/subscription.repository'
import { filesService } from './files.service'
import { ApiError } from '../utils/ApiError'
import { logger } from '../config/logger'
import { BLOCK_UPLOADS_WHEN_PAST_DUE, PAST_DUE_GRACE_DAYS } from '../config/plans'

export type UploadBlockReason = 'PAST_DUE' | 'OVER_QUOTA'

export interface UploadStatus {
  canUpload: boolean
  reason: UploadBlockReason | null
  message: string | null
  // Set while the subscription is PAST_DUE: the last day before the account
  // moves to the Free plan. Lets the UI say "pay by <date>".
  graceEndsAt: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export const PAST_DUE_UPLOAD_MESSAGE =
  'Your payment is overdue, so uploads are paused. Renew your plan to upload again. Your files stay available to view, download and delete.'
export const OVER_QUOTA_UPLOAD_MESSAGE =
  'Your storage is full or over your plan limit, so uploads are paused. Delete files and empty the trash, or upgrade your plan, to upload again. Your files stay available to view, download and delete.'
export const NOT_ENOUGH_SPACE_UPLOAD_MESSAGE =
  'This upload is larger than your remaining storage. Delete files and empty the trash, or upgrade your plan.'

function blocked(reason: UploadBlockReason, message: string, graceEndsAt: string | null): UploadStatus {
  return { canUpload: false, reason, message, graceEndsAt }
}

/**
 * One place that decides whether an account may add data right now. Used by
 * every upload path (single upload, chunked upload, CCTV ingest) and by the
 * status endpoint the UI reads, so the screen and the server never disagree.
 *
 * Login, browsing, downloading, renaming and deleting are never blocked here —
 * only adding data, so a user over their limit can always free space.
 */
export const uploadGuardService = {
  async getStatus(userId: string, incomingBytes = 0): Promise<UploadStatus> {
    const subscription = await subscriptionRepository.findByUserId(userId)
    const pastDue = subscription?.status === 'PAST_DUE'
    const graceEndsAt =
      pastDue && subscription ? new Date(subscription.renewalDate.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS).toISOString() : null

    if (pastDue && BLOCK_UPLOADS_WHEN_PAST_DUE) {
      return blocked('PAST_DUE', PAST_DUE_UPLOAD_MESSAGE, graceEndsAt)
    }

    try {
      const quota = await filesService.quota(userId)
      if (typeof quota.available === 'number') {
        if (quota.available <= 0) return blocked('OVER_QUOTA', OVER_QUOTA_UPLOAD_MESSAGE, graceEndsAt)
        if (incomingBytes > quota.available) return blocked('OVER_QUOTA', NOT_ENOUGH_SPACE_UPLOAD_MESSAGE, graceEndsAt)
      }
    } catch (err) {
      // If the storage server can't be reached the upload itself will fail
      // with its own, more accurate error — don't also block here.
      logger.warn({ userId, err }, 'Upload guard: could not read quota, allowing the request through')
    }

    return { canUpload: true, reason: null, message: null, graceEndsAt }
  },

  async assertCanUpload(userId: string, incomingBytes = 0): Promise<void> {
    const status = await uploadGuardService.getStatus(userId, incomingBytes)
    if (status.canUpload) return
    if (status.reason === 'PAST_DUE') throw new ApiError(402, status.message ?? PAST_DUE_UPLOAD_MESSAGE)
    throw ApiError.insufficientStorage(status.message ?? OVER_QUOTA_UPLOAD_MESSAGE)
  },
}
