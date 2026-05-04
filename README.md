# Bobo - Pet Bird Tracker

A mobile-first PWA and **Telegram Mini App** for bird owners to log daily weights and health observations. Built with Next.js 14, Tailwind CSS, shadcn/ui, and Supabase.

## Features

- **Daily Weight Logging** — Quick and full log modes with offline support
- **Weight Trends** — Interactive charts with 7/30/90 day views
- **Health Tracking** — Activity, appetite, droppings observations
- **Streak Counter** — Gamified daily logging streaks
- **Offline Support** — IndexedDB queue with automatic sync
- **PWA** — Installable on mobile with offline capability
- **Dark Mode** — System-aware theme switching
- **Telegram Mini App** — Native Telegram WebApp integration with auto-authentication
- **Pro Badge** — Golden feather badge for Pro accounts
- **CSV Import/Export** — Backup and restore your data
- **Photo Upload** — Attach photos to health logs

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod v4
- **Offline**: IndexedDB via `idb`
- **PWA**: next-pwa
- **Telegram**: @telegram-apps/sdk

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd bocha
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL
   - Anon/public key
   - Service role key (for server-side auth)
3. Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

4. Fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
NEXT_PUBLIC_ENABLE_DEMO=false
```

### 3. Run Database Migrations

In your Supabase project SQL Editor, run these migration files in order:

```bash
# 1. Core schema
supabase/migrations/001_initial_schema.sql

# 2. Telegram auth table
supabase/migrations/002_telegram_auth.sql

# 3. Add avatar_url to profiles (if not already present)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

This creates:
- All tables with Row Level Security (RLS)
- Auth trigger for profile creation
- Species seed data (18 bird species)
- Telegram auth secrets table
- Demo data function (`create_demo_bird`)

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

## Project Structure

```
app/
  (auth)/           # Auth pages (login, onboarding)
  (app)/            # Protected app pages (dashboard, birds, logs, settings)
  api/auth/         # Auth callback + Telegram initData validation
  api/health/       # Health check endpoint
components/
  ui/               # shadcn/ui components
  birds/            # Bird card, streak, empty state, weight alert
  charts/           # Recharts wrappers
  layout/           # Bottom nav, sync indicator, providers, error boundary,
                    # Telegram provider + theme sync + safe area
  auth/             # TelegramAuthButton with auto-authentication
  logs/             # Quick log forms and sheet
lib/
  supabase/         # Browser, server, mock, and middleware clients
  db/               # IndexedDB offline queue
  telegram/         # WebApp typed wrapper and React hooks
  hooks/            # TanStack Query hooks (useBirds, useLogs, useProfile)
  toast.ts          # Toast + confirmDialog utility
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
| `profiles` | User preferences + avatar_url (extends `auth.users`) |
| `birds` | Bird profiles with avatar colors |
| `daily_logs` | Weight & health observations |
| `medications` | Bird medications |
| `medication_logs` | Medication administration records |
| `egg_logs` | Simple egg tracking |
| `reminders` | User-configurable reminders |
| `species` | Lookup table (seeded) |
| `telegram_auth` | Random passwords for Telegram-authenticated users |

All tables have RLS enabled with user isolation policies.

## Telegram Mini App Setup

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Copy the **API Token** into your `.env.local` as `TELEGRAM_BOT_TOKEN`
3. Set the menu button URL: `/setmenubutton` → enter your app URL
4. Open the bot in Telegram → tap the **Menu button**
5. Users are auto-authenticated via Telegram `initData` — no email/password needed

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

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side admin key (for Telegram auth) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app URL (localhost in dev, Vercel URL in prod) |
| `NEXT_PUBLIC_ENABLE_DEMO` | ❌ | Set `"true"` to enable demo mode (dev only) |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add all environment variables in **Project Settings**
4. Deploy

### Post-Deploy Checklist

- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] `/setmenubutton` configured in @BotFather
- [ ] Telegram auth works inside Telegram app
- [ ] `NEXT_PUBLIC_ENABLE_DEMO=false` in production

## License

MIT
