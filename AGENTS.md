# Bobo - Bird Tracker

> **Agent Reminder**: Always refer to this `AGENTS.md` file before starting any task. It contains the project's architecture, conventions, testing policy, and current status. After completing work, update this file to reflect changes — especially the **Completed Actionables** and **TODO** sections.

This is an AI coding agent reference for the Bobo project. Bobo is a mobile-first Progressive Web App (PWA) for bird owners to log daily weights and health observations. The target release platform is **Telegram Mini App (WebApp)**.

## Project Overview

- **Name**: `bobo-bird-tracker`
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (base-nova style, neutral base color)
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **State Management**: TanStack Query (React Query) with staleTime 60s
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod v4
- **Offline Storage**: IndexedDB via `idb` library
- **PWA**: `next-pwa` generates service worker into `public/`
- **Themes**: `next-themes` with light/dark/system support

## Project Structure

```
app/
  (app)/            # Protected pages (dashboard, birds, log, settings)
    birds/[id]/     # Bird detail with weight chart, edit dialog, archive, timestamps
    dashboard/      # Main flock view with combined chart, streak counter, bird cards (TanStack Query)
    flock/          # Flock management: members list, invite generation, role-based UI
    flock/create/   # Standalone flock creation page
    log/quick/      # Quick weight log — single or multi-bird compact layout
    log/full/       # Full observation log with photo upload
    settings/       # Preferences, export/import, reorder birds, archived birds, danger zone
    layout.tsx      # App shell via AppShell client component
    loading.tsx     # Route-level loading skeleton
    error.tsx       # Error boundary for app routes
  (auth)/           # Unauthenticated pages
    login/          # Email/password, magic link, demo mode (gated by NEXT_PUBLIC_ENABLE_DEMO)
    onboarding/     # 5-step bird creation wizard
    error.tsx       # Error boundary for auth routes
  api/auth/callback/# OAuth code exchange handler
  api/auth/telegram/# Telegram WebApp initData validation (HMAC-SHA256)
  api/flock/invite/ # POST to create flock invite links
  api/flock/invite/accept/ # POST to accept invite and join flock
  api/health/       # Health check endpoint (DB connectivity)
  invite/[token]/   # Public invite acceptance page (validates token, shows flock info, joins on click)
  layout.tsx        # Root layout with Inter font, Providers, PWA manifest, Sonner Toaster, ErrorBoundary
  page.tsx          # Root redirect (login → dashboard)
  globals.css       # Tailwind directives + CSS variables (emerald primary)
components/
  ui/               # shadcn/ui primitives (button, card, input, etc.)
  ui/safe-image.tsx # next/image wrapper with data-url fallback
  birds/            # BirdCard, EmptyBirdState, StreakCounter, WeightAlert
  charts/           # WeightChart, MiniSparkline, CombinedWeightChart (Recharts wrappers)
  layout/           # BottomNav, SyncIndicator, DemoBanner, Providers, ReminderBanner, ErrorBoundary
  layout/app-shell.tsx        # Client wrapper: Telegram detection, conditional BottomNav, theme sync, hydration-safe mount
  layout/telegram-shell.tsx   # TelegramThemeSync + TelegramSafeArea (calls init() before SDK methods)
  layout/telegram-provider.tsx # TelegramProvider with getServerSnapshot fallbacks for SSR
  layout/error-boundary.tsx   # Global error boundary showing actual error message + stack trace
  auth/             # TelegramAuthButton with auto-auth + initData fallback logic
lib/
  supabase/
    client.ts       # Browser Supabase client (falls back to mock in demo)
    server.ts       # Server Component Supabase client (cookie-based)
    middleware.ts   # Session refresh in Next.js middleware
    mock-client.ts  # Full mock client using localStorage for demo mode
  telegram/
    webapp.ts       # Typed wrapper for window.Telegram.WebApp API
    hooks.ts        # React hooks: useTelegramWebApp, useTelegramTheme, useTelegramBackButton, etc.
  db/
    offline-queue.ts # IndexedDB queue for offline log persistence + auto-flush
  hooks/
    use-weight-unit.ts # Reads profile weight_unit preference
    use-birds.ts    # TanStack Query hooks: useBirds, useLogs, useProfile, useUpgradeToPro
    use-flock.ts    # TanStack Query hooks: useFlockData, useCreateInvite
    use-dashboard-data.ts # useDashboardData, useProfile, useInvalidateAppData (cache invalidation helpers)
  toast.ts          # Toast + confirmDialog utility (sonner + Telegram native fallback)
  utils.ts          # cn(), formatWeight(), formatDate(), formatTime(), calculateStreak(), etc.
  utils/photo.ts    # Demo photo URL helpers
startup.sh          # One-command demo server startup (install deps, env, dev server)
types/
  database.ts       # Hand-written TypeScript types for all Supabase tables
supabase/
  migrations/001_initial_schema.sql  # Complete schema + RLS + seed data
test/
  setup.ts          # Vitest setup: jest-dom, fake-indexeddb, matchMedia/observer mocks
e2e/
  demo.spec.ts      # Playwright E2E tests covering demo mode flows
.github/
  workflows/ci.yml  # GitHub Actions: lint, unit tests, build, E2E tests
public/
  manifest.json     # PWA manifest
  icons/            # App icons (generated from icon.svg)
  sw.js             # Generated by next-pwa
```

## Technology Stack Details

### Next.js Configuration
- `next.config.mjs` wraps the app with `next-pwa` (dest: `public`, disabled in development).
- `reactStrictMode: true`.
- Path alias `@/*` maps to the project root.

### TypeScript Configuration
- `tsconfig.json` excludes `test/`, `e2e/`, `**/*.test.{ts,tsx}`, `vitest.config.ts`, and `playwright.config.ts` from the Next.js build.
- Strict mode enabled.

### Tailwind / shadcn/ui
- Tailwind config uses CSS variables for theming (`hsl(var(--primary))`, etc.).
- Primary color is emerald (`160 84% 39%`).
- `components.json` configures shadcn/ui with the `base-nova` style, `lucide` icons, and aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.

### Supabase / Auth
- Uses `@supabase/ssr` for cookie-based session management in both server and middleware contexts.
- Auth methods: email/password, magic link (OTP), OAuth callback.
- **Telegram auth**: When launched inside Telegram, the app reads `window.Telegram.WebApp.initData` and validates the HMAC-SHA256 signature server-side via `/api/auth/telegram`.
- **Demo mode**: If `NEXT_PUBLIC_SUPABASE_URL` is missing or contains "placeholder", the app falls back to a mock client (`lib/supabase/mock-client.ts`) that stores data in `localStorage`. The demo button is additionally gated by `NEXT_PUBLIC_ENABLE_DEMO=true`.

### Database Schema
Key tables (all with RLS enabled and user-isolation policies):
- `profiles` — extends `auth.users`, stores preferences (`weight_unit`, `timezone`, `theme`, `reminders_enabled`, `is_pro`, `avatar_url`, `telegram_id`, `username`).
- `species` — lookup table seeded with 18 bird species.
- `birds` — bird profiles with avatar colors, `sort_order`, status (`active`/`monitoring`/`deceased`), weight tracking.
- `daily_logs` — weight & health observations (quick/full log types). Supports multiple logs per day via `logged_at` timestamp.
- `medications` / `medication_logs` — medication tracking.
- `egg_logs` — egg laying records.
- `reminders` — user-configurable reminders.
- `telegram_auth` — stores random passwords for Telegram-authenticated users (service-role only).

