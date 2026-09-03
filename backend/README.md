# Nimbus Backend — through Phase 11B (Recurring Billing & Webhooks)

Express + TypeScript API backing the Nimbus frontend. Started as auth-only
(Phase 2) and has since grown real file storage over WebDAV (Phase 6), live
quota/stats reporting for the dashboard (Phase 9), a role-protected admin
surface for managing accounts (Phase 10), server-side Razorpay payments for
upgrading/canceling a plan (Phase 11A), and now the full recurring-billing
lifecycle on top of that — webhooks, renewals, failed payments, refunds,
period-end cancellation, and reconciliation (Phase 11B) — see the
phase-by-phase sections below for how each layer was added on top of the
last.

## Stack
Express · TypeScript · PostgreSQL · Prisma · JWT (access + rotating refresh) · bcrypt · Zod · Pino · WebDAV (file storage) · Multer (uploads) · Razorpay (payments)

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
| POST | `/api/payments/create-order` | Bearer access token | Create a Razorpay order for a paid plan (`{ planId }`) |
| POST | `/api/payments/verify-payment` | Bearer access token | Verify a Razorpay payment signature; on success, upgrades the plan and syncs Nextcloud quota (`{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`) |
| POST | `/api/payments/upgrade-plan` | Bearer access token | Switch directly to a $0 plan — no Razorpay involved (`{ planId }`) |
| POST | `/api/payments/cancel-subscription` | Bearer access token | Cancel the caller's own subscription, reverting to the default plan immediately |

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
fully mocked unit tests (repositories, NextcloudService, WebDavService,
and — as of Phase 11A — RazorpayService and Prisma's `$transaction` are
all mocked out) and run with no external dependencies at all, including no
real Razorpay account or keys.

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

## Backend payments (Phase 11A)
Razorpay integration, server-side only — there is no Razorpay checkout
widget or any other payment UI anywhere in the frontend. These four
endpoints are the complete surface; a real frontend integration would call
`create-order`, hand the response to Razorpay's own checkout.js, and call
`verify-payment` with whatever that returns. None of that client-side
plumbing exists yet, by design (out of scope for this phase).

**`RazorpayService.ts` is the only place `RAZORPAY_KEY_SECRET` is read** —
same isolation principle as `NextcloudService.ts` and the provisioning
agent's own admin credentials. `RAZORPAY_KEY_ID` is deliberately exposed
(it's not secret — Razorpay's checkout widget needs the public key id
client-side), returned from `create-order`'s response as `keyId`.

**Signature verification is hand-computed, not the SDK's own helper.** The
`razorpay` package exports `Razorpay.validateWebhookSignature`, which covers
a *different* flow from checkout verification — HMAC over a raw webhook
request body, using a separate webhook secret (`RAZORPAY_WEBHOOK_SECRET`,
configured as of Phase 11B — see that section below). Checkout signature
verification uses its own documented formula instead:
`hmac_sha256(orderId + "|" + paymentId, key_secret)`, computed with Node's
own `crypto` and compared with `crypto.timingSafeEqual` (not `===`) — the
same reasoning already applied to the provisioning agent's bearer token
check, and to `RazorpayService.verifyWebhookSignature`'s own formula.

**Every plan change — paid or free — goes through one shared function,**
`payment.service.ts`'s `applyPlanChange`. It's what `verifyPayment` calls
after a valid signature, and what `upgradePlan`/`cancelSubscription` call
directly for the no-payment case. All three ultimately mean the same
thing: "this user is now on this plan," and there's exactly one place that
updates `Subscription` + `User.planId` together and syncs the real
Nextcloud quota to match.

**Subscription is one row per user, not a historical ledger — Payment is
the ledger.** `schema.prisma`'s `Subscription.userId` gained a `@unique`
constraint this phase specifically so plan changes can be a race-safe
upsert rather than accumulating a row per billing period. `Payment`
already served as the append-only history (every attempt, successful or
not, is its own permanent row); splitting "current state" from "history"
across the two tables this way avoids needing period-boundary or
supersession logic that a genuine subscription-ledger design would
require. This is also why Phase 11B's recurring billing (see below) never
needed to become a ledger either — a "renewal" is still just the same
`Subscription` row's `renewalDate` moving forward, exactly like the very
first plan change did.

**A Payment row is created exactly once, at `create-order` time — never
by `verify-payment`.** This is the main thing that makes replayed/duplicate
verification safe: `verifyPayment` only ever looks up and updates the one
row `createOrder` already made (by `providerOrderId`, `@unique`), it never
has a code path that creates a second one. Layered on top of that:
- If the looked-up payment's status is already `SUCCEEDED`, `verifyPayment`
  returns the current state immediately without re-verifying the
  signature, re-running `applyPlanChange`, or touching Nextcloud again —
  this, not the database constraints, is what makes a client (or an
  attacker) simply calling this endpoint twice a no-op instead of a
  duplicate charge/upgrade.
