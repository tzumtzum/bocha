# Bobo - Pet Bird Tracker

A mobile-first PWA for bird owners to log daily weights and health observations. Built with Next.js 14, Tailwind CSS, shadcn/ui, and Supabase.

## Features

- **Daily Weight Logging** — Quick and full log modes with offline support
- **Weight Trends** — Interactive charts with 7/30/90 day views
- **Health Tracking** — Activity, appetite, poop observations
- **Streak Counter** — Gamified daily logging streaks
- **Offline Support** — IndexedDB queue with automatic sync
- **PWA** — Installable on mobile with offline capability
- **Dark Mode** — System-aware theme switching

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Offline**: IndexedDB via `idb`
- **PWA**: next-pwa

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd bocha
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API and copy:
   - Project URL
   - Anon/public key
3. Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

4. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

In your Supabase project SQL Editor, run the migration file:

```bash
# Copy the contents of supabase/migrations/001_initial_schema.sql
# Paste into Supabase SQL Editor and run
```

This creates:
- All tables with Row Level Security (RLS)
- Auth trigger for profile creation
- Species seed data (18 bird species)
- Demo data function (`create_demo_bird`)

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  (auth)/           # Auth pages (login, onboarding)
  (app)/            # Protected app pages (dashboard, birds, logs, settings)
  api/auth/         # Auth callback handler
components/
  ui/               # shadcn/ui components
  birds/            # Bird card, streak, empty state
  charts/           # Recharts wrappers
  layout/           # Bottom nav, sync indicator, providers
lib/
  supabase/         # Browser & server clients
  db/               # IndexedDB offline queue
  utils.ts          # Helpers (formatting, streak calc, etc.)
types/
  database.ts       # TypeScript types for Supabase tables
supabase/
  migrations/       # SQL migration files
public/
  manifest.json     # PWA manifest
  icons/            # App icons
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User preferences (extends `auth.users`) |
| `birds` | Bird profiles with avatar colors |
| `daily_logs` | Weight & health observations |
| `medications` | Bird medications |
| `medication_logs` | Medication administration records |
| `egg_logs` | Simple egg tracking |
| `reminders` | User-configurable reminders |
| `species` | Lookup table (seeded) |

All tables have RLS enabled with user isolation policies.

## Offline Strategy

When the user is offline:
1. Logs are saved to IndexedDB queue
2. A "Sync pending" banner is shown
3. When connection returns, queued logs are synced to Supabase
4. Conflict resolution: last-write-wins per field

## PWA

The app is configured as a Progressive Web App:
- `manifest.json` with app metadata
- `next-pwa` for service worker generation
- Installable on mobile home screens
- Works offline (cached assets + IndexedDB queue)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Your app URL (localhost in dev) |

## MVP Constraints

- 2-bird limit (upgrade teaser shown at limit)
- No real payments (hardcoded limit)
- No push notifications (in-app only)
- No AI poop analysis
- No vet share links (CSV export only)
- No multi-user groups

## License

MIT
