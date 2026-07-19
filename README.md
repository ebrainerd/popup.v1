# PopUp

**Shops that live for the moment.**

PopUp is a web application for time-boxed virtual pop-up shops. Sellers open a
shop on a schedule. They go live, run flash drops, and sell physical goods.
Buyers reach shops by direct link. In marketplace mode, buyers can also
discover shops in Explore.

Production site: [https://www.popupdrop.co](https://www.popupdrop.co)

Default discovery mode is `invite_only`. Shops are available only via link.
Explore shows a holding page. Set `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` to
enable marketplace discovery.

> **Picking up the project?** Start with **`docs/HANDOFF.md`** for current
> status, production URL, and conventions.  
> **Before marketing:** complete **`docs/PRE_MARKETING_TEST.md`** with a
> partner.

## Stack

- **Framework:** Next.js 16.2.9 (App Router, React Server Components) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + a small shadcn-style component kit (`src/components/ui`)
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage) with Row Level Security
- **Payments:** Stripe Connect
- **Live streaming:** LiveKit (PopUp Live); YouTube and Twitch embeds are also supported
- **Hosting:** Vercel
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

Set your Supabase project URL, anon key, and service-role key in `.env.local`.
The service-role key is for server-only operations. Do not expose it to the
browser.

For Google login, enable the Google provider in **Supabase → Authentication →
Providers**. Add `<SITE_URL>/auth/callback` as a redirect URL.

### 3. Start Supabase and apply the database schema

Use the Supabase CLI for a local stack:

```bash
supabase start
supabase db reset
```

`supabase db reset` runs all migrations in `supabase/migrations/*.sql` in order
through `0029_auction_stock_decrement.sql`. The migrations create tables, RLS
policies, storage buckets (`covers`, `products`, `avatars`), and the trigger
that auto-creates a profile on signup.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the dev server                 |
| `npm run build`         | Production build                     |
| `npm run start`         | Run the production build             |
| `npm run lint`          | ESLint                               |
| `npm run typecheck`     | `tsc --noEmit`                       |
| `npm run test`          | Unit tests (Vitest)                  |
| `npm run test:e2e`      | Playwright smoke tests (build first) |
| `npm run load:shop-smoke` | k6 shop-page load smoke test       |

CI (GitHub Actions) runs typecheck, lint, unit tests, build, and Playwright
smoke tests on every pull request. See `docs/TESTING.md` for the full testing
guide, including the gated RLS integration suite.

## Current product

Milestones M1 through M3 are shipped in production. Post-MVP features are also
live. Capabilities include:

- Auth (email/password and Google OAuth), seller dashboard, shop and product CRUD
- Realtime chat, presence, flash drops, and follower notifications
- Stripe Connect onboarding, Checkout, orders, fulfillment, and ratings
- Live auctions and native PopUp Live streaming (LiveKit)
- Shop layouts: The Room (classic) and Lookbook (catalog)
- Drop reminders, invite-only discovery mode, and support tickets
- Ember Market brand identity

For the full feature list and roadmap, see `docs/ROADMAP.md`. For production
status and conventions, see `docs/HANDOFF.md`.
