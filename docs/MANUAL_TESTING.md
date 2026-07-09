# Manual testing checklist

Use this doc after shipping a feature — especially anything that touches auth,
payments, realtime, or third-party services automated tests don't fully cover.

**Pre-launch:** For a full seller + buyer walkthrough of every feature before
marketing, use **`docs/PRE_MARKETING_TEST.md`** instead. This file stays focused
on deep checks for individual features (starting with native live streaming).

**How to use it**

1. Run automated checks first: `npm run typecheck && npm run lint && npm run test && npm run build`
2. Start the app locally (see `README.md` / `AGENTS.md` for Supabase + `npm run dev`)
3. Walk through the checklist for the feature you changed
4. When you add a new feature, add a section here with numbered steps and expected results

Record pass/fail and any notes in your PR or handoff comment.

---

## Native live streaming (PopUp Live)

**Requires:** migrations `0018_native_live_stream.sql`, `0019_live_reminders.sql`, and `0020_seller_terms_accepted.sql` applied; LiveKit env vars set (`LIVEKIT_*`, `NEXT_PUBLIC_LIVEKIT_URL`, `NATIVE_LIVE_ENABLED=true`). See `docs/NATIVE_LIVE_STREAMING.md`.

### Seller — terms before shop setup

| # | Step | Expected |
| - | ---- | -------- |
| 0 | First visit to **Create shop** (`/dashboard/shops/new`) without prior acceptance | Full-screen Terms dialog; **Acknowledge** disabled until scrolled to bottom |
| 0b | Scroll to end → **Acknowledge** | Dialog closes; wizard loads; acceptance stored on profile |
| 0c | Return to **Create shop** later | Wizard opens directly (no second prompt) |

### Seller — setup & camera test

| # | Step | Expected |
| - | ---- | -------- |
| 1 | Create or edit a shop in the setup wizard → **Live stream** step | **PopUp Live** is selected by default; YouTube/Twitch URL fields hidden |
| 2 | Switch to **YouTube or Twitch**, then back to **PopUp Live** | URL fields hide again |
| 3 | Finish setup and open **Manage shop** → **Live controls** | Stream source shows **PopUp Live (in-app)**; **+15m / End shop** hidden until shop is open |
| 3b | On a **draft** shop, click **Preview shop** (publish banner or header) | Buyer page opens with **Draft preview** banner; only you can see it; purchases disabled |
| 4 | Click **Test camera & mic** (before shop opens or while open, not live) | Single preview area shows your camera; mic level bars move when you speak; **Preview — only you can see this** badge; buyers still see cover photo on shop page |
| 5 | Click **Stop preview** | Preview stops; no `is_live` change |

### Seller — go live / end live

| # | Step | Expected |
| - | ---- | -------- |
| 6 | Open the shop (or wait until `start_at`) | Shop status **Open**; go-live enabled |
| 7 | Click **Go live** (first time) | ToS modal → accept → camera preview + **LIVE** timer |
| 8 | Open the shop link in a second browser (can be logged out) | Live video within ~5s; chat/purchase still require login |
| 9 | Click **End live** on manage shop | Video stops for buyer; **cover photo** returns in stream slot; shop stays open (chat/products work) |
| 10 | Click **Go live** again | Works without re-running setup or ToS modal |

### Buyer — notify when live

| # | Step | Expected |
| - | ---- | -------- |
| 11 | On an **open** shop (seller **not** live), as a logged-in buyer click **Notify me when live** | Button toggles to subscribed state |
| 12 | Seller goes live | Subscriber receives email and/or push (if Resend/VAPID configured) |
| 13 | Seller ends live, then goes live again without buyer re-subscribing | Subscriber does **not** get a second alert |
| 14 | After step 12, seller ends live; buyer clicks **Notify me when live** again | Subscribed again; second go-live sends a new alert |
| 15 | Anonymous visitor clicks **Notify me when live** | Redirected to login with return URL |