### Offline Strategy
- `lib/db/offline-queue.ts` uses IndexedDB (`idb`) to queue logs when `navigator.onLine` is false.
- When online, quick/full log pages try Supabase `insert` first; on error they fall back to the queue.
- `SyncIndicator` automatically flushes the offline queue when the browser comes back online, with exponential backoff via `retry_count`.
- `flushOfflineQueue()` inserts queued logs via Supabase and shows toast notifications for success/failure counts.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# One-command demo server startup
./startup.sh

# Production build
npm run build

# Start production server
npm run start

# Lint (ESLint)
npm run lint
```

### Running Tests

```bash
# Unit tests (Vitest + jsdom)
npm run test:unit

# E2E tests (Playwright — auto-starts dev server)
npm run test:e2e
```

### Environment Variables

Create `.env.local` from `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If these are missing or set to placeholder values, the app automatically runs in **demo mode** using `localStorage` instead of Supabase.

### Database Setup

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor. This creates:
- All tables with RLS policies
- Auth trigger (`handle_new_user`) to auto-create profiles
- 18 species seed rows
- `create_demo_bird(p_user_id)` function that seeds a demo Cockatiel with 14 days of logs

**Schema changes not in migration** (hand-written `types/database.ts` is source of truth):
- `profiles.is_pro` — boolean, default false
- `birds.sort_order` — integer, default 0, controls display order
- `daily_logs.logged_at` — ISO timestamp, tracks exact log time for multiple-logs-per-day support

## Code Style Guidelines

- **Language**: TypeScript with strict mode.
- **Client components**: Marked with `"use client"` at the top.
- **Dynamic exports**: Some auth/onboarding pages export `dynamic = "force-dynamic"` to opt out of static generation.
- **Component styling**: Tailwind utility classes. Use `cn()` from `@/lib/utils` for conditional class merging.
- **Colors**: Follow the existing emerald/slate palette. Dark mode variants use `dark:` prefixes.
- **Layout**: Mobile-first, content constrained to `max-w-md mx-auto`.
- **Icons**: Use `lucide-react`.
- **Forms**: Use React Hook Form + Zod for validation when appropriate. Simple forms may use controlled `useState`.
- **Data fetching in client components**: **Use TanStack Query hooks** from `@/lib/hooks/use-birds` instead of raw `useEffect` + `createClient()`. This provides caching, background refetching, and error handling.
- **Mutations**: Use `useMutation` with `invalidateQueries` to refresh related data after writes.
- **User feedback**: Use `toast()` from `@/lib/toast` instead of `alert()`. Use `confirmDialog()` instead of `confirm()`.
- **Telegram integration**: Use hooks from `@/lib/telegram/hooks` for WebApp features (theme, viewport, haptics, back button).
- **Type casting**: Some Supabase query results are cast with `as unknown as Type` due to the hand-written `Database` types not being generated from the schema.

## Testing Strategy

- **Unit tests**: Vitest with jsdom, `@testing-library/react`, and `@testing-library/jest-dom`.
  - `test/setup.ts` mocks `window.matchMedia`, `IntersectionObserver`, and `ResizeObserver`.
  - `fake-indexeddb` provides IndexedDB in tests.
  - Example tests: `lib/utils.test.ts`, `lib/db/offline-queue.test.ts`, `components/birds/bird-card.test.tsx`, `app/(auth)/login/page.test.tsx`.
- **E2E tests**: Playwright (`playwright.config.ts`) tests against Chromium on `http://localhost:3000`.
  - Tests focus on the demo mode user journey: login → dashboard → bird detail → quick log → settings.
  - Dev server is started automatically by Playwright via `webServer` config.

## Key Conventions for Agents

1. **Route groups**: `(app)` contains all authenticated pages sharing the app shell layout. `(auth)` contains login/onboarding with a different layout.
2. **Middleware auth**: `middleware.ts` checks the Supabase session, redirects unauthenticated users to `/login`, and redirects authenticated users away from `/login` to `/dashboard`.
3. **Demo mode awareness**: Any code that creates or mutates data must work with both real Supabase and the mock client. The mock client stores data in localStorage under keys prefixed with `bobo_demo_`.
4. **Bird limit**: MVP enforces a 2-bird limit for free users. Pro users (`profiles.is_pro`) can add unlimited birds. Upgrade button appears on dashboard and settings when limit is reached.
5. **Streak calculation**: `calculateStreak()` in `lib/utils.ts` counts consecutive days with at least one log across all birds. If today is not logged, it starts counting from yesterday.
6. **Date handling**: `getTodayInTimezone()` uses `Intl.DateTimeFormat` with `en-CA` locale to produce `YYYY-MM-DD` strings in the user's timezone. Log timestamps are stored in `logged_at` (ISO 8601) and displayed via `formatTime()`.
7. **Weight units**: Support grams (`g`) and ounces (`oz`). Default is grams.
8. **Bird ordering**: `birds.sort_order` controls dashboard card order, quick log display order, and settings reorder list. Always query active birds with `.order("sort_order", { ascending: true })`. New birds get `sort_order = existingBirds.length` (append to end).
9. **PWA assets**: Do not manually edit `public/sw.js` or `public/workbox-*.js` — they are generated by `next-pwa` at build time.
10. **Recharts tooltip formatter types**: The `formatter` prop is finicky with explicit TypeScript types. Leave parameters untyped (inferred as `ValueType`) rather than annotating as `number` or `string`.
11. **Research before implementing**: When the user asks for suggestions on how to fix a problem or implement a feature, search online for how others are solving it. Then pitch the approach with its pros and cons, plus alternatives. Do **not** implement until the user approves a specific direction.

## Completed Features

