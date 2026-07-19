# Native app decision — when to build iOS/Android

**Status:** Docs-only decision record. No native app work is planned or required for
first marketing.

**Last reviewed:** July 2026. Decision unchanged for invite-only first marketing.

PopUp's first marketing phase is **invite-only, seller-led drops**: buyers arrive via
a seller's link, watch/bid/buy in the browser, and leave. That loop does not require
App Store or Play Store binaries. This doc defines when native becomes worth the
cost, what mobile web must prove first, and what to build if/when we start.

**Related:** `docs/HANDOFF.md` (non-goals), `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md`
(Explore gates), `docs/PRE_MARKETING_TEST.md` Phase 20 (PWA install).

---

## Not required for invite-only founding drops

| Reason | Detail |
| ------ | ------ |
| **Distribution** | Sellers share one shop link; buyers do not need to "find PopUp" in an app store. |
| **Session shape** | Most buyers are single-visit: open link → room → checkout. No habitual feed browsing yet. |
| **Seller workflow** | Create/publish/share happens on desktop or mobile web; no native-only camera/publisher APIs required for MVP drops. |
| **Push** | Web push (VAPID) + email cover drop reminders and go-live for link-driven audiences. Imperfect on iOS, acceptable when buyers opt in from a seller link. |
| **Checkout** | Stripe Checkout is hosted; no in-app purchase rules apply. |

**Bar for first marketing:** mobile web + PWA (see below), not native apps.

---

## When native becomes important

Native starts to matter when **mobile web is the bottleneck**, not when it is merely
nice to have:

| Pressure | Why web stops being enough |
| -------- | --------------------------- |
| **Habitual multi-show browsing** | Buyers follow many creators and open PopUp daily without a seller link — home-screen icon and OS-level re-engagement beat bookmarking. |
| **Reliable push** | Drop reminders and go-live must reach buyers on iOS/Android consistently; web push gaps (especially iOS background limits) measurably hurt show-up rate. |
| **Seller phone publishing pain** | Sellers routinely go live from phone, need stable background audio, camera switching, or low-latency publisher UX that mobile Safari/Chrome cannot deliver. |
| **OS integrations** | Share extensions, widgets, deep links from Instagram/TikTok into a installed app, or platform trust signals ("get the app") become part of GTM. |

Until at least one of these is **measured** (not assumed), stay on mobile web + PWA.

---

## Mobile-web / PWA bar (must hit before native)

Treat these as **release gates for seller-led marketing**, not as native prerequisites
alone:

| # | Bar | How to verify |
| - | --- | ------------- |
| 1 | **Shop link works on mobile Safari + Chrome** | Buyer can open scheduled/live shop, chat, bid (if auction), and complete Stripe Checkout without layout breakage or blocked autoplay for the chosen stream mode. |
| 2 | **Installable PWA** | `manifest.webmanifest` + service worker; add-to-home-screen from shop page (`docs/PRE_MARKETING_TEST.md` Phase 20). |
| 3 | **Reminders on real devices** | Email + web push (where supported) for 24h / 1h / opening reminders; document iOS limitations in support copy, not as a silent failure. |
| 4 | **Seller manage-shop on phone** | Publish, copy link, go live, flash drop, mark shipped — usable on a phone without horizontal scroll traps or blocking modals. |
| 5 | **Performance under load** | k6 shop smoke on a published URL; room/chat usable on mid-tier phones during a simulated peak. |

If any bar fails, fix web first. Building native to paper over a broken mobile web
shop page duplicates effort.

---

## Triggers to start native work

Start **discovery** (spike, not full build) when **both** are true:

1. **Mobile-web/PWA bar above is green** on production for at least one real founding drop.
2. **At least one** bottleneck signal below crosses a threshold:

| Signal | Suggested trigger |
| ------ | ----------------- |
| **Habitual return** | ≥ 30% of buyers with 2+ orders or 2+ reminder opt-ins across different shops within 30 days (link-acquired cohort). |
| **Push reliability** | Measured show-up rate (reminder → room join within 1h) drops ≥ 15% on iOS vs Android/desktop and support tickets cite "didn't get notified." |
| **Multi-show discovery** | `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` is live **and** median buyer opens ≥ 3 shops/week without a direct link (Explore/search habit). |
| **Seller publisher pain** | ≥ 3 founding sellers report blocking issues going live from phone (crash, background kill, unacceptable A/V latency) in a 60-day window. |

**Do not start native** because competitors have apps, because investors asked, or
before invite-only seller-led drops work end-to-end on mobile web.

---

## What to build first (if triggered)

Prefer **one thin app** over two full clients at launch.

| Priority | App surface | Rationale |
| -------- | ----------- | --------- |
| **1 — Buyer** (if push/browse is the bottleneck) | Home-screen app: followed shops, upcoming drops, push inbox, deep link → existing web shop room (WebView or shared RN WebView shell). Reuse checkout on web initially. | Matches marketplace phase and repeat buyers; smallest scope that fixes iOS push and re-open friction. |
| **1 — Seller publisher** (if go-live from phone is the bottleneck) | Seller-only app: go live (LiveKit publisher), room moderation, flash drop, copy link — dashboard elsewhere on web. | Unblocks creators who live on phone; smaller audience than buyer app. |
| **2 — Full buyer native checkout** | Only after repeat purchase volume justifies Stripe mobile SDK / Apple Pay native flows. | Hosted Checkout already works; native checkout is optimization. |

**Stack note:** LiveKit has mobile SDKs; any publisher app must align with
`docs/NATIVE_LIVE_STREAMING.md` server-side assumptions. Buyer app can remain a
shell + web room until metrics justify rewriting the room in native UI.

---

## Explicit non-goals (first marketing)

- No App Store / Play Store listing before first marketing.
- No React Native / Flutter implementation in repo until a trigger above fires.
- No "download the app" CTA on homepage or shop pages during invite-only phase.

Revisit this doc when marketplace mode ships or when founding-cohort metrics are
available (30–60 days post-first-marketing).