### External stream (regression)

| # | Step | Expected |
| - | ---- | -------- |
| 16 | Wizard → choose **YouTube or Twitch**, paste a valid stream URL, publish | Manage shop shows URL-based **Go live** (not native publisher) |
| 17 | Go live with external URL | Embedded player on shop page when live |

### Error / edge cases

| # | Step | Expected |
| - | ---- | -------- |
| 18 | Deny camera permission, click **Go live** | Clear error message; no crash |
| 19 | **End shop** while live | Shop ends; `is_live` cleared; buyers see ended state |

**Note:** Camera/mic require `Permissions-Policy: camera=(self), microphone=(self)` in `next.config.ts`. If blocked at the HTTP header level, Chrome will not show a permission prompt.

---

## Auth & profile signup

**Requires:** migration `0021_profile_setup_username.sql`; Turnstile env + Supabase captcha. See `docs/AUTH_PROFILE_ROADMAP.md`.

| # | Step | Expected |
| - | ---- | -------- |
| 1 | `/signup` — username, email, password, confirm, Turnstile visible | Widget renders; account created |
| 2 | Mismatched passwords | Error before submit |
| 3 | Reserved username (`admin`) | Rejected |
| 4 | Google signup (new user) | `/onboarding` → pick username → dashboard |
| 5 | Chat / profile / orders | Shows `@username` only |

---

## Shop layout archetypes (theme & customize)

**Requires:** no special env or migrations beyond a working local stack
(`supabase start` + `npm run dev`). Spec: `docs/SHOP_LAYOUT_ARCHETYPES.md`
(§5 per-layout behavior, §10 testing matrix). Code: `src/lib/shop-theme.ts`,
`src/components/shop-theme-editor.tsx`, `src/components/shop-theme-preview.tsx`,
`src/components/shop-page-view.tsx`, `src/components/stream-slot.tsx`.

**Pickable layouts (current):** **The Room** (`classic`) and **Lookbook**
(`catalog`) — see `SHOP_PICKABLE_LAYOUTS` in `src/lib/shop-theme.ts`. Legacy
`broadcast` (Live Stage) and `countdown` (Drop Clock) are retired from the
picker and fold into The Room via `normalizeLayout()`.

Each layout reorders the buyer page; the customize **Live preview** must mirror
that order (preview drift is the most common regression here).

### Editor smoke — two layouts × two presets

Open `/dashboard/shops/[id]/customize` (or the wizard **Layout & theme** step —
same `ShopThemeEditor`). Above the preview, use the **Scheduled / Open / Live**
phase toggle and the **Desktop / Mobile** viewport toggle.

| # | Layout | Presets to try | Expected preview (Desktop) | ✓ |
| - | ------ | -------------- | -------------------------- | - |
| L1 | **The Room** (`classic`) | Market Stall (rec.) + Neon PopUp | Title (with seller bio) → **stream beside chat sidebar** (two columns) → products below. | |
| L2 | **Lookbook** (`catalog`) | Gallery (rec.) + Dark Room | Title → **product grid first** → slim stream/countdown band → reminder → chat. No oversized hero. | |

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| L3 | Pick a layout that differs from current | "Apply recommended settings for …?" prompt appears (preset, chat, grid summary) | |
| L4 | Click **Apply** | Preset/accent/toggles/grid switch to that layout's defaults; preview updates | |
| L5 | Click **Keep my settings** instead | Only `layout` changes; existing preset/toggles preserved | |
| L6 | Toggle each phase Scheduled / Open / Live | Hero swaps: countdown (Scheduled), open state, LIVE badge (Live); reminder CTA only when Scheduled + reminder toggle on | |
| L7 | Switch viewport to **Mobile** | Grid drops to readable columns; chat/countdown stay reachable; no overflow | |
| L8 | Toggle **Chat**, **Seller bio**, **Reminder button** off | Matching blocks disappear from preview | |
| L9 | Pick an accent that fails contrast on a light preset | Inline contrast warning appears above the theme list | |

