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

  // Nextcloud OCS Provisioning API — used server-side only, never exposed
  // to the client. Use an app password (Settings > Security > Devices &
  // sessions), not the admin account's actual login password.
  NEXTCLOUD_URL: z
    .string()
    .url('NEXTCLOUD_URL must be a full URL, e.g. https://cloud.example.com')
    .transform((url) => url.replace(/\/+$/, '')), // strip trailing slash(es)
  NEXTCLOUD_ADMIN_USER: z.string().min(1, 'NEXTCLOUD_ADMIN_USER is required'),
  NEXTCLOUD_ADMIN_PASSWORD: z.string().min(1, 'NEXTCLOUD_ADMIN_PASSWORD is required'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
