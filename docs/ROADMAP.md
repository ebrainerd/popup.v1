# PopUp — Build Roadmap

Built in vertical, demoable slices. Decisions follow the design doc plus the
defaults agreed at kickoff.

## ✅ Milestone 1 — Foundation (current)

- Project scaffold: Next.js 16 (App Router) + Tailwind v4 + UI kit + PWA
- Supabase clients (browser/server/middleware) + service-role helper
- Full schema + RLS: `profiles`, `shops`, `products`, `orders`, `shop_follows`,
  `ratings`, `chat_messages`, storage buckets and policies
- Auth: email/password + Google OAuth, signup → auto profile, session refresh
  middleware, `/dashboard` route guard
- Seller dashboard: stats, month calendar, grouped shop lists
- Shop create/edit/extend/delete; product add/delete; image uploads to Storage
- Explore feed (All / Live now / Opening soon) + live countdowns
- Public shop page (countdown, live embed, products, follow)
- Public seller profiles

## ✅ Milestone 2 — Realtime & live (current)

- **Bug fix:** "Live now" Explore tab now shows currently-open shops (not only
  shops that are actively streaming)
- One **Supabase Realtime channel per shop** (`shop:{id}`) shared by presence +
  broadcast (`src/components/shop-room.tsx`)
- Live viewer **presence** count + **peak viewers** recorded via the
  `bump_peak_viewers` RPC
- Real-time **chat** (text + quick emoji), server-side **profanity filter** and
  per-user **rate limit**, seller **mute** with a public "muted by seller"
  notice and `shop_mutes` + RLS enforcement
- **Flash drops**: temporary discount on an existing product + flash-only items,
  broadcast to all connected viewers instantly (seller controls on the shop page)
- **Notifications**: web push (VAPID) + email (Resend) to followers when a
  seller **goes live**; graceful no-op when keys aren't configured

### Notes / limitations

- "Opening" (time-based) notifications need a scheduler (Supabase cron / Edge
  Function) since there's no server event at open time — deferred. Go-live
  notifications fire on the seller's "Go live" action.
- Live video embed appears on page load; toggling live does not yet hot-swap the
  embed for already-connected viewers (chat/presence/flash drops do update live).

## ✅ Milestone 3 — Payments, orders & ratings (current)

- **Stripe Connect (Express)** onboarding via the Payouts page; dashboard banner
  prompts sellers to connect. `account.updated` webhook syncs status.
- **Stripe Checkout** (hosted) per item, collects shipping address, adds the
  shop's flat shipping rate as a shipping option, honors active flash discounts.
- **Webhook** (`/api/stripe/webhook`) records orders idempotently, stores the
  9% platform fee (`PLATFORM_FEE_BPS`), and decrements stock.
- **Separate charges & transfers** payout model: funds held on the platform and
  transferred to the seller (amount − 9%) after shipping. Hold window is
  `RELEASE_DELAY_HOURS` (default 72h); `/api/cron/release-funds` releases
  eligible orders on a schedule. Set `RELEASE_DELAY_HOURS=0` to release on
  "mark shipped" for local testing.
- **Order management:** buyer order history (`/orders`) with tracking + confirm
  receipt; seller order table with mark-shipped + tracking/carrier.
- **Ratings:** unlocked once an order is delivered/received; aggregate rating
  shown on profiles and shop cards (kept in sync by a DB trigger).

### Notes / limitations

- Real carrier "In Transit" lookup is deferred (Phase 2). MVP uses the
  time-based hold described above.
- Checkout total = item price (or flash price) + the shop's flat shipping rate.
- US shipping addresses only in MVP (`allowed_countries: ["US"]`).

## MVP complete 🎉

All three milestones are in. Post-MVP candidates: scheduled "opening soon"
notifications (cron), live-embed hot-swap, and polish items that do not block
invite-only seller-led marketing.

**First marketing scope:** seller-led link drops in `invite_only` mode. Several
post-MVP ideas are explicitly **deferred** — see below and `docs/HANDOFF.md` §
"Not for first marketing".

## Deferred — not for first marketing (revisit triggers)

| Item | Status | Revisit when |
| ---- | ------ | ------------ |
| **Marketplace Explore** (`NEXT_PUBLIC_DISCOVERY_MODE=marketplace`) | Built; off in prod | Supply gates in `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` (≥10 drops / 14d, ≥3 proven creators, etc.) |
| **Categories / recommendations** | Not built | Marketplace live + Explore needs curation; algorithms only after manual curation ships |
| **Carrier tracking APIs** | Manual tracking + time hold | Support/dispute pain or ≥50 shipped orders/month needing auto in-transit |
| **Likes / clips / replays / social graph** | Not built | Retention metrics + seller demand for replay-led growth |
| **International shipping / tax** | US only | Founding seller demand + tax/shipping vendor scoped |
| **Native iOS / Android apps** | Not built | `docs/NATIVE_APP_DECISION.md` — PWA bar met **and** push habit / publisher pain measured |

Shipped since this list was written: opening-soon notifications (cron), auctions,
native PopUp Live (LiveKit), invite-only mode, shop layout archetypes.

## Open items / decisions (from design doc §11)

- **In Transit confirmation:** MVP uses seller-marked shipped + 72h time-based
  release. Carrier API lookup → Phase 2.
- **Rating trigger:** "Confirm receipt" button OR 7 days post-ship.
- **Shop end during active checkout:** allow a short grace window to complete
  in-flight checkouts; block new ones.
- **Chat retention:** persist all; render the most recent ~200 per shop.
- **Rate limiting:** per-user message throttle + keyword filter.