### Buyer-page parity (preview ≈ production)

For each pickable layout, set it on a draft/scheduled shop and open the public
`/shop/[id]` page; the section order must match the editor preview for that
layout and phase.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| B1 | **Lookbook**, scheduled then open | Product grid is first paint above the fold; stream band capped (~40vh) below grid; seller bio shown | |
| B2 | **The Room**, open on desktop | Chat sidebar visible beside the stream without scrolling; seller bio in header | |
| B3 | Either layout, scheduled | Stream slot owns the countdown; `WaitingRoomBanner` is **status-only** (final stretch / on the list), not a second clock | |
| B4 | Either pickable layout on mobile 375px | Hero/stream visible; products and checkout usable; chat accordion collapsed by default | |

### Shop room mobile smoke (~375px)

Quick pass after mobile layout changes — use Chrome DevTools iPhone SE / 375px width.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| M1 | **The Room** (`classic`), scheduled | Stream countdown visible; chat accordion collapsed by default; no duplicate `WaitingRoomBanner` countdown | |
| M2 | **The Room**, open | Expand chat → ~40vh max height; message input does not zoom page on focus (16px) | |
| M3 | **Lookbook** (`catalog`), open | Product grid first; stream band below; chat collapsed until expanded | |
| M4 | Product card with auction lot | Price stacks above full-width bid row; max-bid input usable without horizontal squeeze | |
| M5 | Live auction panel while lot is live | Bid row stacks on narrow width; thin sticky bottom bar shows timer + Bid; panel not hidden behind bar | |
| M6 | Customize preview, mobile viewport | Chat stub collapsed by default; expands to taller stub (matches buyer page behavior) | |

---

## Seller success kit

**Requires:** published or scheduled shop on `/dashboard/shops/[id]`; local stack or hosted
backend with a seller account that has accepted terms and connected payouts (if Stripe
enabled).

| # | Step | Expected |
| - | ---- | -------- |
| S1 | Open manage page for a **published scheduled** drop | **Drop health** strip shows waitlist count, follower count, units left, and opening time |
| S2 | Same page | **Share your drop** card shows shop URL, caption previews (with URL), copy link, and native share |
| S3 | Copy a caption or shop link | Launch checklist **Promotion → Shop link copied** marks done (persists on refresh) |
| S4 | Tap other promotion pills (IG/TikTok, pin link, 1h-before) | Each toggles to done and persists in localStorage |
| S5 | End a drop (or open an ended shop) | **Drop report** shows waitlist signups, narrative for repeating, **Duplicate this drop** is primary CTA |
| S6 | Buyer: complete an order → `/orders` | Post-purchase card **Share shop** copies caption + link (or opens native share) |

---

## Seller mobile forms

**Requires:** iPhone Safari (or iOS Simulator); seller shop setup or manage page with text inputs and selects.

| # | Step | Expected |
| - | ---- | -------- |
| F1 | Focus a text input or textarea on a seller form (e.g. product title, shop name) | Page does not zoom in on focus |
| F2 | Blur the field after typing | Zoom level returns to normal (no sticky zoom) |
| F3 | Open a native `<select>` (e.g. auction duration, flash product picker) | Same — no focus zoom on mobile |

---

## Dashboard — copy shop link

**Requires:** seller account with at least one draft and one published/scheduled shop on `/dashboard`.

| # | Step | Expected |
| - | ---- | -------- |
| D1 | Open `/dashboard` → **Drafts** row | Link icon appears before view/manage; `aria-label` is "Copy shop link" |
| D2 | Click copy on a draft | Icon swaps to check (~1.5s); clipboard has `https://…/shop/{id}` (draft preview URL) |
| D3 | **Published / scheduled** row | Same copy control; pasted URL opens the shop (or scheduled buyer page) |
| D4 | Paste URL in a new tab while logged out | Draft shows preview banner; published shop loads normally |

