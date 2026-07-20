import 'dotenv/config'

// config/env.ts exits the process if any required var is missing. Real
// values from .env (loaded above) win — these are just fallbacks so unit
// tests that mock external calls (e.g. NextcloudService) can run without
// needing real credentials for anything they don't actually contact.
//
// DATABASE_URL is the exception: this fallback only lets the env module
// itself load without crashing. Tests that actually hit the database (e.g.
// auth.test.ts) still need a real, reachable DATABASE_URL supplied via a
// real .env — this placeholder will not make those tests pass.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/placeholder_not_real'
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-for-real-use'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-for-real-use'
process.env.NEXTCLOUD_AGENT_URL ??= 'http://127.0.0.1:4100'
process.env.NEXTCLOUD_AGENT_TOKEN ??= 'test-agent-token-not-for-real-use'
