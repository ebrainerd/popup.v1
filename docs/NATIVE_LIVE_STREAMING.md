# PopUp Native Live Streaming — Implementation Plan

> **Status:** Planning / not started  
> **Provider:** [LiveKit Cloud](https://livekit.io/) (recommended)  
> **Owner decision:** Approved (LiveKit + hybrid YouTube/Twitch fallback)  
> **Last updated:** 2026-06-27

This document is the single source of truth for implementing **native in-app live
streaming** in PopUp. It is written so another agent (or engineer) can pick it up
and implement without re-deriving architecture.

Related docs:

| Topic | File |
| ----- | ---- |
| Current live embeds | `src/components/live-embed.tsx`, `src/lib/embeds.ts` |
| Go live toggle | `src/components/shop-quick-actions.tsx`, `toggleLive` in `src/app/dashboard/actions.ts` |
| Shop room (chat/auctions) | `src/components/shop-room.tsx`, `src/lib/realtime.ts` |
| Handoff / stack | `docs/HANDOFF.md` |
| Roadmap gap | `docs/ROADMAP.md` (native streaming listed as future) |

---

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
| Auth for subscribe | **Anyone** when shop is open + `is_live` | Mint subscribe token; optional anon for public shops |

---

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

**No camera test required in wizard** — defer to first go-live (reduces wizard friction).

---

### 3.3 Seller — go live (manage shop, desktop MVP)

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

**On end live:**

1. Unpublish tracks; disconnect from room.
2. Server sets `is_live = false`.
3. Buyers see “Seller ended live” / cover hero (not end of shop).

**Repeat:** Seller can go live again without re-running setup.

---

### 3.4 Seller — external stream (unchanged, clarified)

If `stream_provider = youtube | twitch`:

- Show URL field in manage + wizard.
- `Go live` sets `is_live` only (no LiveKit).
- Shop page uses existing `LiveEmbed` iframe.
- Require URL before go live (keep current gate for this path only).

---

### 3.5 Buyer — shop page

**When `is_live && stream_provider === native`:**

Replace top hero embed area with **NativeLivePlayer**:

```
┌────────────────────────────────────────┐
│ ● LIVE · Dropping Live                 │
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ │     LiveKit video (subscribe)      │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│  Viewer count · Countdown              │
└────────────────────────────────────────┘
```

- Subscribe token from `/api/live/token?shopId=…&role=subscriber`.
- Autoplay muted where browser policy requires; tap to unmute.
- If seller ends live: player shows last frame or cover + “Live ended”.

**When external:** existing `LiveEmbed` (no change).

**Hot-swap (known gap):** `docs/ROADMAP.md` notes embed doesn’t hot-swap for
connected viewers today. Phase 1 should use **Supabase broadcast** `ROOM_EVENTS.live`
or poll `is_live` so player mounts when seller goes live without full page refresh.

---

### 3.6 Mobile seller (future — design now, build later)

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
  "role": "publisher" | "subscriber"
}
```

**Server checks:**

| Role | Checks |
| ---- | ------ |
| `publisher` | User is shop `seller_id`; shop open; `stream_provider = native` |
| `subscriber` | Shop open (or scheduled with seller preview — optional); `is_live` or seller preview |

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
| `LiveControlsCard` | `src/components/live-controls-card.tsx` | Wraps publisher + quick actions |

**Dependencies to add:**

```json
"livekit-client": "^2",
"@livekit/components-react": "^2",
"livekit-server-sdk": "^2"
```

**Env vars:**

```bash
# Server only
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=wss://your-project.livekit.cloud

# Client (public)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
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
- [ ] `src/components/shop-page-view.tsx` — native player branch
- [ ] `src/lib/shop-wizard.ts` — `stream_provider` on draft
- [ ] `src/app/dashboard/shops/[id]/page.tsx` — `LiveControlsCard`
- [ ] `src/lib/drop-readiness.ts` — checklist: “Stream source configured” vs URL-only

### Should change

- [ ] `src/components/shop-form.tsx` — stream source + conditional URLs
- [ ] `src/components/shop-room.tsx` — listen for live state; emit on go live
- [ ] `src/lib/realtime.ts` — `LiveBroadcast` may include `streamProvider`
- [ ] `test/unit/live-stream.test.ts` (new)

### Copy fixes

- [ ] Wizard live step: remove “no external link required” until native ships, or gate behind feature flag
- [ ] Homepage / invite-only: accurate once shipped

---

## 9. Phased roadmap

### Phase 0 — Prerequisites (0.5–1 day)

- [ ] Create LiveKit Cloud project (owner)
- [ ] Add env vars to Vercel + local `.env.local`
- [ ] Add npm dependencies
- [ ] Feature flag: `NATIVE_LIVE_ENABLED=true` (optional; allows partial merge)

### Phase 1 — MVP: desktop native go-live (core)

**Exit criteria:** Seller on desktop can go live from manage shop; buyer on shop page sees video; end live and go live again; shop stays open.

