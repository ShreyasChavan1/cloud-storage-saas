# Nimbus — Cloud Storage UI (through Phase 10)

Frontend for a Dropbox/Google Drive-style cloud storage app, backed by a
real Express API and real Nextcloud accounts over WebDAV — not dummy data.
Auth, file operations, the dashboard's storage/quota/file widgets, and (as
of Phase 10) a full admin dashboard are all live against `../backend`.
`src/data/dummyData.ts` is unused dead code at this point — nothing imports
it anymore; pricing plan marketing copy now lives in `src/data/plans.ts`.

## Stack
React 18 · Vite · TypeScript · Tailwind CSS · React Router 6 · React Query · Axios · Vitest + Testing Library · lucide-react icons

## Getting started
Requires `../backend` running first (see `backend/README.md` for its own
setup — Postgres, `.env`, and a reachable Nextcloud instance behind the
provisioning agent). Login/Register hit that API for real; there's no
dummy-latency simulation left in `AuthContext`.

```bash
npm install
npm run dev
```
Visit the printed local URL (default `http://localhost:5173`).

```bash
npm run build     # production build to /dist
npm run preview   # preview the production build
npm test          # vitest — dashboard stats, upload queue, drag-and-drop, admin dashboard
```

## Pages
| Route | Description |
|---|---|
| `/login`, `/register`, `/forgot-password` | Split-screen auth flow, branded right panel — real requests against the backend |
| `/dashboard` | Live storage ring + quota (`useQuota`), account-wide recent uploads and largest files (`useStorageStats`), quick upload, recent activity, upgrade card |
| `/files` | Grid/list toggle, real drag-and-drop upload, file & folder listing over WebDAV; `?view=favorites`/`?view=trash` show an honest "not available yet" state — no backend support for those views (or Shared) exists |
| `/settings` | Profile, security, appearance (dark mode), billing, notifications tabs |
| `/pricing` | Public plan comparison (static content, see `data/plans.ts`) |
| `/admin` | **Admin only** (Phase 10) — overview counts, searchable/paginated user list, create user |
| `/admin/users/:userId` | **Admin only** — one user's profile, storage usage + quota control, payments, active sessions, suspend/activate/delete/reset-password actions |
| `*` | 404 |

