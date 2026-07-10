# Nimbus — Cloud Storage UI (Phase 1)

Frontend-only UI for a Dropbox/Google Drive-style cloud storage app. No backend,
no Nextcloud — every list, file, and stat you see is dummy data in
`src/data/dummyData.ts`. This is the foundation Phase 2 (Express + Nextcloud
API/WebDAV) will plug into.

## Stack
React 18 · Vite · TypeScript · Tailwind CSS · React Router 6 · React Query · Axios (installed, unused until Phase 2) · lucide-react icons

## Getting started
```bash
npm install
npm run dev
```
Visit the printed local URL (default `http://localhost:5173`). Login/Register
accept any values — they simulate network latency, then log you in and drop
you on the Dashboard.

```bash
npm run build     # production build to /dist
npm run preview   # preview the production build
```

## Pages
| Route | Description |
|---|---|
| `/login`, `/register`, `/forgot-password` | Split-screen auth flow, branded right panel |
| `/dashboard` | Welcome header, storage ring, quick upload, recent files/activity, upgrade card |
| `/files` | Grid/list toggle, drag-and-drop zone, file & folder cards, `?view=` for shared/favorites/trash |
| `/settings` | Profile, security, appearance (dark mode), billing, notifications tabs |
| `/pricing` | Public plan comparison |
| `*` | 404 |

## Structure
```
src/
  components/
    layout/     AuthLayout, AppLayout, Sidebar, Navbar
    ui/         Button, Input, Card, Badge, ProgressBar, StorageRing,
                DropdownMenu, ThemeToggle, Avatar, Logo
    dashboard/  StorageCard, QuickUpload, RecentFiles, RecentActivity, UpgradeCard
    files/      EntryCard, EntryRow, UploadDropzone, FileMenu
  context/      AuthContext (dummy), ThemeContext (persisted dark mode)
  data/         dummyData.ts — single source of truth for all mock content
  pages/        Login, Register, ForgotPassword, Dashboard, Files, Settings, Pricing, NotFound
```

## Design system
- **Accent** `brand-500 #3B6FF6` on a white / `surface-50` base, full dark mode via Tailwind's `class` strategy.
- **Type**: Manrope for headings, Inter for body/UI, JetBrains Mono available for data-dense contexts.
- **Cards**: rounded-2xl, soft two-layer shadows, 1px hairline borders — no harsh dividers.
- **Signature element**: the circular `StorageRing` gauge (dashboard + sidebar storage card) instead of a plain progress bar, so storage always has a glanceable shape.

## Wiring up Phase 2
`AuthContext` and the dummy data module are the only places that simulate a
backend. When the Express API is ready, swap `AuthContext`'s `login`/`register`/`logout`
for real Axios calls and replace `dummyData.ts` reads with React Query hooks
hitting your API — the components themselves don't need to change shape.
