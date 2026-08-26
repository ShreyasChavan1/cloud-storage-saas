# Nimbus Backend — through Phase 10 (Admin Dashboard)

Express + TypeScript API backing the Nimbus frontend. Started as auth-only
(Phase 2) and has since grown real file storage over WebDAV (Phase 6), live
quota/stats reporting for the dashboard (Phase 9), and now a role-protected
admin surface for managing accounts (Phase 10) — see the phase-by-phase
sections below for how each layer was added on top of the last.

## Stack
Express · TypeScript · PostgreSQL · Prisma · JWT (access + rotating refresh) · bcrypt · Zod · Pino · WebDAV (file storage) · Multer (uploads)

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
| GET  | `/api/files`         | Bearer access token | List a directory (`?path=`, defaults to root) |
| POST | `/api/files/upload`  | Bearer access token | Upload a file (`multipart/form-data`, field `file`; `?path=` target folder) |
| DELETE | `/api/files`       | Bearer access token | Delete a file or folder (`?path=`) |
| PATCH| `/api/files/rename`  | Bearer access token | Rename (`{ path, newName }`) |
| POST | `/api/files/folder`  | Bearer access token | Create a folder (`{ path?, name }`) |
| POST | `/api/files/move`    | Bearer access token | Move (`{ from, to }`) |
| POST | `/api/files/copy`    | Bearer access token | Copy (`{ from, to }`) |
| GET  | `/api/files/quota`   | Bearer access token | Current user's live storage usage |
| GET  | `/api/files/stats`   | Bearer access token | Account-wide dashboard rollup: total files/folders, largest files, recent uploads (see root README's Phase 9 section) |
| GET  | `/api/files/download`| Bearer access token | Download a file (`?path=`), streamed |
| GET  | `/api/health`        | – | Liveness check |
| GET  | `/api/admin/overview`  | Bearer token, ADMIN | Cheap Postgres-only counts for the admin dashboard's summary cards |
| GET  | `/api/admin/plans`     | Bearer token, ADMIN | List billing plans (for the create-user form's plan picker) |
| GET  | `/api/admin/users`     | Bearer token, ADMIN | Paginated, searchable, filterable user list (`?page&limit&search&role&status`) |
| POST | `/api/admin/users`     | Bearer token, ADMIN | Create a user (same provisioning pipeline as self-registration) |
| GET  | `/api/admin/users/:id` | Bearer token, ADMIN | Single user detail |
| DELETE | `/api/admin/users/:id` | Bearer token, ADMIN | Delete a user (Nextcloud account + Postgres row) |
| PATCH  | `/api/admin/users/:id/status` | Bearer token, ADMIN | Suspend or reactivate (`{ status: 'ACTIVE' \| 'SUSPENDED' }`) |
| POST   | `/api/admin/users/:id/reset-password` | Bearer token, ADMIN | Admin-driven password reset (`{ password? }` — generates one if omitted) |
| PATCH  | `/api/admin/users/:id/quota` | Bearer token, ADMIN | Increase/decrease a user's Nextcloud storage quota (`{ storageLimitGb }`) |
| GET  | `/api/admin/users/:id/storage` | Bearer token, ADMIN | That user's live quota usage (reuses `filesService.quota`) |
| GET  | `/api/admin/users/:id/storage/breakdown` | Bearer token, ADMIN | That user's largest files / recent uploads (reuses `filesService.stats`) |
| GET  | `/api/admin/users/:id/payments` | Bearer token, ADMIN | That user's payment history rows (see the Phase 10 section — this is honestly almost always empty) |
| GET  | `/api/admin/users/:id/sessions` | Bearer token, ADMIN | That user's active (unexpired) sessions |
| DELETE | `/api/admin/users/:id/sessions/:sessionId` | Bearer token, ADMIN | Revoke a single session |

All responses use the envelope `{ success, data }` or `{ success: false, error: { message, details } }`.

## Auth model
- **Access token**: short-lived JWT (default 15m), sent as `Authorization: Bearer <token>`, held in memory on the client.
- **Refresh token**: longer-lived JWT (default 7d), stored **only** as an httpOnly, `SameSite=Lax` cookie scoped to `/api/auth`. The raw token is never persisted server-side — only its SHA-256 hash — so a database read can't be replayed as a session. Refresh tokens rotate on every use.
- **Suspension** (Phase 10) is enforced at login and refresh, not on every request — see the Phase 10 section below for why, and the tradeoff that comes with it.

## Testing
```bash
npm test
```
`tests/auth.test.ts` exercises the full register → login → /me flow (and,
as of Phase 10, suspension/refresh-rejection) against a real database —
point `DATABASE_URL` at a disposable test database first and run
`npm run prisma:migrate` against it. The rest of `tests/*.test.ts` are
fully mocked unit tests (repositories, NextcloudService, WebDavService all
mocked out) and run with no external dependencies at all.

## Wiring up the frontend
`AuthContext.tsx` in the frontend calls this API directly — no dummy
functions left:
- `login(email, password)` → `POST /api/auth/login`
- `register(name, email, password)` → `POST /api/auth/register`
- `logout()` → `POST /api/auth/logout`
- On app load, `POST /api/auth/refresh-token` (via the httpOnly cookie)
  silently restores the session if one exists. Access tokens live in memory
  only, never `localStorage`.

## Nextcloud integration (Phase 5)
`src/services/NextcloudService.ts` provisions Nextcloud accounts by calling
a small standalone **agent** (`../nextcloud-agent`, a sibling project — see
its own README) that runs **on the Nextcloud server itself** and exposes
five operations over HTTP, authenticated by a shared bearer token.

**Why not the OCS Provisioning HTTP API directly:** Nextcloud has a
long-standing, currently open bug
([nextcloud/server#51637](https://github.com/nextcloud/server/issues/51637))
where sensitive OCS endpoints (create/delete user, change password) reject
even fully valid app-password Basic-Auth requests with `403 Password
confirmation is required`. Confirmed directly against a real instance during
development — a fresh app password, no 2FA on the account, a full session
logout, and raising `password_confirm_timeout` all made no difference;
read-only OCS calls (e.g. listing users) work fine, only the write endpoints
are affected.

**Why not SSH from this backend directly:** an SSH key grants full shell
access on the Nextcloud server — a much larger blast radius than this needs.
The agent's bearer token only grants access to five specific operations, and
there's no private key to protect on the machine running this backend at
all (worth mentioning since this backend may run somewhere other than where
you develop it — a leaked `.env` here only leaks that one token, not shell
access to another server).

**Registration flow:**
```
Create PostgreSQL user
       ↓
Create Nextcloud user via the agent, quota = the user's plan limit
       ↓
Store nextcloud_username (= the Postgres user's own UUID)
       ↓
Return JWT
```
If Nextcloud provisioning fails, the just-created Postgres user is deleted
and registration fails with a `503` — no code path leaves a Postgres account
with no matching storage backend.

**Setup:**
1. Deploy `../nextcloud-agent` onto the Nextcloud server itself — see its
   README for the full walkthrough (generating a token, firewalling the
   port to only your backend's IP, running it under `pm2` or systemd).
2. In **this** project's `.env`:
   ```
   NEXTCLOUD_AGENT_URL=http://<nextcloud-server-ip>:4100
   NEXTCLOUD_AGENT_TOKEN=<the exact same token set in the agent's own .env>
   ```

If you later deploy this backend onto the *same* machine as Nextcloud (the
plan mentioned during development), the agent doesn't need to change at
all — you'd just point `NEXTCLOUD_AGENT_URL` at `http://localhost:4100`
instead of the public IP.

**`deleteUser` and `setQuota` are implemented but not yet wired into any
route** — no account-deletion or plan-upgrade endpoint exists yet.
**`changePassword` is likewise implemented but unused** — there's still no
`reset-password` completion route (see the "Known gap" note above). Once
that exists, it needs to call *both* the Postgres password update AND
`nextcloudService.changePassword`, or the two systems' passwords will drift
apart.

**`getQuota` returns less than a direct OCS integration could have.** The
agent can only report the *configured* quota via `occ` (e.g. `"5 GB"`) —
`occ` has no clean equivalent of the OCS API's live usage stats (free/used/
total/relative). `NextcloudQuota` reflects this honestly rather than faking
numbers.

## File API (Phase 6)
`/api/files/*` proxies file operations to Nextcloud over **WebDAV** —
the frontend never talks to WebDAV, or to Nextcloud, directly at all. Every
request goes: frontend → this backend → WebDAV (as that specific user) →
Nextcloud.

**Why not admin-impersonation, the way `occ` works for account
provisioning:** Nextcloud has no equivalent for WebDAV — confirmed via its
own docs and an open, unresolved feature request for exactly this
capability. WebDAV paths are scoped to whoever authenticates, full stop.

**So each user gets their own dedicated credential.** At registration,
right after `nextcloud-agent` creates the account (see Phase 5), it also
runs `occ user:auth-tokens:add` to mint a separate, individually-revocable
app password — NOT the account's login password — specifically for this
backend's file access. That password is encrypted (AES-256-GCM, see
`utils/encryption.ts`) and stored on the `User` row
(`nextcloudWebdavPasswordEncrypted`). Every file request decrypts it,
authenticates to WebDAV as that one user, and nothing else ever holds an
admin-level credential capable of reading anyone's files.

**Path-traversal is the single most important thing to get right here.**
Every path argument across all 9 routes goes through
`utils/davPath.ts::sanitizeDavPath()` before reaching WebDAV — it's covered
by its own dedicated, thorough test suite
(`tests/davPath.test.ts`) precisely because a mistake here would mean one
user's `path=../other-user-folder` reaching outside their own space. In
practice this can't happen even in principle, not just by convention: each
WebDAV client is constructed with that user's own root
(`/remote.php/dav/files/<their-uuid>/`) already baked into its base URL, so
even a full path-traversal payload can only ever resolve to somewhere
inside their own tree — never another user's.

**Uploads** are buffered in memory via Multer (100MB cap) — simplest
correct option for now; worth revisiting (disk-temp storage, or a
streaming multipart parser) if this ever needs to handle much larger files.

**Downloads stream** — the backend never buffers a whole file before
sending it to the client; `WebDavService.downloadStream()` returns a live
Node stream piped directly into the HTTP response.

**A worthwhile side effect:** Phase 5's agent-based `nextcloudService.getQuota()`
could only report the *configured* quota ceiling (`occ` has no live-usage
equivalent). `GET /api/files/quota` doesn't have that limitation — WebDAV's
own quota properties give real used/available byte counts, now that
per-user credentials exist to ask for them.

**The `webdav` client library is pure ESM** (no CommonJS build at all) —
this backend compiles to CommonJS, so `WebDavService.ts` loads it via a
cached dynamic `import()` rather than a static import, which is the
standard, correct interop mechanism for this. A static import would have
compiled fine but crashed at actual runtime (`ERR_REQUIRE_ESM`) — worth
knowing if this file ever gets refactored.

## Admin dashboard (Phase 10)
Everything under `/api/admin/*` is gated by two middlewares in sequence:
`requireAuth` (valid access token) then `requireAdmin`
(`middleware/admin.middleware.ts`).

**`requireAdmin` re-reads the user's role and status from Postgres on every
request — it never trusts anything in the JWT.** The access token payload
(`AuthTokenPayload`) only ever carries `{ sub, email }`; it has no `role`
field to trust or forget to check. This means a demotion or suspension
takes effect on an admin's very next request, not just their next login —
the DB read costs one query per admin request, which is a fine trade for
"can never act on stale authorization" given how infrequently admin routes
are hit compared to the rest of the API.

**Suspension enforcement lives in `authService`, not in every request's
middleware chain** — checked once at login (rejects outright) and once at
refresh (`userRepository.findById` was already happening there; the status
check just rides along). This is deliberately consistent with this
backend's existing stateless-access-token design (see "Auth model" above)
rather than adding a per-request DB hit for every authenticated call in the
app just for this. The honest tradeoff: suspending someone deletes all
their sessions (so refresh is rejected immediately), but a *currently
valid* access token they already hold keeps working until it naturally
expires — up to `JWT_ACCESS_EXPIRES_IN` (15m by default). Closing that gap
completely would mean either a token blacklist or moving every route
behind a DB-backed check, both bigger changes than this feature called for.

**Self-protection guards, enforced in `adminService`, not just the UI:**
- An admin can't suspend or delete their own account through this API
  (`assertNotSelf`) — no route to lock yourself out by mistake.
- The last remaining `ADMIN` account can't be suspended or deleted
  (`assertNotLastAdmin`, backed by `userRepository.countAdmins`) — no route
  to leave the app with zero admins and no way back in.

**Creating a user reuses the exact same pipeline as self-registration.**
The create-Postgres-user → provision-Nextcloud-account →
rollback-Postgres-on-Nextcloud-failure logic used to live entirely inside
`authService.register`; it's now `services/userProvisioning.service.ts`'s
`provisionUser()`, called by both `authService.register` (unchanged
external behavior) and `adminService.createUser` (which can additionally
set `role` and `planId` up front — self-registration always defaults both).

**Deleting a user reverses that same ordering, deliberately.**
Nextcloud account deletion happens *first*; only if that succeeds does the
Postgres row get deleted. If it fails, both sides are left intact so the
whole operation is safely retryable — the same "never let a Postgres user
and its Nextcloud account go out of sync" rule registration's rollback
follows, just mirrored. Postgres cascade-deletes that user's sessions,
subscriptions, payments, and password reset tokens automatically
(`onDelete: Cascade` in `schema.prisma`) — nothing left to clean up by hand.

**Resetting a password follows the same "Nextcloud first" rule.**
`nextcloudService.changePassword` runs before the Postgres `passwordHash`
update; if it fails, Postgres is left untouched, so the login password and
the Nextcloud account password can never drift out of sync (this closes
the gap the "Known gap" note below used to describe, for the admin-driven
path — self-service reset-password still isn't wired up). Unlike
`authService.forgotPassword`'s `devToken` (only returned outside
production, because that endpoint is public and there's no email
transport), this endpoint always returns a generated password when it
generates one — the caller is an authenticated admin, and relaying the
password to the user out-of-band is the entire point. All of that user's
sessions are revoked afterward either way.

**Quota adjustment is deliberately separate from the `Plan`/`Subscription`
billing concept.** `PATCH /users/:id/quota` calls
`nextcloudService.setQuota` directly (implemented since Phase 5, unused
until now) — it does not touch `planId`. An admin's one-off quota override
for a specific user shouldn't silently misrepresent what plan they're
nominally on, or force inventing a pseudo-plan just to describe an ad-hoc
change.

**Two small, deliberate schema extensions were needed, not just new
tables:**
- `User.status` (`UserStatus`: `ACTIVE` | `SUSPENDED`) — see suspension
  enforcement above.
- `Session.createdAt`, `Session.userAgent`, `Session.ipAddress` — the
  `sessions` table previously only had enough to answer "is this refresh
  token still valid", not "what should an admin see in an active-sessions
  list". Captured once at issue time (`issueTokenPair` in
  `auth.service.ts`, threaded from `req.ip`/`req.headers['user-agent']` in
  `auth.controller.ts`), never updated afterward — best-effort only, since
  a client can send whatever `User-Agent` it wants.

**Payments will honestly show an empty list.** `paymentRepository` is
read-only on purpose: no payment gateway (Stripe, Razorpay, etc.) is
integrated anywhere in this codebase, so nothing has ever created a
`Payment` row. `GET /users/:id/payments` reflects that truthfully rather
than fabricating billing history — see the frontend's admin user detail
page for how it's presented (an explicit "no gateway integrated yet" empty
state, not a blank table that looks broken).

**Bootstrapping the first admin.** There's no route to promote a user to
`ADMIN` (by design — that's an operator action, not something to expose
over HTTP without an admin already existing to gate it). Set
`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` (and optionally
`ADMIN_SEED_NAME`) in `.env` and run `npm run prisma:seed` — `prisma/seed.ts`
calls the same `provisionUser()` as everything else, just with
`role: 'ADMIN'`, and skips itself entirely if those env vars aren't set (so
existing seeding behavior is unaffected if you don't need this). From
there, every further admin is created through the dashboard itself.

## Known gap: password reset is not end-to-end yet
`POST /api/auth/forgot-password` generates a reset token, stores its hash in
`password_reset_tokens`, and logs it — but there's no email transport
configured, and no `POST /api/auth/reset-password` route yet to consume the
token and actually change the password. Outside `NODE_ENV=production`, the
raw token is returned in the response body (`devToken`) so you can test the
flow manually via Prisma Studio or curl until a completion endpoint and a
real mailer (e.g. Resend, SES, Postmark) are wired up.