1. Migration + types + `live-stream.ts`
2. `POST /api/live/token`
3. `NativeLivePublisher` + `LiveControlsCard` on manage shop
4. `startNativeLive` / `endNativeLive` actions
5. `NativeLivePlayer` on `ShopPageView`
6. `StreamSourcePicker` in wizard live step; save `stream_provider`
7. Fix `hasLiveUrl` gate — native path only needs `stream_provider === native`
8. Unit tests for room naming, provider parsing, token route auth (mocked)

### Phase 1.5 — Reliability

- [ ] LiveKit webhook → clear stale `is_live`
- [ ] `ROOM_EVENTS.live` broadcast so buyers hot-swap player without refresh
- [ ] Reconnect UX (seller disconnect → banner + retry)
- [ ] Error states: permission denied, no camera, token expired

### Phase 2 — Scale & polish

- [ ] LiveKit **HLS egress** for viewers when concurrent viewers > N (e.g. 50)
- [ ] Viewer count on stream (LiveKit analytics or participant count)
- [ ] Stream health indicator for seller (bitrate, packet loss)
- [ ] Optional: short replay clip post-drop (LiveKit egress recording → Supabase Storage)

### Phase 3 — Mobile seller

- [ ] Mobile browser QA (iOS Safari, Android Chrome)
- [ ] Responsive live controls; PWA install prompt
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

## 13. Clarification questions for product owner

Answer these before or during Phase 1 to avoid rework:

### A. LiveKit account

1. **Who creates the LiveKit Cloud project?** (Owner vs agent with dashboard access)
2. **Separate projects for staging vs production?** (Recommended: yes)

### B. Viewer access

3. **Can anonymous visitors watch a public shop live stream**, or must they be logged in?
   - Recommendation: **anonymous subscribe OK** for public shops (matches current shop page).
4. **Private shops:** same rule as today (link-only access)?

### C. Scheduled / waiting room

5. **Before `start_at`, can seller test camera?** (Preview only, not public)
   - Recommendation: **yes** — publish token only for seller when `status !== ended`.
6. **Show “offline” player before seller goes live**, or hide video area until `is_live`?
   - Recommendation: **hide until live** (or show cover + “Opens in …”).

### D. External streams

7. **Keep YouTube + Twitch in v1**, or ship native-only first?
   - Recommendation: **keep both** (hybrid); minimal extra work once `stream_provider` exists.
8. **If seller picks PopUp Live, hide URL fields** or keep as advanced override?
   - Recommendation: **hide** unless “Stream elsewhere instead” link clicked.

### E. Compliance & moderation

9. **Recording / retention** required for disputes or trust & safety in v1?
   - Recommendation: **no** v1; add Phase 2 egress if needed.
10. **Age/restricted content policy** — any seller agreement checkbox before first go-live?
    - Recommendation: **light ToS reminder** modal once (“You’re responsible for stream content”).

### F. Feature flag

11. **Ship behind `NATIVE_LIVE_ENABLED`** until staging validated?
    - Recommendation: **yes** for first production deploy.

### G. Desktop-only messaging

12. **Show “Best on desktop Chrome”** for seller publish in v1?
    - Recommendation: **soft banner** on mobile user-agent until Phase 3.

---

## 14. Agent implementation prompt (copy-paste)

```
Implement PopUp native live streaming per docs/NATIVE_LIVE_STREAMING.md.

Phase 1 only:
- LiveKit Cloud for WebRTC publish (seller) and subscribe (buyer)
- Migration 0018, stream_provider enum, live-stream lib
- POST /api/live/token with seller/subscriber roles
- NativeLivePublisher on manage shop, NativeLivePlayer on shop page
- StreamSourcePicker in wizard live step
- Remove hasLiveUrl gate when stream_provider is native
- startNativeLive / endNativeLive server actions
- Unit tests for live-stream helpers

Do not merge video into Supabase Realtime. Keep YouTube/Twitch embed path.
Use feature flag NATIVE_LIVE_ENABLED if env not set.

After implementation: update docs/HANDOFF.md and docs/ROADMAP.md references.
Run typecheck, lint, test, build.
```

---

## 15. UI wireframe summary (quick reference)

```
WIZARD — Live stream step
├── StreamSourcePicker (PopUp Live | YouTube/Twitch)
├── [if external] URL fields
└── Copy: "You can go live anytime while your shop is open."

MANAGE SHOP — Live controls
├── [if native] NativeLivePublisher (preview | live | error)
├── Go live / End live
├── [if external] URL + Go live (existing)
└── Shop extend / End shop (unchanged)

SHOP PAGE — Buyer
├── [if native && is_live] NativeLivePlayer
├── [if external && embed] LiveEmbed
└── [else] Cover hero / countdown
```

---

## 16. Success metrics

- % of open shops using `stream_provider = native`
- Time from “Go live” click to first viewer frame (target < 5s on desktop)
- Seller go-live success rate (no error / total attempts)
- Repeat go-live sessions per shop (validates on/off workflow)
- Viewer concurrent peak per shop (informs Phase 2 HLS)

---

*When Phase 1 ships, update `docs/HANDOFF.md` § Known future work and `docs/ROADMAP.md` to mark native streaming in progress / done.*
