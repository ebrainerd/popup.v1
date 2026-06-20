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

## 🔜 Milestone 3 — Payments, orders & ratings

- Stripe Connect (Express) onboarding triggered on first shop creation
- Stripe Checkout (shipping address collected; flat shipping in price)
- Webhook creates orders, applies 9% platform fee (`PLATFORM_FEE_BPS`)
- Fund release after "Shipped" + time-based "In Transit" fallback (72h)
- Buyer/seller order views, tracking number + carrier
- Ratings unlocked on receipt confirmation or 7 days after shipped

## Open items / decisions (from design doc §11)

- **In Transit confirmation:** MVP uses seller-marked shipped + 72h time-based
  release. Carrier API lookup → Phase 2.
- **Rating trigger:** "Confirm receipt" button OR 7 days post-ship.
- **Shop end during active checkout:** allow a short grace window to complete
  in-flight checkouts; block new ones.
- **Chat retention:** persist all; render the most recent ~200 per shop.
- **Rate limiting:** per-user message throttle + keyword filter.
