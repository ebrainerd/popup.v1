# PopUp Product UX Review

**Date:** June 24, 2026  
**Reviewer:** Cursor Cloud Agent  
**Production URL:** https://www.popupdrop.co (invite-only mode)  
**Review method:** Codebase audit of all routes and user flows, local stack testing (`npm run dev` + Supabase), Playwright smoke tests, and interactive browser walkthrough on localhost.

> **Note (June 2026):** This review predates the custom domain and several shipped
> fixes (seller terms gate, native live, legal pages). Use `docs/PRE_MARKETING_TEST.md`
> for current launch validation; treat P0 items below as historical unless still open.

---

## Executive summary

PopUp has a **strong visual identity** and **clear seller positioning** for invite-only launch. The gradient hero, glass cards, and countdown-driven copy communicate urgency well. Core routing and SSR are solid (build + smoke tests pass).

However, several issues **block or confuse new users**, especially on mobile and at signup:

| Severity | Issue | Impact |
| -------- | ----- | ------ |
| **P0** | Captcha/Turnstile mismatch in production | Email signup fails if Supabase captcha is on but `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing |
| **P0** | No mobile navigation (fixed in this PR) | Mobile users couldn't reach Home / How it works / About without typing URLs |
| **P1** | Seller profiles hid all shops in invite-only mode (fixed in this PR) | Followers saw empty profiles despite active link-only drops |
| **P1** | Following empty state linked to `/search` → `/sell` (fixed in this PR) | Buyer journey dead-ended confusingly |
| **P1** | Legal template banners visible in production | Undermines trust (`NEXT_PUBLIC_APP_ENV=production` now hides them) |
| **P2** | Signup copy is seller-only | Buyers joining a drop see "Start selling on PopUp" |
| **P2** | Global 404 said "This shop has closed" for every URL | Misleading for non-shop pages (split into global + shop 404s) |

**Verdict for a new user:** The homepage is inviting and the product story is understandable within ~10 seconds. A creator would feel motivated to sign up. A **buyer arriving via a shop link** has a good in-drop experience (waiting room, countdown, chat). A buyer landing on the homepage may not realize they don't need an account until checkout — that's acceptable but could be clearer.

---

## User flows tested

### Public / marketing (unauthenticated)

| Flow | Route | Status | Notes |
| ---- | ----- | ------ | ----- |
| Homepage (invite-only) | `/` | ✅ | Strong hero, 7 capability cards, dual CTAs |
| How it works | `/sell` | ✅ | Feature grid + CTA; copy is seller-focused (correct for launch) |
| About | `/about` | ✅ | Clear mission; Gmail contact feels early-stage |
| Explore holding | `/explore` | ✅ | Correct invite-only messaging; no broken marketplace |
| Search | `/search` | ✅ | Redirects to `/sell` in invite-only (intentional) |
| Login | `/login` | ✅ | Clean card layout, Google OAuth, email/password |
| Signup | `/signup` | ⚠️ | UI works; **production captcha config may block signup** |
| Terms / Privacy | `/legal/*` | ✅ | Comprehensive; template notice hidden in production |
| Global 404 | `/not-a-page` | ✅ | Generic message after fix |
| Shop 404 | `/shop/{bad-uuid}` | ✅ | Shop-specific "closed" messaging |
| Theme toggle | header | ✅ | Instant dark ↔ light switch |

### Authentication

| Flow | Status | Notes |
| ---- | ------ | ----- |
| Email signup (local) | ✅ | Works when Supabase captcha is disabled |
| Email signup (prod risk) | ❌ | Supabase Turnstile enabled without site key → `captcha_token not found` |
| Google OAuth | ⚠️ | Not tested end-to-end (requires prod OAuth wiring) |
| Dashboard guard | ✅ | Unauthed `/dashboard` → `/login?redirectTo=...` |
| Post-login redirect | ✅ | `redirectTo` param respected |

### Seller journey (code + partial local test)

| Flow | Route | Status | Notes |
| ---- | ----- | ------ | ----- |
| Dashboard overview | `/dashboard` | ✅ | Stats, Stripe payout nudge, shop sections, calendar |
| Create shop | `/dashboard/shops/new` | ✅ | SessionStorage draft persistence, schedule defaults |
| Manage shop | `/dashboard/shops/[id]` | ✅ | Launch checklist, products, publish, orders, drop report |
| Payouts | `/dashboard/payouts` | ✅ | Stripe Connect onboarding |
| Public shop (owner) | `/shop/[id]` | ✅ | Manage link, auction/flash controls when live |
| Share drop card | shop waiting room | ✅ | Copy link + social captions — excellent creator tool |

### Buyer journey

| Flow | Route | Status | Notes |
| ---- | ----- | ------ | ----- |
| Open shop link | `/shop/[id]` | ✅ | Waiting room, reminders, follow, announcements |
| Live shop | `/shop/[id]` | ✅ | Embed, chat, products grid, checkout |
| Orders | `/orders` | ✅ | Empty state invite-only copy is correct |
| Post-checkout | `/orders?checkout=success` | ✅ | Celebration + follow CTA |
| Following | `/following` | ✅ | Fixed empty state for invite-only |
| Seller profile | `/u/[username]` | ✅ | Fixed to show link-only shops when following |

---

## Layout & visual critique

> **Update (July 2026):** Shop **page layout** customization ships **two pickable
> layouts** — **The Room** (`classic`) and **Lookbook** (`catalog`). Legacy
> **Live Stage** (`broadcast`) and **Drop Clock** (`countdown`) are retired from
> the picker and fold into The Room via `normalizeLayout()`. See
> `docs/SHOP_LAYOUT_ARCHETYPES.md` for the spec and `docs/MANUAL_TESTING.md`
> for the two-layout smoke matrix. The single "Shop page grid" treatment
> described below is **The Room** (`classic`).

### What works well

1. **Hero gradient** (coral → purple) — distinctive, energetic, matches "pop-up event" positioning.
2. **Glass cards** with hover lift — polished without feeling generic.
3. **Typography** — Geist, strong weight contrast, readable at all breakpoints.
4. **Dark-default theme** — fits "night market" metaphor; light mode is a nice option.
5. **Shop page grid** — Products + sidebar (chat or announcements) scales well on desktop.
6. **Countdown components** — Reinforce scarcity throughout the product.

### Areas to improve

1. **Mobile header density** — Logo + menu + theme + two auth buttons is tight at 375px. Consider collapsing "Log in" to icon-only on xs screens.
2. **Capability card grid** — 7 cards on homepage leaves an orphan card on large screens (3+3+1). Consider 6 cards or a 2×4 layout.
3. **Seller vs buyer visual language** — Almost every page speaks to creators. Buyers need one "I'm here to shop" line on homepage and signup.
4. **Dashboard information density** — Manage-shop page is long (form + products + orders + checklist). Consider tabs or sticky section nav for mobile sellers.
5. **Footer** — Functional but minimal; no social proof, no "As seen in", no example shop link for skeptics.
6. **Logo** — "P" monogram is fine for MVP; a custom mark would help shareability and app icon recognition.

---

## Marketing copy critique & suggestions

### Homepage hero (current)

> **Headline:** Online pop-up shops with live auctions in one link.  
> **Subhead:** Create a timed shop, share it anywhere, run live auctions or Buy Now drops, and sell before the clock runs out.

**Assessment:** Clear for creators. "Buy Now drops" slightly overlaps ecommerce jargon.

**Suggested A/B variants:**

- **Benefit-led:** "Your audience. One link. One countdown."  
- **Outcome-led:** "Sell out a drop in an hour — without building a store."  
- **Buyer-inclusive subhead:** "Creators schedule timed shops; fans join the waitlist, bid live, and checkout before the clock hits zero."

### Nav CTA (invite-only)

Current: **Create shop** (header) vs **Create a pop-up shop** (hero).

**Suggestion:** Unify to one phrase — e.g. **"Open your shop"** everywhere.

### Signup page (current)

> Start selling on PopUp  
> Create your account to launch time-boxed drops in minutes.

**Problem:** Buyers who create an account to bid or checkout see seller onboarding language.

**Suggestion:**

```
Create your PopUp account
Join drops, bid in live auctions, and track your orders.
```

Add secondary line for sellers: "Want to run a drop? You'll create your first shop right after signup."

### About page — strong, keep

The "every drop is an event" framing is excellent. Consider adding one sentence on **buyer trust**: Stripe payments, seller ratings, order tracking.

### /sell page headline (current)

> Run live auctions from your own shop link.

**Suggestion:** Add social proof placeholder when available: "Join creators running timed drops on PopUp" + 2–3 testimonial cards.

### Footer tagline

Current (invite-only): "Online pop-up shops in one link." — Good. Keep.

---

## New-user lens

| Question | Answer |
| -------- | ------ |
| **Is it inviting?** | Yes for creators — vibrant design, low friction CTAs. Buyers need clearer "got a link?" guidance (partially present). |
| **Is it easy to use?** | Mostly. Shop creation flow is well guided (launch checklist, share card). Mobile nav was a gap (fixed). |
| **Is it easy to understand?** | Yes within one scroll. Invite-only positioning is honest. "Live auctions" may need a 5-second explainer for non-eBay users. |
| **Would I trust it with money?** | Stripe helps. Gmail support email and `vercel.app` domain hurt trust — custom domain is the biggest branding win (see HANDOFF). |
| **Would I share it?** | Share drop card with pre-written captions is a standout feature. |

---

## Technical / operational findings

1. **Production captcha:** Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel **and** the matching secret in Supabase Auth → Captcha. *(Configured on popupdrop.co.)*
2. **Custom domain:** Now live at `popupdrop.co` / `www.popupdrop.co` — see `docs/HANDOFF.md`.
3. **Drop reminder cron:** Wired via cron-job.org every 15 min (Hobby-safe); see `docs/DEPLOYMENT.md`.
4. **Buyer emails:** Resend domain verified; order emails send from `popupdrop.co`. `/about` lists `support@popupdrop.co`.

---

## Changes included in this PR

| Change | File(s) |
| ------ | ------- |
| Mobile hamburger navigation | `src/components/mobile-nav.tsx`, `src/components/site-header.tsx` |
| Invite-only following empty state | `src/app/following/page.tsx` |
| Show link-only shops on seller profiles in invite-only mode | `src/app/u/[username]/page.tsx` |
| Friendlier captcha misconfiguration errors | `src/app/(auth)/actions.ts` |
| Hide legal template banners in production | `src/components/legal-template-notice.tsx`, legal pages |
| Split global vs shop 404 messaging | `src/app/not-found.tsx`, `src/app/shop/[id]/not-found.tsx` |

---

## Recommended follow-up (not in this PR)

### P0 — Owner actions

1. Wire Turnstile site key + Supabase captcha secret (or disable captcha).
2. Purchase and point custom domain at Vercel; update `NEXT_PUBLIC_SITE_URL`, Resend, OAuth, Stripe webhook.
3. Verify production deploy is healthy (503 was reported externally; DNS failed in review VM).

### P1 — Product / UX

4. Dual-path signup copy (buyer vs seller).
5. Homepage "Got a link?" callout — make it a visual card with example URL pattern (`popup.app/shop/...`).
6. Password visibility toggle on auth forms.
7. Mobile dashboard: tabbed manage-shop layout.
8. Add 1–2 screenshot/demo video on `/sell` (creators need to *see* the room).

### P2 — Polish

9. Social proof section on homepage when creators are available.
10. Branded email + support address on custom domain.
11. `manifest.webmanifest` + PWA install prompt on shop pages for repeat buyers.
12. Explore re-enable checklist when switching `NEXT_PUBLIC_DISCOVERY_MODE=marketplace`.

---

## Test evidence

- `npm run typecheck` — pass  
- `npm run lint` — pass  
- `npm run test` — pass  
- `npm run build` — pass  
- `npm run test:e2e` — 5/5 smoke tests pass  
- Local HTTP: all public routes return 200; protected routes redirect correctly  

---

## Appendix: route map

```
/                     → Invite-only homepage (seller-led)
/sell                 → How it works (seller features)
/about                → Mission + contact
/explore              → Holding page (invite-only) or marketplace feed
/search               → Creator/shop search (marketplace only)
/login, /signup       → Auth
/dashboard            → Seller hub (auth)
/dashboard/shops/new  → Create shop
/dashboard/shops/[id] → Manage shop
/dashboard/payouts    → Stripe Connect
/shop/[id]            → Public drop page (buyer + seller room)
/u/[username]         → Seller profile
/orders               → Buyer order history (auth)
/following            → Followed creators (auth)
/legal/terms|privacy  → Legal
```