---

## Duplicate product (shop manager / setup wizard)

**Requires:** seller account with a shop in setup or on `/dashboard/shops/[id]` manage page.

| # | Step | Expected |
| - | ---- | -------- |
| D1 | Open **Products** in setup wizard or manage page with at least one saved product | Each product row shows Edit, **Duplicate** (copy icon), and Delete |
| D2 | Click **Duplicate** on a buy-now product | New row appears **immediately below** the original with title `… (copy)`; editor opens with copied price, qty, shipping, photos, description |
| D3 | Save without changes (manage page) | Autosave inserts a **new** DB row; original product unchanged |
| D4 | Duplicate an **auction** product | Clone keeps sale type, starting bid, increment, duration, prebid/sudden-death toggles |
| D5 | Edit duplicate title (e.g. color variant) and save | Both products persist as separate rows |

---

## Stripe Connect — cancel / incomplete return

**Requires:** Stripe keys configured (`STRIPE_SECRET_KEY`); seller account without completed
Connect onboarding. Start from a shop manage page with the payments banner.

| # | Step | Expected |
| - | ---- | -------- |
| P1 | On `/dashboard/shops/[id]`, click **Set up payouts** (or **Finish setup**) | Redirected to Stripe Connect onboarding |
| P2 | Cancel or close Stripe before finishing (or use browser back) | Land on `/dashboard/payouts?status=return&redirectTo=...` |
| P3 | Incomplete return page | Banner: payout setup isn&apos;t finished; full-width **Back to shop** (or dashboard) CTA; page not cropped / scrolled oddly on mobile |
| P4 | Wait ~6s or tap **Back to shop** | Return to the shop manage page (or dashboard if no `redirectTo`) |
| P5 | Complete Stripe onboarding instead | Auto-redirect to the original `redirectTo` destination |

---

## Unshipped orders (seller fulfillment)

**Requires:** local stack with a seller account; at least one shop with a completed checkout
(Stripe test mode or local webhook). Paid orders use `status === "paid"` until marked shipped.

| # | Step | Expected |
| - | ---- | -------- |
| U1 | Complete a buyer checkout for a physical item | Order appears in seller **Dashboard** banner: “N sale(s) waiting to ship” with **Manage sales** |
| U2 | Dashboard header **Sales** button | Badge shows same unshipped count; links to `/dashboard/sales` |
| U3 | Open **Sales** → default **To ship** tab | Tab selected with count badge; paid order listed with full **Ship to** address and tracking form |
| U4 | Enter carrier + tracking → **Mark shipped** | Row updates to shipped; order drops off **To ship** tab; empty state shows “All caught up” |
| U5 | **All sales** tab | Full order history; if any still paid, banner links back to **To ship** |
| U6 | **Manage shop** → **Orders** section (collapsed by default unless unshipped) | **N to ship** button in header links to `/dashboard/sales`; ship form works inline when expanded |

---

## Dashboard — grow sales time range

**Requires:** seller account on `/dashboard` (with or without orders).

| # | Step | Expected |
| - | ---- | -------- |
| R1 | Open `/dashboard` with no sales | Gross sales shows `$0.00`; pill **30 days** is selected; stat label reads **Gross sales · 30 days** |
| R2 | Click **7 days**, **This month**, **All time** | URL updates `?range=` (30 days uses clean `/dashboard`); selected pill highlights; gross sales label reflects range |
| R3 | Seller with mixed orders (incl. refunded/canceled) | Gross sales for a bounded range excludes refunded/canceled; counts only orders in range |
| R4 | Active shops / Total shops / Avg rating | Unchanged by range pills (not order-scoped) |

---


```markdown
## [Feature name]

**Requires:** [migrations, env vars, flags]

| # | Step | Expected |
| - | ---- | -------- |
| 1 | … | … |
```
