# Manual testing checklist

Use this doc after shipping a feature — especially anything that touches auth,
payments, realtime, or third-party services automated tests don't fully cover.

**How to use it**

1. Run automated checks first: `npm run typecheck && npm run lint && npm run test && npm run build`
2. Start the app locally (see `README.md` / `AGENTS.md` for Supabase + `npm run dev`)
3. Walk through the checklist for the feature you changed
4. When you add a new feature, add a section here with numbered steps and expected results

Record pass/fail and any notes in your PR or handoff comment.

---

## Native live streaming (PopUp Live)

**Requires:** migrations `0018_native_live_stream.sql` and `0019_live_reminders.sql` applied; LiveKit env vars set (`LIVEKIT_*`, `NEXT_PUBLIC_LIVEKIT_URL`, `NATIVE_LIVE_ENABLED=true`). See `docs/NATIVE_LIVE_STREAMING.md`.

### Seller — setup & camera test

| # | Step | Expected |
| - | ---- | -------- |
| 1 | Create or edit a shop in the setup wizard → **Live stream** step | **PopUp Live** is selected by default; YouTube/Twitch URL fields hidden |
| 2 | Switch to **YouTube or Twitch**, then back to **PopUp Live** | URL fields hide again |
| 3 | Finish setup and open **Manage shop** → **Live controls** (below publish, above products) | Stream source shows **PopUp Live (in-app)**; **Change live stream source** button; no URL field under Shop details |
| 4 | Click **Test camera** (before shop opens or while open, not live) | Local preview appears; mic mute works; buyers still see cover photo on shop page |
| 5 | Click **Stop test** | Preview stops; no `is_live` change |

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
| 13 | Anonymous visitor clicks **Notify me when live** | Redirected to login with return URL |

### External stream (regression)

| # | Step | Expected |
| - | ---- | -------- |
| 14 | Wizard → choose **YouTube or Twitch**, paste a valid stream URL, publish | Manage shop shows URL-based **Go live** (not native publisher) |
| 15 | Go live with external URL | Embedded player on shop page when live |

### Error / edge cases

| # | Step | Expected |
| - | ---- | -------- |
| 16 | Deny camera permission, click **Go live** | Clear error message; no crash |
| 17 | **End shop** while live | Shop ends; `is_live` cleared; buyers see ended state |

---

## Template for new features

Copy this block when adding the next checklist:

```markdown
## [Feature name]

**Requires:** [migrations, env vars, flags]

| # | Step | Expected |
| - | ---- | -------- |
| 1 | … | … |
```
