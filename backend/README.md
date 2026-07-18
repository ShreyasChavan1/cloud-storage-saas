# Nimbus Backend — Phase 2 (Auth Foundation)

Express + TypeScript API backing the Nimbus frontend. This phase covers
**authentication and user accounts only** — no file storage, no Nextcloud.
It's designed so `AuthContext.tsx` in the frontend can swap its dummy
`login`/`register`/`logout` calls for real requests against this API without
changing any component shape (`AuthUserDTO` matches the frontend's `AuthUser`
interface exactly).

## Stack
Express · TypeScript · PostgreSQL · Prisma · JWT (access + rotating refresh) · bcrypt · Zod · Pino

## Folder structure
```
backend/
  prisma/schema.prisma      # User, RefreshToken models
  src/
    config/                 # env validation, logger, http logging
    controllers/             # req/res only — no business logic
    routes/                  # Express routers
    middleware/               # auth guard, validation, errors, rate limit
    services/                 # business logic
    repositories/             # Prisma queries only
    models/                    # DB row -> public DTO mappers
    validators/                # Zod schemas
    utils/                       # ApiError, jwt, password, response helpers
    types/                        # shared TS types, Express augmentation
    database/                     # Prisma client singleton
    app.ts / server.ts
  tests/
```

## Setup
```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL and JWT secrets
npm run prisma:migrate    # creates tables in your Postgres database
npm run dev                # http://localhost:4000
```

Requires a running PostgreSQL instance. Quickest local option:
```bash
docker run --name nimbus-db -e POSTGRES_USER=nimbus -e POSTGRES_PASSWORD=nimbus \
  -e POSTGRES_DB=nimbus -p 5432:5432 -d postgres:16
```

## API

| Method | Route              | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account, returns access token + sets refresh cookie |
| POST | `/api/auth/login`    | – | Returns access token + sets refresh cookie |
| POST | `/api/auth/logout`   | refresh cookie | Deletes the current session |
| POST | `/api/auth/forgot-password` | – | Issues a password reset token (stored hashed in Postgres). Always returns the same generic message; no email transport is wired up yet — see note below. |
| GET  | `/api/auth/me`       | Bearer access token | Current user |
| POST | `/api/auth/refresh-token` | refresh cookie | Rotates the session, returns a new access token |
| GET  | `/api/users/me`      | Bearer access token | Current user profile |
| PATCH| `/api/users/me`      | Bearer access token | Update name (avatar initials are derived, not stored) |
| GET  | `/api/health`        | – | Liveness check |

All responses use the envelope `{ success, data }` or `{ success: false, error: { message, details } }`.

## Auth model
- **Access token**: short-lived JWT (default 15m), sent as `Authorization: Bearer <token>`, held in memory on the client.
- **Refresh token**: longer-lived JWT (default 7d), stored **only** as an httpOnly, `SameSite=Lax` cookie scoped to `/api/auth`. The raw token is never persisted server-side — only its SHA-256 hash — so a database read can't be replayed as a session. Refresh tokens rotate on every use.

## Testing
```bash
npm test
```
`tests/auth.test.ts` exercises the full register → login → /me flow against
a real database — point `DATABASE_URL` at a disposable test database first
and run `npm run prisma:migrate` against it.

## Wiring up the frontend
Replace `AuthContext.tsx`'s three dummy functions with calls to this API
(e.g. via Axios, already installed in the frontend):
- `login(email, password)` → `POST /api/auth/login`
- `register(name, email, password)` → `POST /api/auth/register`
- `logout()` → `POST /api/auth/logout`
- On app load, call `GET /api/auth/me` (if an access token is held) to restore the session instead of the current `localStorage.getItem('nimbus-demo-auth')` check.

## Nextcloud integration (Phase 5)
`src/services/NextcloudService.ts` is a thin client around Nextcloud's OCS
Provisioning API — `createUser`, `deleteUser`, `changePassword`, `setQuota`,
`getQuota`. It's the **only** place `NEXTCLOUD_ADMIN_USER` /
`NEXTCLOUD_ADMIN_PASSWORD` are read; they're never logged, never returned in
any API response, and errors surfaced to callers strip everything except
Nextcloud's own message field.

**Registration now does two provisioning steps, not one:**
```
Create PostgreSQL user
       ↓
Create Nextcloud user (quota = the user's plan storage limit)
       ↓
Store nextcloud_username (= the Postgres user's own UUID)
       ↓
Return JWT
```
If Nextcloud provisioning fails, the just-created Postgres user is deleted
and registration fails with a `503` — there's no code path that leaves a
Postgres account with no matching storage backend.

The Nextcloud username is deliberately the same UUID as the Postgres `id`,
not something derived from the email — guarantees uniqueness and sidesteps
Nextcloud's username character restrictions entirely.

**`deleteUser`, `setQuota`, and `getQuota` are implemented but not yet wired
into any route** — no account-deletion or plan-upgrade endpoint exists yet.
`changePassword` is likewise implemented but there's no password-change
route to call it from yet (ties into the still-open `forgot-password` /
`reset-password` gap noted above — completing that flow should call both
`comparePassword`'s hash update AND `nextcloudService.changePassword` so the
two stay in sync).

Setup: create an **app password** in Nextcloud (Settings → Security →
"Devices & sessions" → create new app password) rather than using the admin
account's real login password, and put it in `.env` as
`NEXTCLOUD_ADMIN_PASSWORD`.

## Not included in this phase
File/folder storage, uploads, sharing, and any Nextcloud/WebDAV integration
are explicitly out of scope here, per the Phase 2 spec.

## Known gap: password reset is not end-to-end yet
`POST /api/auth/forgot-password` generates a reset token, stores its hash in
`password_reset_tokens`, and logs it — but there's no email transport
configured, and no `POST /api/auth/reset-password` route yet to consume the
token and actually change the password. Outside `NODE_ENV=production`, the
raw token is returned in the response body (`devToken`) so you can test the
flow manually via Prisma Studio or curl until a completion endpoint and a
real mailer (e.g. Resend, SES, Postmark) are wired up.