- `Payment.providerPaymentId` is also `@unique` at the DB level, as a
  second line of defense against ever recording the same Razorpay charge
  twice, independent of the application-level check above.
- An invalid signature marks the payment `FAILED` (not left `PENDING`),
  so a subsequent call with the same bad inputs is rejected outright
  rather than re-attempting verification indefinitely.

**Handling "the payment succeeded but Nextcloud didn't sync":**
`applyPlanChange` commits the `Subscription`/`User.planId` change in one
Postgres transaction first, then attempts the Nextcloud quota update as a
separate, best-effort step afterward — the two can't share a transaction
(one is Postgres, the other an HTTP call to a different system entirely).
If that Nextcloud call fails, the plan change is **not rolled back**: for
the paid path a real charge already happened, and for the free path there
was never a charge to protect either way — in both cases the entitlement
is genuinely earned, and reverting it because Nextcloud was briefly
unreachable would be the wrong failure mode. Instead,
`Subscription.quotaSyncedAt` is left `null` as an honest, queryable marker,
the failure is logged, and the API response includes `quotaSynced: false`
so a caller (or a human reading logs) can tell. As of Phase 11B, this
marker is no longer just left for later: `reconciliation.service.ts`'s
sweep retries every subscription still carrying a `null` here — see that
section below.

**`upgrade-plan` only ever accepts a $0 plan.** Any plan with `price > 0`
is rejected with a message pointing at `create-order`/`verify-payment`
instead — without that check, this endpoint would be a straightforward
way to get a paid plan for free.

**`cancel-subscription` takes effect immediately by default**, reverting to
the default (`Free`) plan and syncing quota down right away. As of Phase
11B, passing `{ atPeriodEnd: true }` in the request body instead schedules
the cancellation for the end of the current billing period rather than
applying it right away — see that section below for how the two differ
and when each fires.

**Currency and amounts:** `RAZORPAY_CURRENCY` (default `INR`) decides the
unit `Plan.price` gets converted into — Razorpay orders are created in the
smallest unit of that currency (paise for INR, cents for USD), computed as
`round(price * 100)`. `Plan.price` itself has no currency field of its own
(this app has only ever shown a bare `$` in `Pricing.tsx`), so this makes
that assumption explicit and overridable rather than silently picking one.

## Recurring billing & webhooks (Phase 11B)
Builds on Phase 11A's payment primitives without redesigning them —
`applyPlanChange` is still the one function every plan change goes
through, `Payment` is still the append-only ledger, `Subscription` is
still one row per user. This phase adds the asynchronous, recurring, and
failure-handling machinery Phase 11A explicitly deferred.

**`POST /api/webhooks/razorpay`** is the new surface — no `requireAuth`,
since Razorpay itself is the caller. Authenticated instead by
`X-Razorpay-Signature`, verified in `RazorpayService.verifyWebhookSignature`
against `RAZORPAY_WEBHOOK_SECRET` (a separate secret from
`RAZORPAY_KEY_SECRET`, configured in the Razorpay dashboard's Webhooks
section — subscribe at least `payment.captured`, `payment.failed`,
`refund.created`, `refund.processed`). Subscribe this URL to those events
for the lifecycle below to actually run.

**The route is mounted with `express.raw()`, ahead of the app-wide
`express.json()`, in `app.ts`.** Razorpay's webhook signature is computed
over the *exact* raw request bytes; letting `express.json()` parse the
body first and re-serializing it later isn't guaranteed to reproduce those
bytes (key order, whitespace, number formatting can all differ), which
would silently break verification. Every other route still gets the
parsed JSON body as before.

**Webhook processing is fully idempotent, at two layers:**
- **Transport level:** every delivery is recorded in a new `WebhookEvent`
  row, keyed by a SHA-256 hash of the exact raw body — not any field
  inside the payload itself, since Razorpay's payloads don't reliably
  carry a single unique event id across every event type. A delivery
  whose hash is already marked `PROCESSED` is skipped outright. One left
  at `RECEIVED` (a previous attempt crashed mid-processing) is retried.
- **Domain level:** the handlers underneath are themselves idempotent
  regardless of how far a previous attempt got —
  `paymentService.confirmPayment` (the webhook counterpart to Phase 11A's
  `verifyPayment`) short-circuits an already-`SUCCEEDED` payment exactly
  the way `verifyPayment` does; refund handling short-circuits an
  already-`REFUNDED` payment; a failed-payment notification for something
  already resolved is logged and ignored rather than acted on twice.

