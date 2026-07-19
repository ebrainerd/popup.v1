# PopUp — Project Handoff and Status

Living document for humans and agents. Update this file when status changes.

## What PopUp is

PopUp is a web app for time-boxed virtual pop-up shops. Sellers open a shop on a
schedule. They go live with **PopUp Live** (LiveKit) or a YouTube or Twitch
embed. They run flash drops and live auctions. They sell physical goods.

Buyers open shops by direct link in **invite-only** mode. In **marketplace**
mode, buyers can also use Explore. Buyers can follow creators, chat in the room,
and check out with Stripe.

**Stack:** Next.js 16 (App Router) + Tailwind v4 + Supabase + Stripe + LiveKit +
Vercel.

**Tagline:** Shops that live for the moment.

**Tagline pairing:** Live streaming, auctions and real-time chat.

## Production

| Item | Value |
| ---- | ----- |
| **Site** | https://www.popupdrop.co (`popupdrop.co` redirects to www) |
| **Discovery mode** | `invite_only` (default). Shops use links only. Explore is a holding page. |
| **Stripe** | Live mode |
| **Email** | Resend on verified `popupdrop.co` domain |
| **Migrations (repo tip)** | Through **`0029_auction_stock_decrement.sql`**. Apply files in order. Hosted production may lag the repo tip. |

## Where to look

