import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { env } from '../config/env'

// IDrive e2 is S3-API-compatible, but the *capacity* you buy from IDrive
// is a billing-side plan, not something enforced or exposed by the S3 API
// itself (their own FAQ: you can exceed it and get an overage charge
// rather than a hard rejection). There is no "GetBucketQuota" call to make
// here. So this service only ever answers "how many bytes are actually in
// the bucket right now" — the purchased ceiling is admin-entered and
// lives in AppSettings.objectStorageCapacityBytes instead (see
// admin.service.ts's getObjectStorageOverview).
//
// This also does NOT verify Nextcloud itself is using this bucket as its
// storage backend — that's a separate config change (Nextcloud's
// config.php `objectstore` block pointed at IDrive's S3-compatible
// endpoint). If Nextcloud is still on local/other storage, this will
// faithfully report whatever's actually sitting in the configured bucket,
// which may be nothing.

let client: S3Client | null = null

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: env.IDRIVE_E2_ENDPOINT,
      region: env.IDRIVE_E2_REGION,
      // IDrive e2 (like most non-AWS S3-compatible providers) needs
      // path-style requests (https://endpoint/bucket/key) rather than
      // virtual-hosted-style (https://bucket.endpoint/key).
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.IDRIVE_E2_ACCESS_KEY_ID!,
        secretAccessKey: env.IDRIVE_E2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

export const objectStorageService = {
  isConfigured(): boolean {
    return Boolean(
      env.IDRIVE_E2_ENDPOINT && env.IDRIVE_E2_BUCKET && env.IDRIVE_E2_ACCESS_KEY_ID && env.IDRIVE_E2_SECRET_ACCESS_KEY
    )
  },

  // Sums every object's size via paginated ListObjectsV2 — the only way
  // to get a real total from the S3 API itself (no HeadBucket-level
  // aggregate exists). Fine for a bucket with thousands of objects; if
  // this bucket ever grows into the millions-of-objects range, consider
  // switching to IDrive's own usage-reporting API (console-only today) or
  // caching this more aggressively than the 5-minute staleTime the
  // frontend already applies.
  async getUsedBytes(): Promise<{ usedBytes: number; objectCount: number }> {
    const s3 = getClient()
    let usedBytes = 0
    let objectCount = 0
    let continuationToken: string | undefined

    do {
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: env.IDRIVE_E2_BUCKET,
          ContinuationToken: continuationToken,
        })
      )
      for (const obj of result.Contents ?? []) {
        usedBytes += obj.Size ?? 0
        objectCount += 1
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (continuationToken)

    return { usedBytes, objectCount }
  },
}