**`payment.captured` → `paymentService.confirmPayment`.** A new,
independent top-level flow (not a refactor of `verifyPayment`) that shares
`applyPlanChange` but skips checkout-signature verification (not
applicable to webhook payloads) and has no `userId` to check ownership
against (Razorpay isn't a logged-in user). Kept separate specifically so
`verifyPayment`'s already-tested Phase 11A behavior isn't disturbed by
webhook concerns it was never written to handle. This is also what makes
webhooks a genuine second confirmation path, not just an echo of
`verify-payment`: if a client never calls `verify-payment` at all (closed
tab, crashed app), the webhook alone is enough to confirm the payment and
apply the plan change.

**Subscription renewal is just repurchasing the same plan again**, not a
new concept — `createOrder`'s Phase 11A guard against repurchasing an
already-active plan now has a `RENEWAL_WINDOW_DAYS`-wide exception: within
that many days of `renewalDate` (or any time after it's already passed),
buying the plan you're already on is treated as a renewal rather than
rejected, and goes through the exact same `create-order` →
`verify-payment`/webhook flow as any other purchase — `applyPlanChange`'s
upsert extends `renewalDate` either way.

**`payment.failed` on a renewal → `Subscription.status = 'PAST_DUE'`.**
Only when the failed payment's plan matches the plan the user's currently-
`ACTIVE` subscription is actually on — a failed attempt to switch to a
*different* plan doesn't disturb whatever plan they're already
successfully on. `PAST_DUE` and `EXPIRED` both existed in `SubscriptionStatus`
since Phase 3/11A's schema but were never written to until this phase.

**`refund.created`/`refund.processed` → `Payment.status = 'REFUNDED'`,
and — if that payment is the one actually funding the user's *current*
subscription — reverts them to Free.** Refunding an old, already-superseded
payment (they upgraded again since) doesn't touch what they're on now. The
downgrade itself reuses `cancelSubscription`'s immediate-effect path
directly, rather than a third copy of "revert to Free."

**Cancellation at period end:** `cancel-subscription` now accepts
`{ atPeriodEnd: true }` in its body (defaulting to `false`, so every
existing caller keeps Phase 11A's immediate-effect behavior unchanged).
`true` sets `Subscription.cancelAtPeriodEnd` and changes nothing else —
same plan, same quota — until reconciliation (below) sees `renewalDate`
has passed and reverts them to Free then.

**Reconciliation (`reconciliation.service.ts`) is what actually acts on
`renewalDate`, `PAST_DUE`, and `quotaSyncedAt: null`** — three things the
rest of this system only ever leaves as markers. Exposed as
`POST /api/admin/reconcile-subscriptions` (admin-only) rather than run on
an in-process schedule: no scheduler dependency (e.g. `node-cron`) was
added, since an HTTP-triggered sweep is trivially schedulable from outside
(cron, a platform's own scheduled-job feature) without one. Each run:
1. **Due-for-renewal sweep:** `ACTIVE` subscriptions past `renewalDate`.
   `cancelAtPeriodEnd` ones revert to Free (via `cancelSubscription`,
   status `CANCELED`). Paid plans with no renewal payment recorded are
   marked `PAST_DUE` — a grace window, not an immediate downgrade. Free
   ($0) plans reaching their own `renewalDate` need no action.
2. **Grace-window sweep:** `PAST_DUE` subscriptions whose grace window
   (`PAST_DUE_GRACE_DAYS`) has itself elapsed with still no renewal
   payment are downgraded to Free via `expireSubscriptionToFree` — status
   `EXPIRED`, deliberately distinct from user-initiated `CANCELED`.
3. **Quota-sync retry sweep:** every subscription still carrying
   `quotaSyncedAt: null` gets its Nextcloud quota update retried.

**Every terminal state reuses `applyPlanChange`.** `cancelSubscription`
(immediate), `expireSubscriptionToFree`, and `confirmPayment` all funnel
through it, same as Phase 11A's `verifyPayment`/`upgradePlan` did —
Phase 11B adds new *callers* and new *statuses* (`EXPIRED`), never a
second way of changing a plan.

## Known gap: password reset is not end-to-end yet
`POST /api/auth/forgot-password` generates a reset token, stores its hash in
`password_reset_tokens`, and logs it — but there's no email transport
configured, and no `POST /api/auth/reset-password` route yet to consume the
token and actually change the password. Outside `NODE_ENV=production`, the
raw token is returned in the response body (`devToken`) so you can test the
flow manually via Prisma Studio or curl until a completion endpoint and a
real mailer (e.g. Resend, SES, Postmark) are wired up.