- [x] **Photo upload** — Full log form supports photo upload with client-side compression (max 1200px, JPEG quality 0.8). Demo mode stores photos as base64 in localStorage via mock storage. Bird detail page displays photos under recent logs. Max 3 photos per bird enforced.
- [x] **Weight alerts** — Banner is wired up on `/birds/[id]`; shows when current weight deviates >5% from 7-day average.
- [x] **Bird editing** — Edit dialog on `/birds/[id]` allows changing name, species, and target weight.
- [x] **Archive / restore / delete** — Archived birds appear in Settings under "Archived Birds" with Restore and Delete (permanent) buttons.
- [x] **Reminder notifications** — In-app banner on dashboard when reminders are enabled, it's not quiet hours, and a bird is missing today's log. Dismissible with a direct link to quick log.
- [x] **Data import/export** — CSV export and import buttons in Settings. Supports Date, Bird Name, Weight, Status, and Observations columns. Import matches bird names to existing birds.
- [x] **Account deletion** — In demo mode, clears all `bobo_demo_*` localStorage keys before signing out.
- [x] **PWA icons** — PNG icons generated from `icon.svg` for all manifest sizes (72×72 through 512×512).
- [x] **Pro upgrade (demo)** — `profiles.is_pro` unlocks unlimited birds. Upgrade button sets `is_pro = true` directly in demo mode.
- [x] **Multiple logs per day** — `daily_logs.logged_at` timestamp allows morning, afternoon, and evening logs. Quick and full log pages use `insert` instead of `upsert`.
- [x] **Combined dashboard chart** — `CombinedWeightChart` shows all active birds' weight trends on a single multi-line chart above the bird cards.
- [x] **Bird reordering** — `birds.sort_order` field controls dashboard/card display order. Users can reorder active birds in Settings via up/down arrows.
- [x] **Compact quick log** — Multi-bird layout puts weight input and status emoji buttons on a single compact row per bird. No per-bird notes in quick log (use full log for notes). Global unit toggle is a small segmented control.
- [x] **Log timestamps** — Bird detail page shows `formatTime(logged_at)` next to each log entry.
- [x] **Edit historical logs** — Each log entry on the bird detail page has an edit button (pencil icon) that opens a dialog to modify date, weight, status, and observations. Changes are saved via `daily_logs.update(...).eq("id", logId)` and reflected immediately in the local state.
- [x] **Add retroactive logs** — "Add Log" button on the bird detail page opens a dialog with a date picker (any past date), weight, status, and observations. Saves via `insert` so multiple logs per day are supported.
- [x] **Delete historical logs** — Each log entry has a delete button (trash icon) with a confirmation dialog. Deletes via `daily_logs.delete().eq("id", logId)` and updates local state immediately.
  - *Test*: Go to a bird detail page (`/birds/[id]`), click the trash icon next to a log, confirm deletion. The log should disappear immediately without a page refresh.
- [x] **Flock sharing** — Share birds with family/vets via invite links. 3 roles (owner/admin/member). 24h expiry single-use invites.
  - *Pages*: `/flock` (management), `/flock/create` (create new flock), `/invite/[token]` (accept invite).
  - *Test*: Go to `/flock`. As owner, click "Generate Invite Link". Copy the link. In a different browser/incognito, open the invite link and click "Join Flock". Return to original user's dashboard — both should see the same birds.
  - *API*: `POST /api/flock/invite` (create invite), `POST /api/flock/invite/accept` (join flock).
  - *Cache invalidation*: After create/join/accept, `invalidateFlock()` and `invalidateDashboard()` are called so the UI updates immediately without stale data.
- [x] **Dashboard empty state** — New users with no birds see "Create Your Flock" and "Join a Flock" choices instead of being forced to onboarding.
  - *Test*: Log in as a new user with no birds. Go to `/dashboard`. Tap "Create Your Flock" → `/flock/create`. Or paste an invite link/token to join an existing flock.
- [x] **Dashboard daily status summary** — Hero card at the top of `/dashboard` showing which birds have been logged today (green check) and which still need logging (prominent CTA). Appears above the combined chart.
  - *Test*: Go to `/dashboard`. If all birds are logged today, see a green "All caught up!" card. If a bird needs logging, see an amber card listing birds with "Log" buttons. Clicking "Log" opens the inline quick log sheet.
- [x] **Simplify BirdCard actions** — Removed the 3-button grid (View / Quick Log / Full) from each `BirdCard`. The entire card is now tappable to navigate to `/birds/[id]`. A small "+" button appears on birds that haven't been logged today.
  - *Test*: Go to `/dashboard`. Tap anywhere on a bird card to open its detail page. Birds missing today's log show a green "+" circle in the top-right; tapping it opens the inline quick log sheet.
- [x] **Inline quick log bottom sheet** — Replaced full-page navigation to `/log/quick` with a `shadcn/ui` Sheet (bottom drawer) that slides up from the dashboard. Uses the existing `MultiBirdLog` / `SingleBirdLog` compact forms. After saving, the sheet closes and the dashboard refreshes without a page redirect.
  - *Test*: Go to `/dashboard`. Trigger the sheet by either: (1) clicking "Log" on a pending bird in the Daily Status Summary, (2) clicking the "+" on a BirdCard, or (3) clicking "Log All Birds". The sheet slides up from the bottom. Enter a weight, pick a status, tap "Save Log". Expect: a success toast appears, the sheet animates closed, and the dashboard updates (daily status turns green, bird card weight updates).
- [x] **Multi-bird status buttons with labels** — In the compact quick log form, replaced 3 tiny emoji circles (no visible labels) with labeled pill buttons on a dedicated row below the weight input.
  - *Test*: Open the inline quick log sheet (or `/log/quick` page) with 2+ birds. Each bird entry shows the weight input on its own row, and below it a row of 3 labeled pill buttons: "😊 Normal", "🤔 Off", "😟 Bad". Tapping a button highlights it with the emerald border.
- [x] **Telegram fullscreen mode** — Auto-requests fullscreen via `viewport.requestFullscreen()` on SDK init (Bot API 8.0+). Exposes `isFullscreen` in `TelegramContext`. Adds Enter/Exit Fullscreen toggle in Settings → Telegram section.
  - *Test*: Open the app inside Telegram on a client that supports fullscreen (Telegram iOS/Android 11.5+). The app should expand to fill the entire screen, hiding the Telegram header. Go to Settings → Telegram, tap "Exit Fullscreen" and "Enter Fullscreen" to toggle.
- [x] **Telegram home screen shortcut** — Checks `homeScreenStatus` via `checkHomeScreenStatus()` after SDK init. Shows "Add to Home Screen" button in Settings → Telegram when status is `missed` or `unknown`. Uses `addToHomeScreen()` to prompt the native dialog.
  - *Test*: Open the app inside Telegram on iOS/Android. Go to Settings → Telegram. If the shortcut is not yet added, tap "Add to Home Screen" and confirm the native dialog. Re-open the app and return to Settings; the button should now read "Added to home screen".
- [x] **Telegram close button safe padding** — `AppShell` enforces a minimum `48px` left padding (`Math.max(48, contentSafeAreaInsets.left)`) when running inside Telegram. The SDK's `contentSafeAreaInsets` only covers system notches, not Telegram's native Close (×) button overlay in fullscreen mode. This prevents page headers and content from being obscured.
  - *Test*: Open the app inside Telegram in fullscreen mode. The dashboard title ("Your Flock") and bird detail page titles should no longer overlap with the native close button. Content should start at least ~48px from the left edge.

## TODO

### UI/UX

