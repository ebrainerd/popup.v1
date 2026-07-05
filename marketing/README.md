# Marketing assets

Staged screenshots and videos for seller-facing marketing (dashboard, sales,
Studio, live shop).

## Quick start (screenshots)

```bash
# 1. Local Supabase must be running
supabase start

# 2. Seed demo seller + shops (always targets local stack)
MARKETING_SUPABASE_URL=http://127.0.0.1:54321 \
MARKETING_SUPABASE_SERVICE_ROLE_KEY=<from supabase status> \
node marketing/seed-demo.mjs

# 3. Capture screenshots (builds production bundle; create-shop uses dev server)
node marketing/capture-screenshots.mjs
```

Output: `marketing/screenshots/`

| File | Page |
|------|------|
| `dashboard.png` | `/dashboard` |
| `sales.png` | `/dashboard/sales` |
| `create-shop.png` | Shop Studio (`/dashboard/shops/{id}/setup`) |
| `live-shop.png` | Live buyer shop page |
| `step-shop.png` … `step-launch.png` | Each Studio tab (via `capture-studio-steps.mjs`) |

## Product demo video (`video/popup-product-demo.mp4`)

A ~40s motion-graphics product demo in the style of a bespoke launch showreel:
kinetic typography, spring-physics UI scenes rebuilt in React, zoom-through
transitions, and cinematic Veo 3.1 b-roll. Sound design is fully synthesized
(no licensed audio); the b-roll carries native Veo audio.

Pipeline (two stages, both reproducible):

```bash
# 1. Generate cinematic ceramics b-roll with Veo 3.1 (Gemini API, paid tier).
#    Uses public/marketing/demo/ photos as image-to-video start frames.
#    Output: marketing/video/broll/*.mp4 (gitignored intermediates).
GEMINI_API_KEY=... node marketing/generate-broll.mjs            # all shots
GEMINI_API_KEY=... node marketing/generate-broll.mjs mug kiln   # regenerate some

# 2. Render the Remotion composition (uses broll when present, and applies a
#    2.5D parallax treatment to stills as a fallback when it is missing).
cd marketing/remotion
npm install
npm run render          # -> marketing/video/popup-product-demo.mp4
npm run studio          # live preview / timeline editing
```

The Remotion project lives in `marketing/remotion/`:

- `src/theme.ts` — brand tokens mirrored from `src/app/globals.css`
- `src/components/shared.tsx` — spring presets, kinetic type, cards, badges, SFX
- `src/scenes/` — one file per scene (hook, b-roll, product cascade, buyer POV,
  scarcity, seller payoff, outro)
- `src/PopUpDemo.tsx` — the timeline
- `scripts/generate-sfx.mjs` — synthesizes the whole SFX palette as WAVs
- `scripts/sync-assets.mjs` — copies demo photos, b-roll, and Geist fonts into
  the (gitignored) `public/` dir before render

## Legacy walkthrough video

`video/create-shop-walkthrough.mp4` is an older slideshow-style Studio
walkthrough built from screenshots:

```bash
node marketing/capture-studio-steps.mjs      # capture per-step Studio tabs
node marketing/generate-marketing-video.mjs  # render slideshow
```

## Demo account

- **Email:** `marketing@popupdrop.co`
- **Password:** `marketing-demo-2026`
- **Seller:** `@maya.clay` — ceramics creator with $468 gross sales, live drop, chat, sold-out products

Images live in `public/marketing/demo/` (casual home-style ceramic stock
photos + product shots), served from `/marketing/demo/` and reused by the
video pipeline.

## Notes

- Seed script always uses `MARKETING_SUPABASE_URL` (defaults to `http://127.0.0.1:54321`) so hosted env secrets don't leak into the wrong database.
- `NEXT_PUBLIC_MARKETING_DEMO=1` prefills `/dashboard/shops/new` for optional manual captures.
- Re-run seed anytime to reset demo data.
- Veo generation requires a paid-tier Gemini API key (free tier has no Veo/image quota).
