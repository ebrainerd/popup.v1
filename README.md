# PopUp

Time-boxed virtual pop-up shops. Sellers open a shop on a schedule, go live, run
flash drops, and sell physical goods with instant checkout — buyers discover
public shops in an Explore feed and follow their favorite sellers.

This repository contains the **MVP web app** (Next.js + Supabase + Stripe),
built in milestones. See `docs/ROADMAP.md` for what's shipped and what's next.

> **Picking up the project?** Start with **`docs/HANDOFF.md`** — current status,
> pending owner actions (e.g. custom-domain setup), and conventions.

## Stack

- **Framework:** Next.js 16 (App Router, React Server Components) + TypeScript
- **Styling:** Tailwind CSS v4 + a small shadcn-style component kit (`src/components/ui`)
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage) with Row Level Security
- **Payments:** Stripe Connect (Milestone 3)
- **PWA:** Web manifest + service worker (installable on mobile)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL + anon key (and the service-role key for
server-only operations). For Google login, enable the Google provider in
**Supabase → Authentication → Providers** and add
`<SITE_URL>/auth/callback` as a redirect URL.

### 3. Apply the database schema

Using the Supabase CLI against a local stack:

```bash
supabase start
supabase db reset            # runs supabase/migrations/*.sql
```

Or paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor for a
hosted project. The migration creates all tables, RLS policies, storage buckets
(`covers`, `products`, `avatars`), and the trigger that auto-creates a profile
on signup.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Start the dev server                   |
| `npm run build`    | Production build                       |
| `npm run start`    | Run the production build               |
| `npm run lint`     | ESLint                                 |
| `npm run typecheck`| `tsc --noEmit`                         |
| `npm run test`     | Unit tests (Vitest)                    |
| `npm run test:e2e` | Playwright smoke tests (build first)   |

CI (GitHub Actions) runs typecheck, lint, unit tests, build, and Playwright
smoke tests on every PR. See `docs/TESTING.md` for the full testing guide,
including the gated RLS integration suite.

## What's in this milestone

**Milestone 1 — Foundation (this PR):**

- Next.js + Tailwind + PWA scaffold and PopUp branding
- Supabase schema + RLS for profiles, shops, products, orders, follows,
  ratings, and chat
- Auth: email/password + Google OAuth, session middleware, route guards
- Seller dashboard: overview stats, calendar, shop list
- Shop CRUD with cover/product image uploads to Supabase Storage
- Product management per shop
- Public Explore feed (All / Live now / Opening soon) with live countdowns
- Public shop page with countdown, live embed (YouTube/Twitch), products
- Follow sellers; public seller profiles

See `docs/ROADMAP.md` for Milestones 2 (realtime chat, presence, flash drops)
and 3 (Stripe Checkout, orders, fulfillment, ratings).
