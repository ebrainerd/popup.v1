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

The four layout slugs map to archetype labels: `broadcast` → **Live Stage**,
`catalog` → **Lookbook**, `countdown` → **Drop Clock**, `classic` → **The Room**.
Each layout reorders the buyer page; the customize **Live preview** must mirror
that order (preview drift is the most common regression here).

### Editor smoke — four layouts × two presets

Open `/dashboard/shops/[id]/customize` (or the wizard **Layout & theme** step —
same `ShopThemeEditor`). Above the preview, use the **Scheduled / Open / Live**
phase toggle and the **Desktop / Mobile** viewport toggle. For each layout, run
its **recommended** preset and one **off-pairing** preset (the two columns
below) to confirm theme + layout are independent.

| # | Layout | Presets to try | Expected preview (Desktop) | ✓ |
| - | ------ | -------------- | -------------------------- | - |
| L1 | **Live Stage** (`broadcast`) | Neon PopUp (rec.) + Gallery | Title → **wide stream/cover hero** → product grid → chat full-width below. Scheduled overlays a countdown on the hero; Live shows a LIVE badge. | |
| L2 | **Lookbook** (`catalog`) | Gallery (rec.) + Dark Room | Title → **product grid first** → slim stream/countdown band → reminder → chat. No oversized hero. | |
| L3 | **Drop Clock** (`countdown`) | Dark Room (rec.) + Market Stall | Scheduled: **oversized countdown hero** with shop name + "Remind me", then sneak-peek grid + announcements. Open: hero shrinks to "We're open", full products, chat. | |
| L4 | **The Room** (`classic`) | Market Stall (rec.) + Neon PopUp | Title (with seller bio) → **stream beside chat sidebar** (two columns) → products below. | |

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| L5 | Pick a layout that differs from current | "Apply recommended settings for …?" prompt appears (preset, chat, grid summary) | |
| L6 | Click **Apply** | Preset/accent/toggles/grid switch to that layout's defaults; preview updates | |
| L7 | Click **Keep my settings** instead | Only `layout` changes; existing preset/toggles preserved | |
| L8 | Toggle each phase Scheduled / Open / Live | Hero swaps: countdown (Scheduled), open state, LIVE badge (Live); reminder CTA only when Scheduled + reminder toggle on | |
| L9 | Switch viewport to **Mobile** | Grid drops to readable columns; chat/countdown stay reachable; no overflow | |
| L10 | Toggle **Chat**, **Seller bio**, **Reminder button** off | Matching blocks disappear from preview | |
| L11 | Pick an accent that fails contrast on a light preset | Inline contrast warning appears above the theme list | |

### Buyer-page parity (preview ≈ production)

For each layout, set it on a draft/scheduled shop and open the public
`/shop/[id]` page; the section order must match the editor preview for that
layout and phase.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| B1 | **Live Stage**, shop scheduled then open | Stream/cover hero leads; products reachable in one scroll; chat full width below | |
| B2 | **Lookbook**, scheduled then open | Product grid is first paint above the fold; stream band capped (~40vh) below grid; seller bio shown | |
| B3 | **Drop Clock**, scheduled | Countdown is the largest hero element; `WaitingRoomBanner` does **not** duplicate it; reminder CTA prominent | |
| B4 | **Drop Clock** at `start_at` | Hero shrinks / swaps to open state **without a full page reload** | |
| B5 | **The Room**, open on desktop | Chat sidebar visible beside the stream without scrolling; seller bio in header | |
| B6 | Any layout on mobile 375px | Hero/stream visible; products and checkout usable; chat collapses below fold | |

---

Copy this block when adding the next checklist:

```markdown
## [Feature name]

**Requires:** [migrations, env vars, flags]

| # | Step | Expected |
| - | ---- | -------- |
| 1 | … | … |
```