- [ ] **Last weight hint in quick log** — Show each bird's `current_weight` (last logged weight) as helper text below the weight input, e.g. "Last: 95g · Target: 98g". This helps users catch typos (e.g. 59g vs 95g) and provides useful context without remembering yesterday's reading.
- [ ] **Success toast + haptic feedback on log save** — After saving a quick log, show a brief toast like *"Bobo logged: 96g ✓"*. If running inside Telegram WebApp, trigger `HapticFeedback.notificationOccurred('success')`. Currently the app silently redirects to dashboard which feels abrupt.
- [ ] **Collapsible Full Log sections** — The Full Log form (`/log/full`) is very long (Weight → General Status → Droppings → Observations). Make the "Droppings" and "Observations" sections collapsible accordion panels that start collapsed. Add helper text: "Expand for detailed droppings tracking (useful for vet visits)." Most daily users only need Weight + Status.
- [ ] **Bottom nav center action button** — Replace the bottom nav's text-based "Log" tab with a prominent center circular "+" FAB (floating action button). Tapping it opens the inline quick log sheet. This follows common mobile patterns (Strava, Instagram) and makes the primary action instantly accessible. Tabs become: Home | [+] | Settings.
- [ ] **Lazy-load Recharts** — Code-split `CombinedWeightChart`, `WeightChart`, and `MiniSparkline` using `next/dynamic` + `ssr: false` so charting libraries don't block the initial dashboard render. Improves time-to-interactive on mobile.

### Telegram MiniApp Integration (P0)

> **Status**: **DEPLOYED AND LIVE** on Vercel. The app is fully functional as a Telegram Mini App with auto-authentication, theme sync, and safe-area handling. The remaining work below is **polish** (native buttons, haptics) rather than blockers.

**Completed**:
- ✅ SDK initialization (`init()`, `ready()`, `expand()`)
- ✅ Theme sync (`TelegramThemeSync` + `next-themes` integration)
- ✅ Safe area handling (`contentSafeAreaInsets` applied via inline styles)
- ✅ Conditional BottomNav (hidden in Telegram)
- ✅ Auto-authentication via `initData` with server-side HMAC validation
- ✅ `getServerSnapshot` fallbacks in `TelegramProvider` for SSR
- ✅ `ErrorBoundary` catches runtime errors (e.g., SDK race conditions)
- ✅ Hydration mismatch fixed in `AppShell` with `mounted` state
- ✅ `initData` fallback chain (`initData` → `initDataUnsafe` → URL params)

**Remaining polish**:
- [ ] **Native BackButton on all non-root pages** — Wire up `useTelegramBackButton()` when `isInTelegram` is true. Hide custom `<ArrowLeft>` back arrow in Telegram.
- [ ] **Native MainButton on all primary action forms** — Wire up `useTelegramMainButton()` for primary actions (Save Log, Add Bird, etc.). Hide custom sticky submit buttons in Telegram.
- [ ] **Haptic feedback on key interactions** — Wire up `useTelegramHaptics()` for save/delete/error actions.
- [ ] **Closing confirmation on unsaved forms** — Wire up `useTelegramClosingConfirmation()` on Quick Log, Full Log, and edit dialogs.
- [ ] **Viewport-aware layout** — Use `useTelegramViewport()` to handle virtual keyboard resizing in forms.
- [ ] **Keyboard-aware input attributes** — Add `inputMode="decimal"` and `pattern="[0-9]*"` to all weight inputs.
- [ ] **End-to-end Telegram WebApp testing** — Add Playwright test covering Telegram auth flow.

### Features

- [ ] **Real-time sync** — Subscribe to Supabase realtime changes so dashboard updates when logs are added on another device.
- [ ] **Medication tracking** — `medications` and `medication_logs` tables exist but no UI to add/manage meds or log administrations.
- [ ] **Custom fields builder** — `daily_logs.custom_fields` (JSONB) exists but no UI to define or render user-created fields.
- [ ] **Egg logging UI** — `egg_logs` table exists but only has a simple placeholder; no full egg/clutch tracking UI.
- [ ] **Telegram Stars payments** — Replace hardcoded Pro upgrade with Telegram Stars in-app purchases.

### Backend / DevOps

- [ ] **Generated Supabase types** — `types/database.ts` is hand-written. Should be generated from the schema via `supabase gen types`.
- [ ] **Rate limiting** — Add API-level rate limiting on log creation, CSV import, and auth endpoints.
- [ ] **Sentry error tracking** — Integrate `@sentry/nextjs` for production error monitoring.
- [ ] **Bird limit RLS enforcement** — Enforce 2-bird limit in Postgres trigger/RLS, not just UI.

### Bugs / Quality

#### Active Bugs (P0 — Fix before release)

All P0 bugs have been resolved. See Fixed Bugs below.

#### Fixed Bugs

- [x] **Schema mismatch on fresh installs** — `001_initial_schema.sql` previously created the `birds` table without `flock_id`, but all app queries filter by `flock_id`. Fresh databases failed with "column birds.flock_id does not exist".
  - *Fix applied*: Updated `001_initial_schema.sql` to:
    1. Create `flocks` and `flock_members` tables **before** `birds` (to satisfy the foreign key reference).
    2. Add `flock_id UUID REFERENCES flocks(id)` to the `birds` table.
    3. Update `handle_new_user` trigger to create a default flock + flock_members row on signup.
    4. Update `create_demo_bird` function to look up the user's flock and insert with `flock_id`.
    5. Add `idx_birds_flock_id` index.
  - *Test*: Build passes (`npm run build`). All 86 unit tests and 10 E2E tests pass.

- [x] **`/flock` empty state "Join a Flock" button is useless** — The empty state redirected to `/dashboard`, but users with birds had no join UI there.
  - *Fix applied*: Replaced the redirect button with an inline invite token input form (matching `EmptyBirdState`) that extracts tokens from pasted URLs and navigates to `/invite/[token]`.
  - *Test*: E2E tests cover the invite acceptance flow. Build passes.

- [x] **Onboarding missing flock cache invalidation** — After onboarding created a default flock, `[FLOCK_KEY]` cache was stale for up to 30s.
  - *Fix applied*: Imported `useQueryClient` and `FLOCK_KEY` in `onboarding/page.tsx`, then called `queryClient.invalidateQueries({ queryKey: [FLOCK_KEY] })` before redirecting to `/dashboard`.
  - *Test*: Build passes. Unit tests pass.

- [x] **Duplicate flock UI in Settings** — Settings had a full flock management section duplicating `/flock` with raw `fetch()`, untested logic, and missing cache invalidation.
  - *Fix applied*: Removed the duplicate invite generation, member list, and member removal UI from `settings/page.tsx`. Replaced with a lightweight summary card using `useFlockData` that shows flock name, role, member count, and a "Manage Flock" link to `/flock`.
  - *Test*: Build passes. E2E settings page test passes.

- [x] **Settings flock invite sends wrong flock_id** — `settings/page.tsx` previously sent `membership.id.split("-")[0]` (a truncated flock_members row UUID) instead of the actual `flockId`. This caused invite generation to always fail with a 404/403. **Fixed earlier**: The `handleGenerateInvite` function now correctly uses the `flockId` state variable.

#### Remaining Quality Issues

- [ ] **Zod validation on all forms** — Quick log, full log, edit bird, edit log, add retroactive log. Currently most forms use controlled `useState` without validation. Weight inputs accept negative numbers and empty strings. This is a broader refactor tracked for Sprint 3.

## Known Issues

