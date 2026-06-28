# PopUp — Project Handoff & Status

Living doc so anyone (human or agent) can pick up where we left off. Update it
as things change.

## What PopUp is

Time-boxed virtual pop-up shops. Sellers open shops that run on a schedule, go
live (native **PopUp Live** via LiveKit or YouTube/Twitch embed), run flash
drops and live auctions, and sell physical goods; buyers reach shops via direct
link (invite-only launch) or Explore (marketplace mode), follow creators, chat
in "the room," and check out via Stripe. Stack: **Next.js 16 (App Router) +
Tailwind v4 + Supabase + Stripe + LiveKit + Vercel**.

## Production

| Item | Value |
| ---- | ----- |
| **Site** | https://www.popupdrop.co (also `popupdrop.co` → www) |
| **Discovery mode** | `invite_only` (default) — link-only shops; Explore is a holding page |
| **Stripe** | Live mode |
| **Email** | Resend on verified `popupdrop.co` domain |
| **Migrations** | Through **`0020_seller_terms_accepted.sql`** |

## Where to look

| Topic | File |
| ----- | ---- |
| Run locally / scripts | `README.md` |
| **Pre-marketing manual test (full checklist)** | **`docs/PRE_MARKETING_TEST.md`** |
| Feature roadmap (M1–M3 done) | `docs/ROADMAP.md` |
| Creator-led drop loop PRD | `docs/CREATOR_DROP_LOOP.md` |
| Invite-only launch plan | `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` |
| Live auctions PRD (shipped) | `docs/AUCTIONS_PRD.md` |
| Native live streaming | `docs/NATIVE_LIVE_STREAMING.md` |
| Product UX review notes | `docs/PRODUCT_UX_REVIEW.md` |
| Testing & CI | `docs/TESTING.md` |
| Manual post-feature checklists | `docs/MANUAL_TESTING.md` |
| Deploy, env vars, go-live checklist | `docs/DEPLOYMENT.md` |
| Production launch & load testing | `docs/PRODUCTION_READINESS.md` |
| k6 load scripts | `scripts/load/README.md` |
| Cloud-agent run notes (Docker/Supabase) | `AGENTS.md` |
| DB schema | `supabase/migrations/*.sql` (apply in order) |

## Status (high level)

All three MVP milestones shipped and live in production, plus post-launch work:

- Navigation, Explore (marketplace mode), search, draft→publish, inventory
  reservations, light/dark theme, buyer order detail, full **order-email lifecycle**
- **Invite-only launch mode** (`NEXT_PUBLIC_DISCOVERY_MODE=invite_only`)
- Multiple photos per product, $0.50 minimum price, HEIC uploads
- **Live auctions** (`docs/AUCTIONS_PRD.md`)
- **Native PopUp Live** (LiveKit) + live reminders (`0018`–`0019`)
- **Seller terms gate** on first shop create (`0020`)
- Expanded legal pages (`/legal/terms`, `/legal/privacy`) — `legal@popupdrop.co`
- k6 shop smoke runner: `npm run load:shop-smoke -- <shop-url>`

### Infrastructure (owner — done)

- [x] Custom domain on Vercel (`popupdrop.co` / `www.popupdrop.co`)
- [x] `NEXT_PUBLIC_SITE_URL=https://www.popupdrop.co`
- [x] Supabase Auth URLs + Google OAuth (shows "PopUp")
- [x] Google OAuth → Production; Search Console verified
- [x] Cloudflare Turnstile + Supabase captcha
- [x] Resend domain verified; `RESEND_FROM` + Supabase SMTP
- [x] Stripe live webhook → `https://www.popupdrop.co/api/stripe/webhook`
- [x] `CRON_SECRET` + daily `release-funds` on Vercel
- [x] Drop reminders via **cron-job.org** every 15 min (Hobby-safe)
- [x] Sentry + uptime monitor on `/api/health`
- [x] Migrations through `0020` applied on production
- [x] M365 aliases: `legal@popupdrop.co`, `support@popupdrop.co` → owner inbox

## ⚠️ Before marketing (remaining)

Use **`docs/PRE_MARKETING_TEST.md`** — the full two-person checklist. Short list:

- [ ] Complete pre-marketing test pass (seller + buyer dry-run drop)
- [ ] Real purchase end-to-end with emails to real inboxes (not Resend sandbox)
- [ ] k6 smoke on a published shop URL (already passed once; re-run after major changes)
- [ ] Optional: attorney review of `/legal/terms` and `/legal/privacy`
- [ ] When supply is ready: set `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` and test Explore/search

### Standing ops

- [ ] Apply new DB migrations as they land (`supabase/migrations/`, in order)
- [ ] Stripe webhook events: `checkout.session.completed`, `account.updated`,
      `checkout.session.expired`
- [ ] `RELEASE_DELAY_HOURS=72` in production (`0` is for staging/local only)
- [ ] `PLATFORM_FEE_BPS=900` (9%)
- [ ] Monitor Sentry, Stripe webhook logs, Supabase, LiveKit during first public drops

## Email notifications (current behavior)

All emails are best-effort and **no-op without `RESEND_API_KEY`**:

- **Purchase** → buyer confirmation + seller new-sale (seller email includes shipping address)
- **Mark shipped** → buyer email with tracking link
- **Unshipped > 3 days** → seller reminder (daily `release-funds` cron)
- **Shipped, unconfirmed ~3 days** → buyer receipt nudge (max 2, ~4 days apart)
- **Drop reminders** (24h / 1h / opening) → buyer email (+ push if VAPID set); cron every 15 min
- **Go live** → followers + live-reminder subscribers (instant, no cron)

Legal contact: `legal@popupdrop.co`. Support alias: `support@popupdrop.co`.

## Conventions for future agents

- Branch names: `cursor/<descriptive-name>-<suffix>`. One PR per logical change;
  open as draft; merge only when the user says so.
- Before pushing, run: `npm run typecheck && npm run lint && npm run test &&
  npm run build`, and `npm run test:e2e` for UI changes (build first).
- After UI or integration features, walk the relevant checklist in
  `docs/MANUAL_TESTING.md` or `docs/PRE_MARKETING_TEST.md` for launch-affecting work.
- Env vars are documented in `docs/DEPLOYMENT.md` (full reference + checklist).
- Hand-maintained `src/lib/database.types.ts` mirrors the migrations — update it
  alongside any schema change (or regenerate via `npm run db:types`).
- Realtime: one Supabase channel per shop (`src/components/shop-room.tsx`) with
  presence + broadcast; use `emit` (not `broadcast`) when the sender's own UI
  must also update (Realtime doesn't echo to the sender).

## Known future work / ideas

- Scale hardening (Realtime connection limits, Explore caching) — k6 smoke in `scripts/load/`
- Carrier tracking API for real delivery ETAs (Shippo/EasyPost/AfterShip)
- Nonce-based strict CSP; per-viewer avatar stack in the room
- Marketplace mode launch when seller supply supports Explore
