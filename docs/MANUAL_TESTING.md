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

Copy this block when adding the next checklist:

```markdown
## [Feature name]

**Requires:** [migrations, env vars, flags]

| # | Step | Expected |
| - | ---- | -------- |
| 1 | … | … |
```
