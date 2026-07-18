import 'dotenv/config'

// config/env.ts exits the process if any required var is missing. Real
// values from .env (loaded above) win — these are just fallbacks so unit
// tests that mock external calls (e.g. NextcloudService) can run without
// needing real credentials for anything they don't actually contact.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-for-real-use'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-for-real-use'
process.env.NEXTCLOUD_URL ??= 'https://nextcloud.test.local'
process.env.NEXTCLOUD_ADMIN_USER ??= 'test-admin'
process.env.NEXTCLOUD_ADMIN_PASSWORD ??= 'test-admin-password-not-for-real-use'
