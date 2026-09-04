import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().default('30m'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // Nextcloud is provisioned via a small standalone agent (see
  // ../nextcloud-agent) that runs ON the Nextcloud server and exposes five
  // operations over HTTP, authenticated by a shared token — NOT the OCS
  // Provisioning HTTP API directly (it has a currently open Nextcloud bug,
  // server#51637, rejecting sensitive requests even with a valid app
  // password — see NextcloudService.ts), and NOT SSH from this machine
  // (no private key needs to live here).
  NEXTCLOUD_AGENT_URL: z
    .string()
    .url('NEXTCLOUD_AGENT_URL must be a full URL, e.g. http://141.148.216.121:4100')
    .transform((url) => url.replace(/\/+$/, '')),
  NEXTCLOUD_AGENT_TOKEN: z.string().min(16, 'NEXTCLOUD_AGENT_TOKEN must be at least 16 characters'),

  // WebDAV base URL — NOT a secret (it's the same host:port used to reach
  // Nextcloud's own web UI), used directly by this backend for file
  // operations. Every WebDAV request authenticates as the specific target
  // user via their own encrypted app password (see
  // nextcloudWebdavPasswordEncrypted on User) — this backend never holds
  // an admin-level Nextcloud credential for file access, only the agent's
  // scoped bearer token for account lifecycle operations.
  NEXTCLOUD_URL: z
    .string()
    .url('NEXTCLOUD_URL must be a full URL, e.g. http://141.148.216.121:8080')
    .transform((url) => url.replace(/\/+$/, '')),

  // 32 bytes, hex-encoded (64 hex chars) — AES-256-GCM key used to encrypt
  // nextcloudWebdavPasswordEncrypted at rest. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // Losing/rotating this key without a migration plan orphans every
  // stored WebDAV credential — back it up like any other production secret.
  CREDENTIAL_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Razorpay (Phase 11A) — server-side only. RAZORPAY_KEY_ID is also
  // returned to the client from POST /payments/create-order (Razorpay's
  // checkout widget needs the public key id to open), but
  // RAZORPAY_KEY_SECRET never leaves RazorpayService.ts — see that file's
  // header comment, same isolation pattern as NextcloudService.ts and the
  // agent's own admin credentials.
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  // Razorpay's primary market is INR; Plan.price has no currency field of
  // its own (this app has only ever shown a bare "$" in Pricing.tsx), so
  // this makes the assumption explicit and overridable rather than
  // silently hardcoding one or the other.
  RAZORPAY_CURRENCY: z.string().default('INR'),
  // Phase 11B — configured separately in the Razorpay dashboard's Webhooks
  // section, deliberately NOT the same value as RAZORPAY_KEY_SECRET. Used
  // only by RazorpayService.verifyWebhookSignature to check the
  // `X-Razorpay-Signature` header against the raw request body; see that
  // method's own comment for why this can't reuse the checkout-signature
  // formula/secret above.
  RAZORPAY_WEBHOOK_SECRET: z.string().min(16, 'RAZORPAY_WEBHOOK_SECRET must be at least 16 characters'),
  // Razorpay Subscriptions Plan IDs. Create these once in Razorpay Dashboard/API.
  RAZORPAY_PLAN_BASIC_ID: z.string().optional(),
  RAZORPAY_PLAN_PRO_ID: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Fail fast and loud — a misconfigured env is worse than a crashed boot.
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
