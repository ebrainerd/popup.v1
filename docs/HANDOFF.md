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
| **Migrations** | Through **`0029_auction_stock_decrement.sql`** (apply in order; HANDOFF production table may lag until owner applies) |

## Where to look

| Topic | File |
| ----- | ---- |
| Run locally / scripts | `README.md` |
| **Pre-marketing manual test (full checklist)** | **`docs/PRE_MARKETING_TEST.md`** |
| **Marketing launch gate (GO/NO-GO status)** | **`docs/MARKETING_LAUNCH_GATE.md`** |
| Feature roadmap (M1–M3 done) | `docs/ROADMAP.md` |
| Creator-led drop loop PRD | `docs/CREATOR_DROP_LOOP.md` |
| Invite-only launch plan | `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` |
| Live auctions PRD (shipped) | `docs/AUCTIONS_PRD.md` |
| Native live streaming | `docs/NATIVE_LIVE_STREAMING.md` |
| Product UX review notes | `docs/PRODUCT_UX_REVIEW.md` |
| **Shop layout archetypes (customization spec)** | **`docs/SHOP_LAYOUT_ARCHETYPES.md`** |
| **Native app decision (when / if to build)** | **`docs/NATIVE_APP_DECISION.md`** |
| Testing & CI | `docs/TESTING.md` |
| Manual post-feature checklists | `docs/MANUAL_TESTING.md` |
| Auth & profile signup flows | `docs/AUTH_PROFILE_ROADMAP.md` |
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
- **Shop layout archetypes** (`docs/SHOP_LAYOUT_ARCHETYPES.md`) — phases 0–6 landed.
  **Pickable layouts today:** **The Room** (`classic`) — stream + chat first,
  products below — and **Lookbook** (`catalog`) — products first, stream band
  below. Defined in `SHOP_PICKABLE_LAYOUTS`. Legacy `broadcast` (Live Stage) /
  `countdown` (Drop Clock) are retired from the picker and fold into `classic`
  via `normalizeLayout()` (enum slugs may remain in DB for backward compatibility).
  Smoke: `docs/MANUAL_TESTING.md` → shop layouts + mobile room; pre-marketing
  Phase 17.

## Shop layout archetypes — COMPLETE (Phases 0–6)

**Spec:** `docs/SHOP_LAYOUT_ARCHETYPES.md`. Implementation complete; **seller picker
ships two layouts** (The Room + Lookbook). Retired slugs remain in the enum for
backward compatibility only.

- **Phases 0–3, 5:** metadata + defaults, editor archetype picker + preview phase
  toggle, buyer-page parity for Lookbook (`catalog`) and The Room (`classic`).
- **Phase 4 — Drop Clock (`countdown`):** built, then folded into The Room for the
  narrowed picker (`normalizeLayout`).
- **Phase 6 — QA & docs:** smoke matrices in `docs/MANUAL_TESTING.md`; prefer the
  **two pickable** layouts for ongoing QA. Automated gate
  (`typecheck`/`lint`/`test`/`build`) green.

### Key files

```
src/lib/shop-theme.ts
src/components/shop-theme-editor.tsx
src/components/shop-theme-preview.tsx
src/components/shop-page-view.tsx
src/components/stream-slot.tsx
```

### Re-verifying layout work

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Then walk `docs/MANUAL_TESTING.md` → "Shop layout archetypes". Local-stack
gotcha hit during Phase 6 QA: a stale DB volume can leave migrations partially
applied (e.g. missing `profiles.follower_count`), which makes owner shop pages
404 on otherwise-valid shops — run `supabase db reset` to re-apply all
migrations + `seed.sql` grants. Keep the customize preview and buyer page in
sync if you touch any layout (comment cross-links exist in `shop-page-view.tsx`
↔ `shop-theme-preview.tsx`).

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
- [x] Migrations through `0022` applied on production (apply any later repo migrations in order)
- [x] M365 aliases: `legal@popupdrop.co`, `support@popupdrop.co` → owner inbox

## Marketing gate (GO / NO-GO)

**Gate:** One founding seller can run a real drop to a phone-heavy audience; money
clears; emails land; they want to schedule the next drop.

**Current status: NO-GO** — see scored checklist in **`docs/MARKETING_LAUNCH_GATE.md`**.
Eng readiness work on this branch (mobile room, seller kit, trust copy, non-goals)
does **not** replace the human production dry-run.

## Not for first marketing (non-goals)

First marketing is **invite-only, seller-led drops** — sellers bring buyers via
shop link; PopUp is not a WhatNot-scale marketplace yet. The items below are
**explicitly out of scope** for the first marketing gate. Each has a **revisit
trigger** so we do not defer them forever.

| Non-goal | Revisit when |
| -------- | ------------ |
| **Marketplace Explore** (`NEXT_PUBLIC_DISCOVERY_MODE=marketplace`) | ≥ **10** upcoming public drops in the next **14 days**, ≥ **3** creators with prior successful drops, and ≥ **1** drop in the next **48h** on most days — then flip mode and run `docs/PRE_MARKETING_TEST.md` Phase 21. See `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` § "When to reintroduce Explore". |
| **Categories / recommendations** | Marketplace mode is live **and** Explore has enough listings that unfiltered "All" feels noisy; start with manual curation (`featured_at`), not algorithms. |
| **Carrier tracking APIs** (Shippo / EasyPost / AfterShip) | Seller support volume or payout disputes show that manual tracking links are a recurring pain **or** ≥ **50** shipped orders/month need automated in-transit status. Until then: seller-entered tracking + time-based hold (`RELEASE_DELAY_HOURS`). |
| **Likes / clips / replays / deep social graph** | A measured retention goal (e.g. buyers returning without seller link) fails **and** seller interviews cite content replay as a growth lever — not before marketplace habit exists. |
| **International shipping / tax** | Founding sellers ask for non-US buyers **and** Stripe/tax tooling is scoped; until then US addresses only (`allowed_countries: ["US"]`). |
| **Native iOS / Android apps** | Mobile-web/PWA bar is met (`docs/NATIVE_APP_DECISION.md`) **and** habitual return, push reliability, or seller phone publishing becomes a measured bottleneck. **Not** for invite-only founding drops. |

**Mobile bar for first marketing:** mobile web + PWA on shop links — not app store
binaries. Details: **`docs/NATIVE_APP_DECISION.md`**.

## ⚠️ Before marketing (remaining)

Use **`docs/PRE_MARKETING_TEST.md`** — the full two-person checklist. Short list:

- [ ] Complete pre-marketing test pass (seller + buyer dry-run drop)
- [ ] Real purchase end-to-end with emails to real inboxes (not Resend sandbox)
- [ ] k6 smoke on a published shop URL (already passed once; re-run after major changes)
- [ ] Optional: attorney review of `/legal/terms` and `/legal/privacy`
- [ ] Mobile web + PWA bar on a real shop link (Phase 20 in pre-marketing test)

**Not part of first marketing gate:** flipping to marketplace Explore — see non-goals
table above.

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
- Deferred items with revisit triggers — see **Not for first marketing** above and
  `docs/ROADMAP.md` § "Deferred"
- Nonce-based strict CSP; per-viewer avatar stack in the room
- **Painterly marketing rebrand (exploration):** direction + sample heroes in
  `docs/rebrand-exploration/PAINTERLY_DIRECTION.md` and `public/rebrand-samples/`.
  Local preview at `/rebrand-samples` (dev only). No product UI change until an
  owner picks a lane (Dusk Park vs Rooftop Blue Hour recommended).