| Topic | File |
| ----- | ---- |
| Run locally and scripts | `README.md` |
| Pre-marketing manual test (full checklist) | `docs/PRE_MARKETING_TEST.md` |
| Marketing launch gate (GO / NO-GO) | `docs/MARKETING_LAUNCH_GATE.md` |
| Feature roadmap (M1–M3 shipped) | `docs/ROADMAP.md` |
| Creator-led drop loop PRD (historical) | `docs/CREATOR_DROP_LOOP.md` |
| Invite-only launch plan (historical + Explore gates) | `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` |
| Live auctions PRD (shipped) | `docs/AUCTIONS_PRD.md` |
| Native live streaming | `docs/NATIVE_LIVE_STREAMING.md` |
| Product UX review notes (historical) | `docs/PRODUCT_UX_REVIEW.md` |
| Shop layout archetypes | `docs/SHOP_LAYOUT_ARCHETYPES.md` |
| Native app decision | `docs/NATIVE_APP_DECISION.md` |
| Testing and CI | `docs/TESTING.md` |
| Manual post-feature checklists | `docs/MANUAL_TESTING.md` |
| Auth and profile signup flows (shipped) | `docs/AUTH_PROFILE_ROADMAP.md` |
| Deploy, env vars, go-live checklist | `docs/DEPLOYMENT.md` |
| Production launch and load testing | `docs/PRODUCTION_READINESS.md` |
| Marketing playbook | `docs/MARKETING.md` |
| k6 load scripts | `scripts/load/README.md` |
| Cloud-agent run notes (Docker / Supabase) | `AGENTS.md` |
| DB schema | `supabase/migrations/*.sql` (apply in order) |
| Figma design system / brand | [PopUp Design System](https://www.figma.com/design/AObYmWZZML1UhGVHetDoVw) |

## Brand identity (Ember Market)

Direction is locked (Figma Color Proposal and Logo pages).

| Decision | Choice |
| -------- | ------ |
| Palette | **Ember Market** (dark + Ember light) in `globals.css` |
| Type | **Syne ExtraBold** for logo only. **Geist** for UI. **Geist Mono** for timers. |
| Logo lockup | **L2** — arcs mark + Syne tick (`src/components/logo.tsx`, icons, OG) |
| Light mode | Ember light (warm paper `#FAF8F4`) |
| Motion / surfaces | Ember charcoal base `#14100C` + CSS-variable glows |
| Seller shop accents | Warm family only (ember / amber / terracotta / gilt) |
| Tagline | **Shops that live for the moment.** |
| Tagline pairing | **Live streaming, auctions & real-time chat.** (`src/lib/brand-copy.ts`) |

### Done in app

- [x] Ember tokens + brand gradient / ambient orbs
- [x] Warm shop presets + accent swatches
- [x] L2 logo component + favicon / maskable / `icon.svg` + `og.jpg`
- [x] Marketing Remotion / seed demo accents aligned
- [x] Tagline + pairing in hero, metadata, footer, manifest
- [x] Figma Color / Primitives variables synced to Ember (kit component paints may still need a pass)

## Status (high level)

All three MVP milestones shipped and run in production. Post-MVP work also
shipped:

- Navigation, Explore (marketplace mode), search, draft to publish, inventory
  reservations, light / dark theme, buyer order detail, full order-email lifecycle
- **Invite-only launch mode** (`NEXT_PUBLIC_DISCOVERY_MODE=invite_only`)
- Multiple photos per product, $0.50 minimum price, HEIC uploads
- **Live auctions** (`docs/AUCTIONS_PRD.md`)
- **Native PopUp Live** (LiveKit) + live reminders (`0018`–`0019`)
- **Seller terms gate** on first shop create (`0020`)
- OAuth profile onboarding (`0021`)
- Auction auto-queue and pre-bids (`0022`, `0024`)
- Security hardening (`0025`)
- Products and orders realtime (`0026`, `0028`)
- Support tickets at `/support` (`0027`)
- Auction stock decrement fix (`0029`)
- Expanded legal pages (`/legal/terms`, `/legal/privacy`) — `legal@popupdrop.co`
- k6 shop smoke runner: `npm run load:shop-smoke -- <shop-url>`
- **Shop layout archetypes** (`docs/SHOP_LAYOUT_ARCHETYPES.md`) — phases 0–6 done

### Shop layouts (pickable today)

| Layout | Slug | Behavior |
| ------ | ---- | -------- |
| **The Room** | `classic` | Stream + chat first; products below |
| **Lookbook** | `catalog` | Products first; stream band below |

Defined in `SHOP_PICKABLE_LAYOUTS`. Legacy `broadcast` (Live Stage) and
`countdown` (Drop Clock) are retired from the picker. They fold into `classic`
via `normalizeLayout()`. Enum slugs may remain in the DB for compatibility.

Smoke: `docs/MANUAL_TESTING.md` → shop layouts + mobile room; pre-marketing
Phase 17.

## Shop layout archetypes — COMPLETE (Phases 0–6)

**Spec:** `docs/SHOP_LAYOUT_ARCHETYPES.md`. Implementation is complete. The
seller picker ships two layouts (The Room + Lookbook). Retired slugs remain in
the enum for backward compatibility only.

- **Phases 0–3, 5:** metadata + defaults, editor archetype picker + preview phase
  toggle, buyer-page parity for Lookbook (`catalog`) and The Room (`classic`).
- **Phase 4 — Drop Clock (`countdown`):** built, then folded into The Room for
  the narrowed picker (`normalizeLayout`).
- **Phase 6 — QA and docs:** smoke matrices in `docs/MANUAL_TESTING.md`. Prefer
  the two pickable layouts for ongoing QA. Automated gate
  (`typecheck` / `lint` / `test` / `build`) green.

### Key files

```
src/lib/shop-theme.ts
src/components/shop-theme-editor.tsx
src/components/shop-theme-preview.tsx
src/components/shop-page-view.tsx
src/components/stream-slot.tsx
```

### Re-verify layout work

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Then walk `docs/MANUAL_TESTING.md` → "Shop layout archetypes".

Local-stack note: a stale DB volume can leave migrations partly applied (for
example missing `profiles.follower_count`). Owner shop pages then 404 on valid
shops. Run `supabase db reset` to re-apply all migrations and `seed.sql` grants.

Keep the customize preview and buyer page in sync when you change a layout.
Cross-links exist in `shop-page-view.tsx` and `shop-theme-preview.tsx`.

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
- [x] Hosted migrations applied through at least `0022` (apply any later repo
      migrations through `0029` in order)
- [x] M365 aliases: `legal@popupdrop.co`, `support@popupdrop.co` → owner inbox

## Marketing gate (GO / NO-GO)

**Gate:** One founding seller can run a real drop to a phone-heavy audience.
Money clears. Emails land. The seller wants to schedule the next drop.

**Current status: NO-GO** — see the scored checklist in
**`docs/MARKETING_LAUNCH_GATE.md`**.

Engineering readiness on mainline (mobile room, seller kit, trust copy,
non-goals) does **not** replace the human production dry-run.

## Not for first marketing (non-goals)

First marketing is **invite-only, seller-led drops**. Sellers bring buyers via
shop link. PopUp is not a large marketplace yet. The items below are out of
scope for the first marketing gate. Each row has a revisit trigger.

| Non-goal | Revisit when |
| -------- | ------------ |
| **Marketplace Explore** (`NEXT_PUBLIC_DISCOVERY_MODE=marketplace`) | At least **10** upcoming public drops in the next **14 days**, at least **3** creators with prior successful drops, and at least **1** drop in the next **48h** on most days. Then flip mode and run `docs/PRE_MARKETING_TEST.md` Phase 21. See `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` section "When to reintroduce Explore". |
| **Categories / recommendations** | Marketplace mode is live **and** Explore has enough listings that unfiltered "All" feels noisy. Start with manual curation (`featured_at`), not algorithms. |
| **Carrier tracking APIs** (Shippo / EasyPost / AfterShip) | Seller support volume or payout disputes show that manual tracking links are a recurring pain, **or** at least **50** shipped orders per month need automated in-transit status. Until then: seller-entered tracking + time-based hold (`RELEASE_DELAY_HOURS`). |
| **Likes / clips / replays / deep social graph** | A measured retention goal fails **and** seller interviews cite content replay as a growth lever. Do not start before marketplace habit exists. |
| **International shipping / tax** | Founding sellers ask for non-US buyers **and** Stripe/tax tooling is scoped. Until then US addresses only (`allowed_countries: ["US"]`). |
| **Native iOS / Android apps** | Mobile-web / PWA bar is met (`docs/NATIVE_APP_DECISION.md`) **and** habitual return, push reliability, or seller phone publishing becomes a measured bottleneck. **Not** for invite-only founding drops. |

**Mobile bar for first marketing:** mobile web + PWA on shop links — not app
store binaries. Details: **`docs/NATIVE_APP_DECISION.md`**.

## Before marketing (remaining)

Use **`docs/PRE_MARKETING_TEST.md`** — the full two-person checklist. Short list:

- [ ] Complete pre-marketing test pass (seller + buyer dry-run drop)
- [ ] Real purchase end-to-end with emails to real inboxes (not Resend sandbox)
- [ ] k6 smoke on a published shop URL (re-run after major changes)
- [ ] Optional: attorney review of `/legal/terms` and `/legal/privacy`
- [ ] Mobile web + PWA bar on a real shop link (Phase 20 in pre-marketing test)

**Not part of first marketing gate:** flipping to marketplace Explore — see the
non-goals table above.

### Standing ops

- [ ] Apply new DB migrations as they land (`supabase/migrations/`, in order,
      through repo tip `0029` and later)
- [ ] Stripe webhook events: `checkout.session.completed`, `account.updated`,
      `checkout.session.expired`
- [ ] `RELEASE_DELAY_HOURS=72` in production (`0` is for staging/local only)
- [ ] `PLATFORM_FEE_BPS=900` (9%)
- [ ] Monitor Sentry, Stripe webhook logs, Supabase, LiveKit during first public drops

## Email notifications (current behavior)

All emails are best-effort. They no-op without `RESEND_API_KEY`:

- **Purchase** → buyer confirmation + seller new-sale (seller email includes shipping address)
- **Mark shipped** → buyer email with tracking link
- **Unshipped > 3 days** → seller reminder (daily `release-funds` cron)
- **Shipped, unconfirmed ~3 days** → buyer receipt nudge (max 2, ~4 days apart)
- **Drop reminders** (24h / 1h / opening) → buyer email (+ push if VAPID set); cron every 15 min
- **Go live** → followers + live-reminder subscribers (instant, no cron)
- **Support ticket** → `support@popupdrop.co`

Legal contact: `legal@popupdrop.co`. Support alias: `support@popupdrop.co`.

## Conventions for future agents

- Branch names: `cursor/<descriptive-name>-<suffix>`. One PR per logical change.
  Open as draft. Merge only when the user says so.
- Before pushing, run: `npm run typecheck && npm run lint && npm run test &&
  npm run build`, and `npm run test:e2e` for UI changes (build first).
- After UI or integration features, walk the relevant checklist in
  `docs/MANUAL_TESTING.md` or `docs/PRE_MARKETING_TEST.md` for launch-affecting work.
- Env vars are documented in `docs/DEPLOYMENT.md` (full reference + checklist).
- Hand-maintained `src/lib/database.types.ts` mirrors the migrations. Update it
  with any schema change (or regenerate via `npm run db:types`).
- Realtime: one Supabase channel per shop (`src/components/shop-room.tsx`) with
  presence + broadcast. Use `emit` (not `broadcast`) when the sender UI must also
  update (Realtime does not echo to the sender).

## Known future work / ideas

- Scale hardening (Realtime connection limits, Explore caching) — k6 smoke in `scripts/load/`
- Deferred items with revisit triggers — see **Not for first marketing** above and
  `docs/ROADMAP.md` section "Deferred"
- Nonce-based strict CSP; per-viewer avatar stack in the room
