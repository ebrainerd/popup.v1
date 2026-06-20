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

## 🔜 Milestone 2 — Realtime & live

- Supabase Realtime channels per shop
- Live viewer **presence** + peak viewer tracking
- Real-time **chat** (text + emoji), seller mute (public notice), keyword
  profanity filter (Edge Function), per-user rate limit
- **Flash drops**: temporary discount on existing product + flash-only items,
  broadcast to all connected viewers instantly
- Web push + email notifications when a followed seller opens / goes live

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
