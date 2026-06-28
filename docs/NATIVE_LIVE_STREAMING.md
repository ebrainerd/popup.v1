# PopUp Native Live Streaming — Implementation Plan

> **Status:** Planning — owner decisions locked (2026-06-27); Phase 0 blocked on LiveKit env vars  
> **Provider:** [LiveKit Cloud](https://livekit.io/)  
> **Owner decision:** Approved (LiveKit + hybrid YouTube/Twitch fallback)  
> **Last updated:** 2026-06-27 (owner Q&A incorporated)

This document is the single source of truth for implementing **native in-app live
streaming** in PopUp. It is written so another agent (or engineer) can pick it up
and implement without re-deriving architecture.

Related docs:

| Topic | File |
| ----- | ---- |
| Current live embeds | `src/components/live-embed.tsx`, `src/lib/embeds.ts` |
| Go live toggle | `src/components/shop-quick-actions.tsx`, `toggleLive` in `src/app/dashboard/actions.ts` |
| Drop opening reminders | `src/components/remind-me-button.tsx`, `drop_reminders` table |
| Shop room (chat/auctions) | `src/components/shop-room.tsx`, `src/lib/realtime.ts` |
| Shop access / discovery | `src/lib/discovery.ts`, `visibility` column on `shops` |
| Handoff / stack | `docs/HANDOFF.md` |
| Roadmap gap | `docs/ROADMAP.md` (native streaming listed as future) |

---

## 0. Implementation phases (overview)

Work in this order. **Phase 0 is blocked on the owner** providing LiveKit credentials
(see §13.1). Phases 1–1c can ship in one PR or split; dependencies are noted.

| Phase | Name | What ships | Blocked on |
| ----- | ---- | ---------- | ---------- |
| **0** | Prerequisites | LiveKit production project, env vars on Vercel + local, npm deps, `NATIVE_LIVE_ENABLED` flag | Owner LiveKit account |
| **1** | Core native streaming | Migration `0018`, token API, `NativeLivePublisher` / `NativeLivePlayer`, wizard `StreamSourcePicker`, `startNativeLive` / `endNativeLive`, cover photo in stream slot until live, default `stream_provider = native` | Phase 0 |
| **1b** | Seller camera/mic test | “Test camera” mode before shop opens and while open (preview only; no buyer video) | Phase 1 |
| **1c** | Buyer “Notify when live” | `live_reminders` table + shop-page button; email/push when seller goes live | Phase 1 |
| **1.5** | Reliability | LiveKit webhook → clear stale `is_live`; Realtime hot-swap for buyers; reconnect UX | Phase 1 |
| **2** | Scale & polish | HLS egress, viewer count, stream health, optional replay | Phase 1.5 |
| **3** | Mobile seller | Mobile browser QA, responsive controls, native SDK apps (later) | Phase 1 |
| **4** | Optional | Screen share, co-host, OBS/RTMP ingress | — |

**Not in scope for v1:** stream recording/retention (owner confirmed no).

**Parallel cleanup (Phase 1):** Align product copy and seller UI with the
link-only access model — see §2.1. No schema change required for access control.

## 1. Problem statement

PopUp already promises native go-live in copy (homepage, setup wizard) but
**video today is embed-only** (YouTube/Twitch iframes). Sellers must paste a URL
before `Go live` works (`hasLiveUrl` gate in `ShopQuickActions`).

Commerce realtime (chat, presence, flash drops, auctions) runs on **Supabase
Realtime** and should **stay separate** from video.

### Goals

1. Seller can **go live / end live** repeatedly while the shop is **open** — no external URL required.
2. Buyer watches **inside the shop page** with low friction.
3. **Desktop-first MVP**; architecture must extend to **mobile seller apps** later without replacing the video stack.
4. Keep **YouTube/Twitch** as optional fallback for creators who already stream elsewhere.

### Non-goals (v1)

- DVR / full stream replay
- Co-hosting, screen share, multi-camera
- Native iOS/Android seller apps (future phase; same LiveKit rooms)
- Replacing Supabase Realtime for chat or auctions
- Running self-hosted media servers on Vercel

---

## 2. Product decisions (locked)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Video provider | **LiveKit Cloud** | Browser publish, room-per-shop, mobile SDK path later |
| Room model | One room per shop: `shop-{shopId}` | Maps to existing shop identity |
| Live vs open | **Separate concerns** | `is_live` toggles video; `start_at`/`end_at` is shop window |
| Repeat go-live | **Yes** | Disconnect publisher on end live; shop stays open; reconnect anytime |
| External streams | **Hybrid** | `stream_provider`: `native` \| `youtube` \| `twitch` |
| Viewer transport (v1) | **WebRTC** via LiveKit client | HLS egress in Phase 2 if viewer count grows |
| Auth for publish | **Seller only** (owner `seller_id`) | Mint publish token server-side |
| Auth for subscribe | **Anyone with the shop link** when `is_live` | No login required to watch; login required for chat/purchase |
| Default stream source | **`native` (PopUp Live)** | External YouTube/Twitch remains optional |
| LiveKit environments | **Production project only** | Owner creates one LiveKit Cloud project (no separate staging) |
| Recording | **None in v1** | Owner confirmed; Phase 2+ only if needed |
| Feature flag | **`NATIVE_LIVE_ENABLED`** until validated in production | Ship behind flag for first deploy |
| Seller publish (mobile) | **Soft “best on desktop Chrome” banner** in v1 | Until Phase 3 mobile seller work |

### 2.1 Shop access model (owner-confirmed)

PopUp is **link-first**: buyers reach a shop only when the seller shares the URL.
There is no meaningful “private shop” in the product sense — every published shop
is reachable by anyone who has the link.

**How the codebase maps today:**

| Concept | Implementation | Notes |
| ------- | -------------- | ----- |
| Link-only access | `shops.visibility = 'private'` **or** invite-only mode forcing private | RLS allows **anyone** (including anonymous) to read non-draft shops by UUID — see `0001_init.sql` policy “Shops are viewable when published” |
| Explore listing | `shops.visibility = 'public'` | Only matters in `marketplace` discovery mode; hidden in `invite_only` (production default) |
| Chat / purchase | Auth required | Unchanged |
| Live stream viewing | **Anonymous OK** with link | Subscribe tokens issued without login when shop is open + `is_live` |

**UI alignment (Phase 1 cleanup):**

- `VisibilityPicker` already labels private as **“Link only”** — keep that wording.
- In invite-only mode, visibility is forced to link-only via `resolveShopVisibility` — consider hiding the picker or showing a single non-editable “Share your shop link” card so sellers are not confused by “public vs private.”
- Remove or reword any copy that implies shops are access-restricted beyond “you share the link.”
- Do **not** add login walls for the shop page or live player.

**Live stream tokens:** `/api/live/token` subscriber role must **not** require auth.
Validate shop exists, is not draft, and (`is_live` OR seller preview role for test mode).

## 3. UX flows

### 3.1 Terminology (user-facing)

| Internal | User sees |
| -------- | --------- |
| Shop open | “Your shop is open” |
| Go live | “Go live” |
| End live | “End live” (video stops; shop stays open) |
| End shop | “End shop” (closes drop entirely) |
| Stream source | “How do you want to stream?” |

Avoid “broadcast” in UI (conflicts with layout theme name).

---

### 3.2 Seller — first-time setup (wizard + manage)

**Where:** Setup wizard **Live stream** step + Manage shop **Live** section.

**Step A — Choose stream source** (radio cards, one selected):

```
┌─────────────────────────────────────────────────────────────┐
│ How do you want to go live?                                 │
├─────────────────────────────────────────────────────────────┤
│ ● PopUp Live (recommended)                                  │
│   Stream from your camera right in the app. No extra links.  │
│   Best for: phone or laptop, quick drops.                   │
├─────────────────────────────────────────────────────────────┤
│ ○ YouTube or Twitch                                         │
│   Paste a stream URL. Viewers watch an embedded player.     │
│   Best for: creators who already stream on another platform.│
└─────────────────────────────────────────────────────────────┘
```

- Default: **PopUp Live** (`stream_provider = native`).
- If YouTube/Twitch: show existing URL fields (current behavior).
- Persist `stream_provider` on save draft / finish setup / manage shop.
- URL fields **hidden** when PopUp Live is selected unless seller clicks “Stream elsewhere instead.”

**No camera test required in wizard** — defer to manage shop (reduces wizard friction).

---

### 3.3 Seller — camera/mic test (Phase 1b)

Sellers must be able to **test camera and microphone** without going live to buyers.

**When:**

1. **Before shop opens** (`status = scheduled`) — from manage shop / live controls.
2. **While shop is open but not live** — same UI, alongside “Go live.”

**Flow:**

```
[ Test camera ]

┌──────────────────────────────────────┐
│  Local preview (muted)               │
│  [ camera ▼ ] [ mic ▼ ] [ mic meter ]│
└──────────────────────────────────────┘

"This is only visible to you. Buyers still see your cover photo until you go live."

[ Stop test ]
```

**Technical:**

- Use `getUserMedia` locally **or** connect to LiveKit room with a **preview-only**
  publish token grant (seller-only; tracks not shown to subscribers).
- Recommendation: **local preview first** (no LiveKit connection) for test mode;
  optional LiveKit preview in Phase 1.5 if A/V sync issues appear.
- **Do not** set `is_live = true` during test.
- **Do not** send follower/live-reminder notifications during test.

---

### 3.4 Seller — go live (manage shop, desktop MVP)

**Entry:** Manage shop → **Live controls** card (expand `ShopQuickActions`).

**Preconditions:**

- Shop status = open (between `start_at` and `end_at`)
- `stream_provider = native`
- Browser supports `getUserMedia` (show friendly error if not)

**Flow:**

```
[ Shop is open · Not live ]

┌──────────────────────────────────────┐
│  Camera preview (muted)              │
│  [ dropdown: camera ] [ mic mute ]   │
└──────────────────────────────────────┘

[ Go live ]   ← primary

── after Go live ──

┌──────────────────────────────────────┐
│  ● LIVE  00:12:34                    │
│  (your camera preview)               │
└──────────────────────────────────────┘

[ End live ]   ← destructive/outline

Copy: "Ending live stops video only. Your shop stays open for chat and sales."
```

**States:**

| State | UI |
| ----- | -- |
| `idle` | Preview off or placeholder; “Go live” enabled |
| `connecting` | Spinner; “Starting live…” |
| `live` | Red LIVE badge, timer, “End live” |
| `error` | Inline message + retry (permissions, network, token) |
| `ended` | Back to idle; can go live again |

**Permissions:** Request camera/mic on first “Go live”, not on page load.

**On success:**

1. Client obtains **publish token** from `/api/live/token`.
2. Connect to LiveKit room `shop-{shopId}`; publish camera + mic.
3. Server sets `is_live = true` (existing `toggleLive` or new `startNativeLive`).
4. Follower notifications fire (existing `notifyFollowersOfLive`).
5. **Live reminder subscribers** notified (Phase 1c — `notifyLiveReminders`).

**On end live:**

1. Unpublish tracks; disconnect from room.
2. Server sets `is_live = false`.
3. Buyers see **cover photo** again in the stream slot (not end of shop).

**First go-live (v1):** Show one-time modal: “You’re responsible for stream content” (ToS reminder). Store acknowledgment on seller profile or shop (e.g. `native_live_tos_accepted_at`).

**Repeat:** Seller can go live again without re-running setup.

---

### 3.5 Seller — external stream (unchanged, clarified)

If `stream_provider = youtube | twitch`:

- Show URL field in manage + wizard.
- `Go live` sets `is_live` only (no LiveKit).
- Shop page uses existing `LiveEmbed` iframe.
- Require URL before go live (keep current gate for this path only).

---

### 3.6 Buyer — shop page (stream area)

**Stream slot layout:** A dedicated **16:9 stream box** at the top of the shop page
(catalog/broadcast layouts). Content depends on state:

| State | Stream box shows |
| ----- | ---------------- |
| Not live (native or no embed) | **Shop cover photo** (`cover_url`) — same image from shop setup |
| `is_live` + native | `NativeLivePlayer` (LiveKit subscribe) |
| `is_live` + youtube/twitch | Existing `LiveEmbed` iframe |
| Scheduled, not open | Cover photo + countdown overlay (existing waiting-room UX) |

This replaces the current either/or between `LiveEmbed` and `CoverHero` — the
stream box is **always present** for native shops; cover fills it until live.

**When `is_live && stream_provider === native`:**

```
┌────────────────────────────────────────┐
│ ● LIVE · {shop name}                   │
│ ┌────────────────────────────────────┐ │
│ │     LiveKit video (subscribe)      │ │
│ └────────────────────────────────────┘ │
│  Viewer count · Countdown              │
└────────────────────────────────────────┘
```

- Subscribe token from `/api/live/token?shopId=…&role=subscriber` — **no login required**.
- Autoplay muted where browser policy requires; tap to unmute.
- If seller ends live: stream box returns to **cover photo**.

**When external:** existing `LiveEmbed` in the same stream slot when live; cover when not.

**Hot-swap (Phase 1.5):** `docs/ROADMAP.md` notes embed doesn’t hot-swap for
connected viewers today. Use **Supabase broadcast** `ROOM_EVENTS.live` or poll
`is_live` so player mounts when seller goes live without full page refresh.

---

### 3.7 Buyer — “Notify when live” (Phase 1c)

**New capability** (separate from opening-time `drop_reminders`):

While the shop is **open** but the seller is **not live**, show a button:

```
[ 🔔 Notify me when live ]
```

**Behavior:**

| User | Action |
| ---- | ------ |
| Anonymous | Click → redirect to login with `redirectTo` back to shop |
| Logged in | Toggle subscription; persisted per `(shop_id, user_id)` |

**On seller go live:** Send email (+ web push if enabled) to all active
`live_reminders` for that shop, in addition to existing follower go-live notifications.

**Copy:** “We’ll email you when @{seller} goes live.” Show count when ≥ 5 subscribers.

**Data model (Phase 1c migration `0019_live_reminders.sql`):**

```sql
create table public.live_reminders (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  cancelled_at timestamptz
);
create unique index live_reminders_active_unique
  on public.live_reminders(shop_id, user_id) where cancelled_at is null;
```

**Components:** `NotifyWhenLiveButton` (parallel to `RemindMeButton`), server
action `toggleLiveReminder`, `notifyLiveReminders(shopId)` in `src/lib/notifications.ts`.

---

### 3.8 Mobile seller (future — design now, build later)

Same room `shop-{shopId}`; swap publisher UI:

| Phase | Seller client |
| ----- | ------------- |
| v1 | Desktop browser (`@livekit/components-react`) |
| v1.1 | Mobile browser (same components; test Safari) |
| v2 | Native app with LiveKit iOS/Android SDKs |

**Design for mobile now:**

- Live controls card stacks vertically; preview 16:9 full width.
- Large touch targets for Go live / End live.
- Don’t rely on hover; avoid tiny device dropdowns (use native `<select>` or sheet).

---

## 4. Architecture

```
┌─────────────┐     publish      ┌──────────────────┐
│ Seller UI   │ ───────────────► │ LiveKit Cloud    │
│ (browser)   │ ◄─────────────── │ room: shop-{id}  │
└──────┬──────┘     WebRTC       └────────▲─────────┘
       │                                    │
       │ POST /api/live/token               │ subscribe
       ▼                                    │
┌─────────────┐                    ┌──────┴──────┐
│ Next.js API │                    │ Buyer UI    │
│ (Vercel)    │                    │ (browser)   │
└──────┬──────┘                    └─────────────┘
       │
       │ update is_live, stream_*
       ▼
┌─────────────┐     chat/auctions  ┌─────────────┐
│ Supabase    │ ◄────────────────► │ Shop room   │
│ Postgres    │     Realtime       │ (unchanged) │
└─────────────┘                    └─────────────┘
```

**Token minting:** Server-only LiveKit API key + secret. Never expose secret to client.

**Webhooks (Phase 1.5):** LiveKit room finished → safety net to set `is_live = false` if seller closes tab without “End live”.

---

## 5. Data model

### 5.1 Migration `0018_native_live_stream.sql`

```sql
-- Stream source for the shop
create type public.stream_provider as enum ('none', 'native', 'youtube', 'twitch');

alter table public.shops
  add column if not exists stream_provider public.stream_provider not null default 'none',
  add column if not exists stream_room_id text,
  add column if not exists native_live_started_at timestamptz,
  add column if not exists native_live_ended_at timestamptz;

-- stream_room_id = 'shop-{id}' for native; null for external-only
-- live_url / twitch_url remain for youtube/twitch embeds
```

**Backfill:**

- Shops with `live_url` or `twitch_url` → infer `youtube` or `twitch` from URL parser.
- Others → `none` (seller picks on next edit).

### 5.2 TypeScript

Update `src/lib/database.types.ts` and `Shop` row type.

Add `src/lib/live-stream.ts`:

- `shopLiveKitRoomName(shopId: string): string`
- `parseStreamProviderFromUrls(liveUrl, twitchUrl)`
- Token request/response types

---

## 6. API routes

### 6.1 `POST /api/live/token`

**Auth:** Required for publish; optional for subscribe on public open shops.

**Body:**

```json
{
  "shopId": "uuid",
  "role": "publisher" | "subscriber" | "preview"
}
```

**Server checks:**

| Role | Checks |
| ---- | ------ |
| `publisher` | User is shop `seller_id`; shop not ended; `stream_provider = native` |
| `subscriber` | Shop not draft; `is_live === true`; **no auth required** (link = access) |
| `preview` (seller test) | User is shop `seller_id`; shop not ended; **does not** require `is_live` |

**Response:**

```json
{
  "token": "…",
  "roomName": "shop-{uuid}",
  "livekitUrl": "wss://….livekit.cloud"
}
```

**Implementation:** `livekit-server-sdk` → `AccessToken` with `VideoGrant`.

### 6.2 `POST /api/live/webhook` (Phase 1.5)

LiveKit webhook verifier → on `room_finished`, clear `is_live` if room matches `shop-*`.

### 6.3 Server actions (dashboard)

| Action | Purpose |
| ------ | ------- |
| `updateStreamProvider(shopId, provider, urls?)` | Wizard + manage |
| `startNativeLive(shopId)` | Set `is_live`, `native_live_started_at`, ensure room id |
| `endNativeLive(shopId)` | Set `is_live = false`, `native_live_ended_at` |
| Refactor `toggleLive` | Branch on `stream_provider` |

---

## 7. Frontend components

| Component | Path | Responsibility |
| --------- | ---- | -------------- |
| `StreamSourcePicker` | `src/components/stream-source-picker.tsx` | Radio: PopUp Live vs external |
| `NativeLivePublisher` | `src/components/native-live-publisher.tsx` | Preview, permissions, connect, timer |
| `NativeLivePlayer` | `src/components/native-live-player.tsx` | Subscribe, autoplay policy, ended state |
| `LiveControlsCard` | `src/components/live-controls-card.tsx` | Wraps publisher + quick actions + test camera |
| `NotifyWhenLiveButton` | `src/components/notify-when-live-button.tsx` | Buyer subscribes to go-live notification (Phase 1c) |
| `StreamSlot` | `src/components/stream-slot.tsx` | Cover photo OR player OR embed in fixed 16:9 box |

**Dependencies to add:**

```json
"livekit-client": "^2",
"@livekit/components-react": "^2",
"livekit-server-sdk": "^2"
```

**Env vars (owner provides — see §13.1):**

```bash
# Server only — from LiveKit Cloud → Settings → Keys
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=wss://your-project.livekit.cloud

# Client (public) — same WebSocket URL as LIVEKIT_URL
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# Optional: gate native live until production validation
NATIVE_LIVE_ENABLED=true

# Phase 1.5 — LiveKit webhook signing (Settings → Webhooks)
# LIVEKIT_WEBHOOK_API_KEY=
```

Document in `.env.example` and `docs/DEPLOYMENT.md` when implemented.

---

## 8. Integration touchpoints (file checklist)

### Must change

- [ ] `supabase/migrations/0018_native_live_stream.sql`
- [ ] `src/lib/database.types.ts`
- [ ] `src/lib/live-stream.ts` (new)
- [ ] `src/app/api/live/token/route.ts` (new)
- [ ] `src/app/dashboard/actions.ts` — `toggleLive`, stream provider save
- [ ] `src/components/shop-quick-actions.tsx` — remove `hasLiveUrl` gate for native
- [ ] `src/components/shop-setup-wizard.tsx` — live step + `StreamSourcePicker`
- [ ] `src/components/shop-page-view.tsx` — `StreamSlot` + native player branch
- [ ] `src/lib/shop-wizard.ts` — `stream_provider` on draft; default `native`
- [ ] `src/app/dashboard/shops/[id]/page.tsx` — `LiveControlsCard`
- [ ] `src/lib/drop-readiness.ts` — checklist: “Stream source configured” vs URL-only
- [ ] `src/lib/discovery.ts` / wizard — de-emphasize public/private confusion (§2.1)

### Phase 1b

- [ ] `NativeLivePublisher` — “Test camera” mode (local preview, no `is_live`)
- [ ] Allow test before `start_at` on manage shop

### Phase 1c

- [ ] `supabase/migrations/0019_live_reminders.sql`
- [ ] `src/lib/live-reminders.ts` (new)
- [ ] `src/components/notify-when-live-button.tsx`
- [ ] `src/app/shop/live-reminder-actions.ts`
- [ ] `notifyLiveReminders` in `src/lib/notifications.ts`; call from `startNativeLive` / `toggleLive`

### Should change

- [ ] `src/components/shop-form.tsx` — stream source + conditional URLs
- [ ] `src/components/shop-room.tsx` — listen for live state; emit on go live
- [ ] `src/lib/realtime.ts` — `LiveBroadcast` may include `streamProvider`
- [ ] `test/unit/live-stream.test.ts` (new)

### Copy fixes

- [ ] Wizard live step: remove “no external link required” until native ships, or gate behind feature flag
- [ ] Homepage / invite-only: accurate once shipped

---

## 9. Phased roadmap (detail)

See **§0** for the phase overview table. Expanded exit criteria below.

### Phase 0 — Prerequisites

- [ ] Owner creates **one LiveKit Cloud production project** (§13.1)
- [ ] Add env vars to Vercel production + local `.env.local`
- [ ] Add npm dependencies (`livekit-client`, `@livekit/components-react`, `livekit-server-sdk`)
- [ ] Feature flag: `NATIVE_LIVE_ENABLED=true` on Vercel when ready to expose

### Phase 1 — MVP: desktop native go-live (core)

**Exit criteria:** Seller on desktop can go live from manage shop; buyer with link sees video; end live and go live again; shop stays open; **cover photo shows in stream box until live**.

1. Migration `0018` + types + `live-stream.ts`
2. `POST /api/live/token` (publisher + subscriber roles; anon subscribe OK)
3. `StreamSlot` — cover photo default; swaps to player when `is_live`
4. `NativeLivePublisher` + `LiveControlsCard` on manage shop
5. `startNativeLive` / `endNativeLive` actions; refactor `toggleLive`
6. `StreamSourcePicker` in wizard; default `stream_provider = native`
7. Fix `hasLiveUrl` gate — native path only needs `stream_provider === native`
8. One-time ToS modal on first native go-live
9. Unit tests for room naming, provider parsing, token route auth (mocked)
10. Visibility/copy cleanup per §2.1

### Phase 1b — Seller camera/mic test

**Exit criteria:** Seller can test camera/mic before shop opens and while open (not live); buyers still see cover photo.

1. “Test camera” / “Stop test” in `LiveControlsCard`
2. Local `getUserMedia` preview with device selectors
3. Token route `preview` role optional if LiveKit-based test needed later

### Phase 1c — Buyer “Notify when live”

**Exit criteria:** Logged-in buyer toggles reminder on open shop; receives email/push when seller goes live.

1. Migration `0019_live_reminders.sql` + RLS
2. `NotifyWhenLiveButton` on shop page when `isOpen && !is_live`
3. `notifyLiveReminders(shopId)` hooked into go-live path
4. Unit tests for reminder toggle + idempotent notify

### Phase 1.5 — Reliability

- [ ] LiveKit webhook → clear stale `is_live`
- [ ] `ROOM_EVENTS.live` broadcast so buyers hot-swap player without refresh
- [ ] Reconnect UX (seller disconnect → banner + retry)
- [ ] Error states: permission denied, no camera, token expired

### Phase 2 — Scale & polish

- [ ] LiveKit **HLS egress** for viewers when concurrent viewers > N (e.g. 50)
- [ ] Viewer count on stream (LiveKit analytics or participant count)
- [ ] Stream health indicator for seller (bitrate, packet loss)
- [ ] Optional: short replay clip post-drop (LiveKit egress recording → Supabase Storage) — **only if owner requests later**

### Phase 3 — Mobile seller

- [ ] Mobile browser QA (iOS Safari, Android Chrome)
- [ ] Responsive live controls; PWA install prompt
- [ ] Remove or soften “best on desktop” banner when stable
- [ ] Native app publisher (LiveKit mobile SDK) — separate project

### Phase 4 — Optional enhancements

- [ ] Screen share
- [ ] Co-host
- [ ] Simulcast / adaptive layers
- [ ] OBS RTMP ingress (LiveKit ingress) for pro streamers

---

## 10. Testing plan

### Manual (required before merge)

1. Seller: open shop → go live → see self preview → end live → go live again.
2. Buyer: two browsers — buyer sees stream within ~3s of seller go live.
3. Buyer: seller ends live — player clears; chat still works.
4. External path: YouTube URL still embeds; go live without LiveKit.
5. Permission denied: clear message, no crash.
6. Seller closes tab while live → webhook or timeout clears `is_live` (Phase 1.5).

### Automated

- Unit: `shopLiveKitRoomName`, `parseStreamProvider`, token route auth matrix.
- E2E (optional, flaky): Playwright mock `getUserMedia`; skip real WebRTC in CI.

### Staging

- Use separate LiveKit project or room prefix `staging-shop-{id}`.

---

## 11. Security

- Publish tokens: short TTL (e.g. 1 hour), single room, `canPublish: true` only for seller identity.
- Subscribe tokens: `canSubscribe: true`, no publish.
- Validate `shopId` ownership on every token request.
- Rate-limit `/api/live/token` per user (e.g. 30/min).
- Do not log tokens.

---

## 12. Cost notes (for owner)

LiveKit Cloud bills roughly on **participant minutes** and **bandwidth**. A 1-hour drop with 1 seller + 50 viewers ≈ 51 participant-hours. Model cost before large streamers; set internal alert thresholds.

---

### Staging

- Use room prefix `staging-shop-{id}` only if a separate LiveKit project is added later.
- **Owner decision:** production LiveKit project only for now — local dev uses the same project keys in `.env.local` (acceptable for MVP; monitor usage).

---

## 13. Owner decisions (locked 2026-06-27)

### 13.1 LiveKit account & env vars (ACTION REQUIRED)

**Owner creates** a single LiveKit Cloud **production** project. Provide these to
Vercel (production) and `.env.local` (local dev):

| Variable | Where to find it | Exposed to browser? |
| -------- | ---------------- | ------------------- |
| `LIVEKIT_API_KEY` | LiveKit Cloud → project → **Settings → Keys** | No (server only) |
| `LIVEKIT_API_SECRET` | Same Keys page | No (server only) |
| `LIVEKIT_URL` | Settings → **Project URL** (WebSocket, `wss://…livekit.cloud`) | No (server only) |
| `NEXT_PUBLIC_LIVEKIT_URL` | Same WebSocket URL as `LIVEKIT_URL` | Yes (client connects here) |
| `NATIVE_LIVE_ENABLED` | Set to `true` when ready to enable in production | Yes (optional gate) |

**Steps for owner:**

1. Sign up at [livekit.io](https://livekit.io/) → create a project (e.g. `popup-production`).
2. Copy **API Key**, **API Secret**, and **WebSocket URL** from Settings → Keys.
3. Add the five variables above to **Vercel → Project → Settings → Environment Variables** (Production).
4. Paste the same values into local `.env.local` for development.
5. (Phase 1.5) Configure a webhook in LiveKit pointing to `https://<your-domain>/api/live/webhook` — add signing key as `LIVEKIT_WEBHOOK_API_KEY` when implemented.

**Do not commit** API secret to git. `.env.example` will list keys with empty values.

### 13.2 Viewer access — LOCKED

- **Anonymous users can watch** the live stream if they have the shop link.
- **Login required** for chat, purchase, follow, and “notify when live.”
- There is **no private shop** in the product sense — all shops are link-shared.
  Codebase `visibility` controls Explore listing only (§2.1).

### 13.3 Pre-live UX — LOCKED

- Sellers **can test camera/mic** before shop opens and while open (not live) — Phase 1b.
- **Before seller goes live:** stream box shows **shop cover photo** (not a blank player).
- **New:** buyers get a **“Notify me when live”** button on the shop page — Phase 1c.

### 13.4 Stream sources — LOCKED

- **PopUp Live (native) is the default** in wizard and new shops.
- **YouTube/Twitch embed path retained** as optional alternative.
- Hide URL fields when native is selected unless seller opts into external streaming.

### 13.5 Compliance — LOCKED

- **No recording / retention** in v1.
- **One-time ToS reminder** modal before first native go-live (recommended; implement in Phase 1).

### 13.6 Rollout — LOCKED

- Ship behind **`NATIVE_LIVE_ENABLED`** until production validation.
- **Soft “best on desktop Chrome” banner** for sellers on mobile user-agent in v1.

---

## 14. Agent implementation prompt (copy-paste)

```
Implement PopUp native live streaming per docs/NATIVE_LIVE_STREAMING.md.

Owner decisions are locked in §13. Phase 0 requires LIVEKIT_* env vars from owner.

Phase 1 (+ 1b + 1c if scoped):
- LiveKit Cloud for WebRTC publish (seller) and subscribe (buyer, anonymous OK)
- Migration 0018, stream_provider enum, live-stream lib
- POST /api/live/token with publisher/subscriber roles (no auth for subscribe)
- StreamSlot: cover photo until live, then NativeLivePlayer
- NativeLivePublisher + test camera mode on manage shop
- StreamSourcePicker in wizard (default native)
- Remove hasLiveUrl gate when stream_provider is native
- startNativeLive / endNativeLive server actions
- Migration 0019 + NotifyWhenLiveButton + notifyLiveReminders on go live
- Visibility/copy cleanup per §2.1
- Unit tests for live-stream helpers

Do not merge video into Supabase Realtime. Keep YouTube/Twitch embed path.
Use feature flag NATIVE_LIVE_ENABLED if env not set.

After implementation: update docs/HANDOFF.md and docs/DEPLOYMENT.md.
Run typecheck, lint, test, build.
```

---

## 15. UI wireframe summary (quick reference)

```
WIZARD — Live stream step
├── StreamSourcePicker (PopUp Live default | YouTube/Twitch)
├── [if external] URL fields
└── Copy: "You can go live anytime while your shop is open."

MANAGE SHOP — Live controls
├── [if native] Test camera (preview only, any time before/during open)
├── [if native] NativeLivePublisher (preview | live | error)
├── Go live / End live
├── [if external] URL + Go live (existing)
└── Shop extend / End shop (unchanged)

SHOP PAGE — Buyer
├── StreamSlot (always for native shops)
│   ├── [not live] Cover photo from shop setup
│   ├── [is_live + native] NativeLivePlayer
│   └── [is_live + external] LiveEmbed
├── [open && !is_live] NotifyWhenLiveButton (logged-in toggle)
└── Chat / products (auth for chat + purchase)
```

---

## 16. Success metrics

- % of open shops using `stream_provider = native`
- Time from “Go live” click to first viewer frame (target < 5s on desktop)
- Seller go-live success rate (no error / total attempts)
- Repeat go-live sessions per shop (validates on/off workflow)
- Buyer “notify when live” signups per shop
- Notify → seller go-live delivery latency

---

*When Phase 1 ships, update `docs/HANDOFF.md` § Known future work and `docs/ROADMAP.md` to mark native streaming in progress / done.*