- **Mock client nested queries** — The demo-mode mock client does not support Supabase nested relation queries (e.g. `birds(daily_logs(log_date, weight))`). Any code that relies on joined data must guard with `?? []` or optional chaining. Settings export was rewritten to fetch bird names in a separate query to avoid this.
- **Mock client `.select()` chaining** — The mock client's `insert`, `update`, and `delete` methods return plain Promises, not chainable Postgrest builders. Do **not** chain `.select()`, `.single()`, `.order()`, etc. after these methods in code that must work in demo mode. Construct the returned data manually or re-fetch in a separate query.
- **Theme hydration mismatch** — `next-themes` can cause a brief flash of incorrect theme on initial load before client-side hydration settles the class. Using `suppressHydrationWarning` on `<html>` mitigates this but does not eliminate the flash.
- **Telegram SDK initData missing** — Some Telegram clients do not pass `initData` via `window.Telegram.WebApp.initData`. The app now falls back to `initDataUnsafe` and URL params, but if all sources are empty, users must click "Continue with Telegram" manually.
- **Hardcoded demo credentials** — `login/page.tsx` contains hardcoded `demo@example.com` / `demo` for demo mode. These are gated by `isDemoEnabled` but remain in source code.
- **Telegram auth user lookup mismatch** — Old accounts may have `telegram_id` stored as a string in `user_metadata`, but new logins compared it as a number using `===`. This caused a new empty account to be created on every login. **Fixed**: `String()` coercion + email fallback in `/api/auth/telegram`.
  - *Recovery*: If you have multiple empty accounts, delete them from Supabase Auth dashboard. The next login will match the old account by email.
- **Flock RLS self-referential policies** — Original `002_flock_sharing.sql` used recursive subqueries in `flock_members` RLS that caused rows to be hidden in some PostgreSQL configurations. **Fixed** by `003_fix_flock_rls.sql` which replaces them with simpler non-recursive policies.
- **Debug endpoint available** — `/api/debug/user-data` (POST with `Authorization: Bearer <token>`) and `/debug` page help diagnose auth/data visibility issues in production.
- ** birds.flock_id missing from 001_initial_schema.sql (P0)** — **Fixed**: `001_initial_schema.sql` now creates `flocks` and `flock_members` before `birds`, includes `flock_id UUID REFERENCES flocks(id)`, and the `handle_new_user` trigger creates a default flock on signup.
- **`/flock` empty state Join button (P1)** — **Fixed**: The empty state now has an inline invite token input form instead of redirecting to `/dashboard`.
- **Onboarding flock cache invalidation (P1)** — **Fixed**: Onboarding now invalidates `[FLOCK_KEY]` via `useQueryClient` before redirecting.
- **Duplicate flock UI (P1)** — **Fixed**: Settings flock management UI has been replaced with a lightweight summary card linking to `/flock`.
- **Settings flock_id bug (P0)** — **Fixed**: Settings `handleGenerateInvite` now correctly uses the `flockId` state variable.

## Testing & Regression Policy

Every new feature, bug fix, or behavior change must include test coverage. This prevents regressions in demo mode and ensures the mock client stays in sync with real Supabase behavior.

- **Unit tests** (`npm run test:unit`): Add tests for new utilities, hooks, or mock-client behavior.
  - Current coverage: 86 tests across 11 files (mock client, hooks, API routes, components, utils, offline queue).
  - Flock-specific tests: `lib/supabase/mock-client.test.ts` (flock/flock_members/flock_invites), `app/api/flock/invite/route.test.ts` (7 tests), `app/api/flock/invite/accept/route.test.ts` (8 tests), `lib/hooks/use-birds.test.tsx` (7 tests), `lib/hooks/use-flock.test.tsx` (3 tests), `app/(app)/flock/page.test.tsx` (4 tests).
- **E2E tests** (`npm run test:e2e`): Add Playwright steps for new UI flows (e.g., opening a dialog, filling a form, asserting state change).
- **Mock client parity**: If a feature uses a Supabase method not yet implemented in the mock client (e.g., `.update()` on a new table, `.select()` chaining), extend the mock client **before** or alongside the feature implementation.
- **Run both suites before committing**: `npm run build && npm run test:unit && npm run test:e2e`.
- **Check port 3000 before E2E tests**: Playwright starts its own dev server on port 3000. If a previous `npm run dev` or build process is still running, E2E tests will fail with timeout errors on `page.waitForURL()`. Always run `lsof -ti:3000 | xargs kill 2>/dev/null` (or check `lsof -i:3000`) before running E2E tests locally.
- **CI/CD**: GitHub Actions runs lint, unit tests, build, and E2E tests on every push/PR. Merges are blocked if any step fails.
- **Document test steps after every task**: When marking a TODO item as complete, add a "How to test / verify" note right below the completed feature. Explain: what UI elements changed, what the user should click/tap, and what the expected behavior is. This helps the user (and future agents) validate the work without re-reading the code. Example format:
  ```
  - [x] **Feature name** — Brief description.
    - *Test*: Go to `/dashboard`, click X, expect Y.
  ```

## Deployment Readiness Checklist

> **Goal**: Deploy Bobo v1.0 as a Telegram Mini App on a cloud hosting provider.

### Environment Requirements