Admin routes redirect a signed-in non-admin back to `/dashboard` rather than
to `/login` (see `ProtectedRoute`'s `adminOnly` prop) — this is a UX
convenience only, not the actual security boundary. That boundary is the
backend's `requireAdmin` middleware; a non-admin poking these routes
directly never reaches a point where an admin API call is even attempted.

## Structure
```
src/
  api/          auth.ts, user.ts, files.ts, admin.ts — typed Axios clients for every backend route
  components/
    layout/     AuthLayout, AppLayout, Sidebar (live storage widget + admin link), Navbar
    ui/         Button, Input, Card, Badge, ProgressBar, StorageRing,
                DropdownMenu, ConfirmDialog, PromptDialog, ThemeToggle, Avatar, Logo
    dashboard/  StorageCard, QuickUpload, RecentFiles, LargestFiles, RecentActivity, UpgradeCard
    files/      EntryCard, EntryRow, UploadDropzone, FileMenu
    admin/      AdminUsersTable, CreateUserDialog, ResetPasswordDialog
  context/      AuthContext (real session handling, exposes `role`), ThemeContext,
                ToastContext, UploadQueueContext
  data/         plans.ts — legacy/static marketing data retained for non-billing UI. dummyData.ts is unused legacy code.
  hooks/        useQuota, useStorageStats, useFiles, useFileMutations,
                useAdminUsers, useAdminMutations — React Query wrappers around api/*
  lib/          api.ts (Axios instance + token/refresh interceptor), formatBytes.ts,
                getErrorMessage.ts, paths.ts
  pages/        Login, Register, ForgotPassword, Dashboard, Files, Settings, Pricing,
                NotFound, admin/AdminDashboard, admin/AdminUserDetail
```

## Dashboard data (Phase 9)
The dashboard's storage widgets are live, not hand-typed numbers:
- **Storage used/remaining, quota, percentage** — from `useQuota()` →
  `GET /api/files/quota`. Percentage and "remaining" are computed
  client-side from the raw `used`/`available` byte counts.
- **Total files, largest files, recent uploads** — from `useStorageStats()`
  → `GET /api/files/stats`, an account-wide WebDAV scan on the backend.
  This hook uses a 5-minute `staleTime` since that scan isn't cheap; file
  mutations (upload/delete/rename/move/copy) invalidate it explicitly so
  numbers still update promptly right after something changes.

See `src/components/dashboard/DashboardStats.test.tsx` for coverage.

## Admin dashboard (Phase 10)
`useAuth().user.role` gates the `/admin` UI entry points (nav link, routes)
client-side; the actual authorization boundary is the backend's
`requireAdmin` middleware (see `backend/README.md`'s Phase 10 section for
exactly what that checks and why).

- **`AdminUsersTable`** — search (debounced, 300ms — no shared debounce
  utility existed yet, so it's local to this one component), status
  filter, pagination, and per-row actions (reset password, suspend/
  activate, delete) via a `DropdownMenu` + the existing `ConfirmDialog`.
  Nothing here is a new dialog primitive except where the interaction
  genuinely doesn't fit the existing ones — quota adjustment reuses
  `PromptDialog` as-is (a single numeric-ish text field), suspend/
  activate/delete reuse `ConfirmDialog` as-is; only user creation and
  password reset got dedicated components, because both need multiple
  fields or a result screen that the existing dialogs don't support.
- **`AdminUserDetail`** — one user's profile, live storage usage (reusing
  the exact same `filesService`-backed data a user sees about themselves,
  just for someone else), quota control, payments (honestly empty until a
  payment gateway exists — see backend README), and active sessions with
  per-session revocation.
- Every mutation (`useAdminMutations.ts`) invalidates the users list and
  overview counts on success — these are small, infrequent admin actions,
  not a hot path worth hand-tuning cache invalidation for.

See `src/components/admin/AdminUsersTable.test.tsx` for coverage.

## Design system
- **Brand palette** uses Dalvi VaultGrid's teal/navy foundation with orange `accent-500 #FF6A00` for primary actions, on a white / `surface-50` base, with full dark mode via Tailwind's `class` strategy.
- **Type**: Manrope for headings, Inter for body/UI, JetBrains Mono available for data-dense contexts.
- **Cards**: rounded-2xl, soft two-layer shadows, 1px hairline borders — no harsh dividers.
- **Signature element**: the circular `StorageRing` gauge (dashboard, sidebar, admin user detail) instead of a plain progress bar, so storage always has a glanceable shape.

## What's still not wired up
- **Favorites, Trash, Shared** — no backend routes exist for any of these
  (Nextcloud's OCS Share API was never integrated); `Files.tsx` shows an
  honest empty state rather than pretending they work.
- **Recent activity** (`RecentActivity.tsx`) — there's no activity-log
  endpoint on the backend at all, so this card doesn't fabricate anything;
  it plainly says activity tracking isn't available yet.
- **Payments** — Razorpay Subscription Checkout is now wired into `Pricing.tsx`.
  The paid catalog is read from Razorpay through `GET /api/payments/plans`;
  displayed paid-plan names, prices and billing cadence therefore come from
  the provider rather than duplicated frontend constants. The backend maps
  the configured Razorpay Basic/Pro plan IDs to Nimbus entitlement records
  for storage/quota handling. Settings can schedule cancellation at the end
  of the current billing period.
- **Self-service password reset** — `forgot-password` issues a token but
  there's still no completion route or email transport (admin-driven reset,
  added in Phase 10, is a separate, already-working path).
- **`dummyData.ts` itself** is unused dead code at this point and could be
  deleted outright — nothing imports it anymore.



## Favorites

Favorites are persisted in Nimbus PostgreSQL per user. The UI supports starring/unstarring files and folders, a working Favorites view, and keeps favorite paths in sync when an item is renamed, moved, or deleted. Apply the included Prisma migration before starting the backend:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

## CCTV / NVR backup

Nimbus includes a production NVR gateway under `nvr-gateway/`. The customer installs it on a machine on the same LAN as the NVR. **Docker is not required.** Windows uses `install.ps1` and registers a startup task; Linux uses `install.sh` and registers a systemd service. The installer automatically installs Node.js and FFmpeg if needed.

The customer creates a gateway in **Settings → CCTV**, receives a one-time enrollment code, and enters only that code during gateway installation. NVR credentials, channels, RTSP URLs, and recording intervals are configured from Nimbus and delivered securely to the enrolled gateway over HTTPS.

The gateway pulls NVR channels over RTSP with FFmpeg, cuts configurable MP4 intervals, queues footage locally during outages, retries uploads, and uploads completed footage over HTTPS to the user's Nextcloud-backed Nimbus storage. The gateway exposes no public listening port.
