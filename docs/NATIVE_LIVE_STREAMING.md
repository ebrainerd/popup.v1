# Native live streaming (PopUp Live)

> **Status: Shipped.** Sellers can broadcast in-app with LiveKit. YouTube and
> Twitch embeds remain supported. For live ops status, see **`docs/HANDOFF.md`**.
> For manual checks, see **`docs/MANUAL_TESTING.md`** § Native live streaming.

## Purpose

PopUp Live lets a seller publish camera and microphone video inside the shop
page. Buyers watch in the same room as chat, products, and auctions. External
embeds are optional.

## When native live is enabled

Server enablement requires all of the following:

- `LIVEKIT_API_KEY` is set
- `LIVEKIT_API_SECRET` is set
- `LIVEKIT_URL` or `NEXT_PUBLIC_LIVEKIT_URL` is set
- `NATIVE_LIVE_ENABLED` is not `"false"`

Client UI enablement requires:

- `NEXT_PUBLIC_LIVEKIT_URL` is set
- `NEXT_PUBLIC_NATIVE_LIVE_ENABLED` is not `"false"`

Helpers live in `src/lib/live-stream.ts`:

- `isNativeLiveEnabled()` — server
- `isNativeLiveClientEnabled()` — browser

## Environment variables

| Variable | Scope | Purpose |
| -------- | ----- | ------- |
| `LIVEKIT_API_KEY` | Server | LiveKit API key |
| `LIVEKIT_API_SECRET` | Server | LiveKit API secret |
| `LIVEKIT_URL` | Server | LiveKit WebSocket URL (`wss://…`) |
| `NEXT_PUBLIC_LIVEKIT_URL` | Client + server fallback | Public LiveKit URL |
| `NATIVE_LIVE_ENABLED` | Server | Set `"false"` to disable native live |
| `NEXT_PUBLIC_NATIVE_LIVE_ENABLED` | Client | Set `"false"` to hide client native UI |

See also `docs/DEPLOYMENT.md` § Optional — native live (LiveKit).

## Database

Migration `0018_native_live_stream.sql` adds:

- `stream_provider` enum: `none`, `native`, `youtube`, `twitch`
- `stream_room_id` and native live timestamps
- Native live terms acceptance fields

Migration `0019_live_reminders.sql` adds live-reminder subscriptions.
Followers and reminder subscribers get notify calls when the seller goes live.

## Stream providers

| Provider | Behavior |
| -------- | -------- |
| `native` | In-app LiveKit room `shop-{shopId}` |
| `youtube` | YouTube embed from `live_url` |
| `twitch` | Twitch embed from `twitch_url` or parsed `live_url` |
| `none` | No stream configured |

Effective provider resolution: `effectiveStreamProvider()` in
`src/lib/live-stream.ts`.

## Key routes and components

| Area | Path |
| ---- | ---- |
| Token API | `POST /api/live/token` — roles `publisher`, `subscriber`, `preview` |
| Seller publisher | `src/components/native-live-publisher.tsx` |
| Buyer player | `src/components/native-live-player.tsx` |
| Stream slot | `src/components/stream-slot.tsx` |
| Dashboard actions | `startNativeLive`, `endNativeLive`, `acceptNativeLiveTos` in `src/app/dashboard/actions.ts` |
| Embeds helper | `src/lib/embeds.ts` |

## Seller flow

1. Configure stream source as native (or default when no external URL).
2. Accept native live terms on first go-live if required.
3. Start publish from the shop dashboard controls.
4. Buyers join as subscribers with a token from `/api/live/token`.
5. End the native live session when the drop finishes.

## Buyer flow

1. Open `/shop/[id]` while the seller is live on native.
2. The player connects to LiveKit with a subscriber token.
3. Chat, products, and auctions stay on the same page.

## Notifications

When the seller goes live:

- Followers receive email and optional web push (`notifyFollowersOfLive`)
- Live-reminder subscribers receive notify (`notifyLiveReminders`)

These sends are instant. They do not use the drop-reminder cron.

## Security and CSP

`next.config.ts` allows LiveKit hosts in `connect-src` (for example
`*.livekit.cloud`). Do not remove those entries when you tighten CSP.

## Manual test

Walk **`docs/MANUAL_TESTING.md`** § Native live streaming. Include at least two
viewers on a real device before marketing.

## Related docs

- `docs/DEPLOYMENT.md` — env wiring
- `docs/PRODUCTION_READINESS.md` — LiveKit plan notes
- `docs/NATIVE_APP_DECISION.md` — native mobile apps are separate from PopUp Live
- `docs/PRE_MARKETING_TEST.md` Phase 8 — production dry-run