Before deploying, ensure the following environment variables are set in your hosting platform:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional
NEXT_PUBLIC_ENABLE_DEMO=false   # NEVER enable in production
```

### Pre-Deploy Checklist

| Step | Action | Status |
|------|--------|--------|
| 1 | Run `supabase/migrations/001_initial_schema.sql` in your Supabase project | Required |
| 2 | Configure Telegram Bot via @BotFather: `/setmenubutton` with your app URL | Required |
| 3 | Set all environment variables in hosting platform | Required |
| 4 | Verify build passes: `npm run build` | Required |
| 5 | Run tests: `npm run test:unit && npm run test:e2e` | Required |
| 6 | Verify `/api/health` returns `{ "status": "ok" }` | Required |
| 7 | Test Telegram auth flow inside Telegram app | Required |

### Hosting Recommendations

- **Vercel**: Zero-config Next.js hosting. Set environment variables in Project Settings.
- **Railway / Render**: Good alternatives with easy Supabase integration.
- **Supabase Edge Functions**: For serverless backend extensions.

### Post-Deploy Monitoring

- Set up UptimeRobot or Pingdom to hit `/api/health` every 5 minutes.
- Monitor Supabase logs for RLS policy rejections.
- Monitor Telegram bot webhook delivery (if using webhooks).

---

## CTO Review — Actionable Improvements for Telegram WebApp Release

> Review date: 2026-04-28 | Reviewer persona: CTO with 20 years experience
> Goal: Release Bobo as a Telegram Mini App (WebApp) with seamless, intuitive UX.

### Priority Legend
- **P0 — Blocker**: Must be resolved before any public Telegram release. Shipping without these risks rejection, security incidents, or catastrophic UX failure.
- **P1 — High**: Required for a credible v1.0. Users will notice and churn if these are missing.
- **P2 — Medium**: Technical debt, reliability, and operational hygiene. Fix before scaling.
- **P3 — Future**: Roadmap items for growth and differentiation.

---

### 1. Telegram WebApp Integration (P0) ✅ DEPLOYED

> **Status**: The app is live as a Telegram Mini App on Vercel. All P0 infrastructure is complete.

1. **Integrate `@telegram-apps/sdk`** ✅
   - `init()` called in `TelegramProvider` and `telegram-shell.tsx` before SDK methods.
   - `miniApp.ready()` and `viewport.expand()` called on mount.
   - `getServerSnapshot` fallbacks added to `useSyncExternalStore` for SSR safety.

2. **Safe Area & Viewport Handling** ✅
   - `contentSafeAreaInsets` applied as inline padding in `AppShell`.
   - `BottomNav` is conditionally hidden when `isInTelegram` is true.
   - Hydration-safe mount pattern prevents server/client mismatch.

3. **Theme Synchronization** ✅
   - `TelegramThemeSync` maps `colorScheme` to `next-themes`.
   - `miniApp.bindCssVars()` called after `init()`.
   - `suppressHydrationWarning` on `<html>` prevents React warnings.

4. **Native Button & Haptic Integration** 🔄
   - Hooks (`useTelegramMainButton`, `useTelegramBackButton`, `useTelegramHaptics`) are defined but **not yet wired into pages**. This is polish, not a blocker.

5. **Closing Confirmation** 🔄
   - `useTelegramClosingConfirmation()` hook is defined but **not yet used in forms**.

6. **Bot Setup** ✅
   - Bot registered via `@BotFather`.
   - `/setmenubutton` configured with Vercel URL.
   - Server-side `initData` validation active at `/api/auth/telegram`.

---

### 2. Authentication & Security (P0 / P1)

7. **Telegram Native Authentication (P0)** ✅
   - **Auto-authentication** is live. `TelegramAuthButton` detects Telegram via `isTMA()`, reads `initData`, and POSTs to `/api/auth/telegram`.
   - Server-side HMAC-SHA256 validation using `TELEGRAM_BOT_TOKEN` is active.
   - `auth_date` freshness check (< 86400s) prevents replay attacks.
   - Supabase email auth remains as fallback for PWA standalone mode.
   - `telegram_auth` table stores random passwords for Telegram users.

8. **Remove Hardcoded Demo Credentials from Production (P0)** 🔄
   - Demo mode is gated by `NEXT_PUBLIC_ENABLE_DEMO === "true"` and `isPlaceholder` check.
   - **However**, hardcoded `email: "demo@example.com"` / `password: "demo"` still exist in source code. This is acceptable only if `NEXT_PUBLIC_ENABLE_DEMO` is strictly `false` in production.
   - **Recommended**: Replace hardcoded credentials with random generation or remove entirely.

9. **Content Security Policy (C1)** ✅
   - CSP headers are configured in `next.config.mjs`.
   - Current policy: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' blob: data: https://*.supabase.co https://*.telegram-cdn.org; style-src 'self' 'unsafe-inline'`.

10. **Rate Limiting & Abuse Prevention (P1)**
    - Add API-level rate limiting on log creation, CSV import, and auth endpoints. Supabase Edge Functions or a Vercel/Next.js middleware with `lru-cache` can handle this.
    - Without rate limiting, a malicious user can spam logs or brute-force the demo account.

11. **Secure `manifest.json` Scope (P1)**
    - The manifest `scope` is `/` and `start_url` is `/dashboard`. For Telegram WebApp, the app may be served from a subdirectory or with query params. Ensure the service worker does not intercept Telegram's internal navigation.

---

### 3. Architecture & Data Layer (P1)

12. **Actually Use TanStack Query (P1)**
    - TanStack Query is in `package.json` and wrapped in `Providers`, but **every page fetches data with raw `useEffect` + `createClient()`**. This is an anti-pattern.
    - Action: Replace all `useEffect` data fetching with `useQuery` / `useMutation`. Benefits: automatic caching, background refetching, deduplication, error handling, and optimistic updates.
    - Create typed query keys: `['birds', userId]`, `['logs', birdId]`, `['profile']`.
    - Use `invalidateQueries` after mutations instead of manual `setState` re-fetching.

13. **Add Error Boundaries (P1)** ✅
    - `error.tsx` files exist for `(app)/`, `(auth)/`, and `birds/[id]/`.
    - Global `ErrorBoundary` component added to root layout — catches runtime errors and displays the actual error message + stack trace + reload button.
    - Sentry integration is still pending.

14. **Add Loading States (P1)**
    - Add `loading.tsx` to route segments to leverage Next.js streaming. The current skeleton UIs are manually coded inside each page; `loading.tsx` is cleaner and more maintainable.

15. **Generate Supabase Types (P1)**
    - `types/database.ts` is hand-written and drift-prone. The `Known Issues` section already admits this causes `as unknown as Type` casts everywhere.
    - Action: Use `supabase gen types typescript --project-id xxx > types/database.ts` in CI. Add a GitHub Action that fails the build if generated types diverge from committed types.

16. **Fix the N+1 Query on Dashboard (P1)**
    - `dashboard/page.tsx` fetches birds, then fetches all logs for the user, then manually merges them in JS. This downloads the entire `daily_logs` table client-side.
    - Action: Use a single Supabase RPC function or a joined query (`birds(*, daily_logs(log_date, weight))`) with proper type generation. If mock client limitations block this, prioritize fixing the mock client or accept that demo mode will have a simplified data path.

17. **Server Actions for Mutations (P2)**
    - Currently all mutations happen in client components. Move write operations (log creation, bird updates, settings changes) to Next.js Server Actions.
    - Benefits: smaller client bundle, centralized auth validation, easier rate limiting, and reduced exposure of Supabase anon key.

---

### 4. Performance & Bundle Size (P1)

18. **Audit and Reduce Recharts Bundle (P1)**
    - Recharts is heavy. Use `webpack-bundle-analyzer` to confirm, but bird-tracking apps don't need the full D3 stack.
    - Consider replacing Recharts with a lighter charting library (`chart.js` + `react-chartjs-2`, or `uPlot` for time-series) or lazy-loading chart components with `next/dynamic` + `ssr: false`.
    - Lazy-load `CombinedWeightChart` and `WeightChart` so they don't block the initial dashboard render.

19. **Image Optimization (P1)**
    - The app uses raw `<img>` tags (e.g., `birds/[id]/page.tsx` for poop photos). Next.js has a first-class `<Image>` component with automatic optimization, lazy loading, and blur placeholders.
    - Action: Replace all `<img>` with `next/image`. Configure `images.remotePatterns` in `next.config.mjs` for Supabase Storage domains.

20. **Code Splitting & Dynamic Imports (P2)**
    - Dialogs, charts, and settings sections are good candidates for `next/dynamic`. The settings page is 700+ lines and loaded on every route because it's in the bottom nav.
    - Action: Dynamically import heavy components. Ensure the bottom nav uses prefetching intelligently.

---

### 5. UX & Mobile Experience (P1)

21. **Eliminate `alert()` and `confirm()` (P1)**
    - There are 15+ usages of `alert()` and `confirm()` across the codebase (quick log, settings, bird detail, onboarding). These block the main thread and feel janky on mobile. In Telegram WebApp, native `alert()` can conflict with the WebView's gesture handling.
    - Action: Build a toast/notification system (e.g., `sonner` or a custom shadcn toast) and replace all `alert()` calls. Replace `confirm()` with a `<Dialog>` or `<AlertDialog>` from shadcn/ui.

22. **Keyboard-Aware Inputs (P1)**
    - Number inputs on mobile can trigger the wrong keyboard or cause the viewport to shrink unexpectedly in Telegram's WebView.
    - Action: Ensure all weight inputs use `inputMode="decimal"` and `pattern="[0-9]*"`. Add `autoComplete="off"`. Consider using the Telegram MainButton to submit forms so the keyboard dismissal is handled natively.

23. **Form Validation & Zod (P1)**
    - Most forms use controlled `useState` without validation. Weight inputs accept negative numbers and empty strings. Target weight can be `NaN`.
    - Action: Apply React Hook Form + Zod consistently across **all** forms (quick log, full log, edit bird, edit log, add retroactive log). Zod schemas should enforce `weight > 0`, `maxLength` on observations, and valid date ranges.

24. **Focus Management in Dialogs (P2)**
    - shadcn Dialogs should trap focus and return focus to the trigger on close. Verify this works with keyboard navigation. Add `autoFocus` to the first meaningful input in each dialog.

---

### 6. Offline & Sync (P1)

25. **Implement Automatic Offline Queue Flush (P1)**
    - `lib/db/offline-queue.ts` stores logs locally, but there is **no background sync or automatic flush**. The `SyncIndicator` just shows a banner. Users must manually go online and hope the app retries.
    - Action:
      a. Register a `sync` event in the service worker (`next-pwa` can be configured with a custom worker) to trigger `flushOfflineQueue` when connectivity returns.
      b. Add a `useEffect` in the app shell that listens for `online` events and calls a `flushOfflineQueue()` function.
      c. Implement exponential backoff for failed syncs (already has `retry_count`, but never used).
      d. Show a persistent badge on the SyncIndicator when items are queued, not just when offline.

26. **Conflict Resolution Strategy (P2)**
    - The current strategy is "last-write-wins per field". Document this explicitly. For a weight-tracking app, consider keeping **both** conflicting logs (since multiple logs per day are already supported) rather than overwriting.

---

### 7. Observability & Reliability (P2)

27. **Error Tracking & Logging (P2)**
    - There is no error tracking service (Sentry, LogRocket, etc.). In production, you will be flying blind.
    - Action: Integrate Sentry for Next.js (`@sentry/nextjs`). Capture exceptions in error boundaries, API routes, and Supabase mutation failures. Ensure PII (bird names, weights) is scrubbed from logs.

28. **Analytics (P2)**
    - Add privacy-friendly analytics (Plausible, PostHog, or Telegram's own `WebApp.sendData` events) to understand:
      - Drop-off in onboarding
      - Quick log vs full log usage split
      - Pro upgrade click-through rate
      - Offline queue flush success rate

29. **Health Checks & Uptime Monitoring (P2)** ✅
    - `/api/health` route exists and checks Supabase connectivity.
    - Returns `{ "status": "ok", "timestamp": "..." }` on success.
    - Returns `503` with error details if DB is unreachable.

---

### 8. DevOps & Release Engineering (P2)

30. **Remove `.env.local` from Repository (P0 if secrets exist, P2 otherwise)** ✅
    - `.env.local` is in `.gitignore` and was never committed to GitHub.
    - `.env.local.example` contains only placeholder values and is safe to track.
    - `AGENTS.md` is kept local-only (not on GitHub) to avoid exposing internal architecture.

31. **CI/CD Pipeline (P2)**
    - There is no GitHub Actions / CI configuration visible.
    - Action: Add a GitHub Actions workflow that runs on every PR:
      1. `npm ci`
      2. `npm run lint`
      3. `npm run test:unit`
      4. `npm run build`
      5. `npm run test:e2e`
    - Block merges if any step fails.

32. **Database Migration Strategy (P2)**
    - Currently migrations are manual SQL files run in Supabase SQL Editor. This is fine for one developer, dangerous for a team.
    - Action: Adopt the Supabase CLI (`supabase db push`) for migrations. Store migrations in `supabase/migrations/` with timestamps. Add a CI step that runs `supabase db lint`.

33. **Environment Segregation (P2)**
    - Maintain separate Supabase projects for `dev`, `staging`, and `prod`. The current setup implies a single project. Telegram BotFather also supports different WebApp URLs per environment.

---

### 9. Monetization & Business Logic (P2)

34. **Real Payment Integration (P2)**
    - The current "Pro" upgrade is a hardcoded `is_pro = true` update with no payment gateway. For Telegram, this is actually an opportunity.
    - Action: Integrate **Telegram Stars** (Bot API 7.0+) for in-app purchases. This is the native monetization path for Mini Apps and provides seamless UX without leaving Telegram. Alternatively, use Telegram Payments with Stripe/YooKassa.
    - Keep the demo upgrade for local development, but gate it with `process.env.NODE_ENV === 'development'`.

35. **Freemium Limits Enforcement (P2)**
    - The 2-bird limit is enforced in UI only. A determined user can bypass it by calling the Supabase API directly.
    - Action: Enforce the bird limit in a **Postgres trigger** or **RLS policy** that checks `profiles.is_pro` on `birds.insert`. The database should be the source of truth, not the frontend.

---

### 10. Accessibility & Internationalization (P3)

36. **Accessibility Audit (P3)**
    - Add `aria-label`, `aria-live` regions for dynamic content (sync status, streak updates), and ensure color contrast meets WCAG 2.1 AA. The emerald-on-white palette may fail contrast checks for small text.

37. **Internationalization (i18n) (P3)**
    - All UI strings are hardcoded in English. Telegram has a global user base. Consider `next-intl` or `react-i18next` to support at least Russian, Spanish, and Portuguese (large pet/bird owner markets).

---

### Completed Actionables

| # | Item | Status |
|---|------|--------|
| P0.8 | Secure demo mode (`NEXT_PUBLIC_ENABLE_DEMO`) | ✅ Done |
| P0.1–P0.6 | Telegram WebApp SDK integration (`lib/telegram/`), theme sync, safe-area handling, conditional BottomNav | ✅ Done |
| P0.7 | Telegram native auth API (`/api/auth/telegram`) with HMAC-SHA256 validation | ✅ Done |
| P0.9 | CSP + security headers in `next.config.mjs` | ✅ Done |
| P1.13 | Error boundaries (`error.tsx`) for `(app)/`, `(auth)/`, `birds/[id]/` | ✅ Done |
| P1.14 | Loading states (`loading.tsx`) for app routes | ✅ Done |
| P1.19 | Image optimization (`SafeImage` component with `next/image` fallback) | ✅ Done |
| P1.21 | Eliminated all `alert()`/`confirm()` — replaced with `sonner` toasts + `confirmDialog` utility | ✅ Done |
| P1.25 | Offline queue auto-flush on `online` event with retry count & toast feedback | ✅ Done |
| P1.12 | Dashboard migrated to TanStack Query (`useBirds`, `useLogs`, `useProfile`, `useUpgradeToPro`) | ✅ Done |
| P2.31 | CI/CD pipeline (`.github/workflows/ci.yml`) | ✅ Done |
| **CRIT** | **CSP/Frame headers fixed** — removed `X-Frame-Options` and `frame-ancestors` to allow Telegram WebView | ✅ Done |
| **CRIT** | **Database migration fixed** — added `birds.sort_order`, `profiles.telegram_id/username/is_pro/updated_at`, `daily_logs.logged_at` | ✅ Done |
| **CRIT** | **Daily log unique index removed** — allows multiple logs per day as designed | ✅ Done |
| **CRIT** | **Telegram auth end-to-end** — frontend `TelegramAuthButton` + backend session establishment via admin API | ✅ Done |
| **CRIT** | **Health check endpoint** (`/api/health`) — returns DB connectivity status | ✅ Done |
| **CRIT** | **Env documentation** — `.env.local.example` now includes `TELEGRAM_BOT_TOKEN` and `NEXT_PUBLIC_ENABLE_DEMO` | ✅ Done |
| **HIGH** | **Telegram auth security** — `auth_date` freshness validation + `timingSafeEqual` for HMAC comparison | ✅ Done |
| **HIGH** | **ErrorBoundary** — Global error boundary captures actual error messages + stack traces | ✅ Done |
| **HIGH** | **AppShell hydration fix** — `mounted` state prevents server/client HTML mismatch | ✅ Done |
| **HIGH** | **Telegram SDK race condition fix** — `init()` called before `bindCssVars()` / `setHeaderColor()` | ✅ Done |
| **HIGH** | **Auth performance** — Removed "Checking session..." spinner and 500ms retry delay | ✅ Done |
| **MED** | **Pro badge** — Golden feather badge shown on dashboard for `is_pro` accounts | ✅ Done |
| **MED** | **Database schema** — Added `telegram_auth` table (002) and `profiles.avatar_url` column | ✅ Done |
| **MED** | **AGENTS.md** — Removed from GitHub (local-only) to avoid exposing security roadmap | ✅ Done |
| **HIGH** | **Flock sharing** — `flocks`, `flock_members`, `flock_invites` tables + RLS + invite/accept API routes + Settings UI | ✅ Done |
| **HIGH** | **Flock tests** — Mock client flock tests, API route tests (invite + accept), useBirds hook flock tests | ✅ Done |
| **HIGH** | **Debug tooling** — `/api/debug/user-data` endpoint + `/debug` page for diagnosing auth/data visibility | ✅ Done |
| **HIGH** | **Telegram auth lookup fix** — `String()` coercion for `telegram_id` + email fallback to prevent duplicate accounts | ✅ Done |

### Remaining Roadmap

**Sprint 3 — Forms & Polish**
- P1.18: Audit/chart bundle optimization (lazy-load Recharts)
- P1.23: Consistent Zod validation across all forms
- P2.27: Sentry error tracking
- P2.30: Env security cleanup (`.env.local` already in `.gitignore`)

**Sprint 4 — Production Readiness**
- P1.10: Rate limiting
- P2.34: Telegram Stars payment integration
- P1.15: Generate Supabase types from schema
- P2.35: Enforce bird limit in Postgres RLS/trigger

### Recommended Execution Order

**Sprint 1 — Telegram Foundation (2 weeks)** ✅ *Completed*
- P0.1–P0.6: Telegram SDK integration, viewport, theme sync, MainButton/BackButton
- P0.7: Telegram native auth with server-side `initData` validation
- P0.8: Remove hardcoded demo credentials from production builds

**Sprint 2 — Core Stability (2 weeks)** ✅ *Completed*
- P1.12: Migrate data fetching to TanStack Query
- P1.13: Add error boundaries and loading states
- P1.21: Replace all `alert()`/`confirm()` with toasts and dialogs

**Sprint 3 — Performance & Polish (2 weeks)** 🔄 *In Progress*
- P1.18: Audit/chart bundle optimization
- P1.19: Image optimization with `next/image` ✅
- P1.25: Offline queue auto-flush + background sync ✅
- P1.23: Consistent Zod validation across all forms

**Sprint 4 — Production Readiness (2 weeks)** 🔄 *In Progress*
- P0.9: CSP headers ✅
- P1.10: Rate limiting
- P2.27: Sentry error tracking
- P2.30: Env security cleanup ✅
- P2.31: CI/CD pipeline ✅
- P2.34: Telegram Stars payment integration

---

## Resolved Issues

- **Dashboard loading stuck on error** — Fixed. All async data fetching in client components now wraps setState calls in try/catch.
- **E2E tests require dev server** — Fixed. `playwright.config.ts` now starts the dev server automatically via `webServer`.
- **Bird card sparkline warnings** — Fixed. `MiniSparkline` guards against empty data, and `test/setup.ts` suppresses Recharts container-size warnings in jsdom.
- **Weight chart empty state** — Fixed. `WeightChart` and `CombinedWeightChart` render a "No weight data available" placeholder when the filtered dataset is empty.
- **Login signup success message** — Fixed. The signup branch had an unreachable `setError` call after a `return;` statement.
- **Onboarding alert HTML entity** — Fixed. `alert("You&apos;ve reached...")` displayed the literal `&apos;` string instead of an apostrophe.
- **Bird detail falsy weight** — Fixed. Log entries with a weight of `0` were hidden due to `&&` falsy check; now uses `!= null`.
- **Settings export falsy weight** — Fixed. CSV export used `l.weight || ""` which dropped `0` values.
- **Bird edit NaN guard** — Fixed. Editing target weight now validates `parseFloat` result with `isNaN` guard.
- **Quick/Full log missing birdId** — Fixed. Navigating to `/log/quick` or `/log/full` without a `birdId` now auto-selects the user's only bird or shows a multi-bird layout when multiple birds exist.
- **Weight unit preference ignored** — Fixed. Added `useWeightUnit` hook that reads the user's `weight_unit` preference and applied it to `BirdCard`, bird detail, quick log, and full log.
- **Archive redirect loop** — Fixed. Archiving the only bird caused an infinite redirect between dashboard and onboarding. Onboarding now checks for `status = "active"` only, and the bird limit counts active birds only.
- **AppShell hydration mismatch** — Fixed. `AppShell` rendered different HTML on server vs client based on `isInTelegram`. Added `mounted` state to defer Telegram-specific UI until after client mount.
- **Telegram SDK race condition** — Fixed. `TelegramThemeSync` called `miniApp.bindCssVars()` before `init()` had run, causing `FunctionNotAvailableError` on reopen. Now calls `init()` before all SDK methods in `telegram-shell.tsx`.
- **Login page spinner delay** — Fixed. Removed "Checking session..." spinner. Login form renders immediately; session check runs in background and redirects transparently if already logged in.
- **Telegram auth initData missing** — Fixed. Added fallback chain: `window.Telegram.WebApp.initData` → `initDataUnsafe` → URL query param `tgWebAppData` → URL hash `tgWebAppData`.
- **Telegram auth 500 error** — Fixed. `profiles` table was missing `avatar_url` column. Added via `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;`.
- **Login build TypeScript error** — Fixed. `getSession()` destructuring had implicit `any` type. Added explicit type annotation.
- **useSyncExternalStore SSR error** — Fixed. `TelegramProvider` `useSdkSignal` hook was missing `getServerSnapshot` parameter, causing prerender errors on Vercel. Added fallback values for server rendering.
