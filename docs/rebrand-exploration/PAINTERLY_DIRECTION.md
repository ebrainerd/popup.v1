# PopUp rebrand exploration: painterly full-bleed

**Status:** exploration only (no product UI shipped)  
**Branch:** `cursor/painterly-rebrand-exploration-9929`  
**Date:** 2026-07-09 (updated: night-market lock)

Reading this as: **marketing redesign exploration** for PopUp (timed pop-up shops),
inspired by painterly full-bleed landscape landings, for founding sellers.
Dials if we prototype: variance 7 / motion 5 / density 3.

## Chosen direction (owner signal)

**Rooftop / urban night market** is the preferred visual world (the fourth
original sample, confirmed by the owner). Iterate in that lane; park / coast /
hills stay as optional alternates only.

Working theme name: **Midnight Drop** (temporary market under a dramatic sky).

## Inspiration sources

1. **Hassan (@uixhassan) SaaS heroes** — parent post
   [saas hero section designs](https://x.com/uixhassan/status/2074836467696972163)
   plus [background library (Figma)](https://www.figma.com/file/RfclXcMkCwJKsZcMw8HBL6?node-id=10-2)
   linked from
   [this reply](https://x.com/uixhassan/status/2074972725039214765).
   Pattern: full-bleed painterly plate, open sky as type canvas, minimal chrome,
   logo row under the fold.
2. Earlier GrowthOS / BookDem / Coltax-style references (same composition family).
3. PopUp product truth: timed shops, live drops, temporary stalls.

Figma MCP was not authenticated in this environment, so the library file was
not browsed node-by-node; composition cues come from the public hero screenshots
in the parent tweet.

## What the references share

| Pattern | How it shows up |
| ------- | --------------- |
| Full-bleed illustration | Edge-to-edge painterly landscape, not a card |
| Sky as UI canvas | Headline + CTA sit in open sky / negative space |
| Minimal chrome | Logo + one CTA (+ optional sparse nav) |
| One hero job | Brand, one line, one supporting sentence, one CTA |
| Soft social proof | Logo row *below* the fold, not inside the hero |
| Place as metaphor | Organic world with a light product metaphor (here: temporary markets) |

## Current PopUp (v3) vs this direction

| | Today (`globals.css` v3) | Midnight Drop direction |
| - | ------------------------ | ----------------------- |
| Atmosphere | CSS orbs + charcoal `#0f0f14` | Illustrated rooftop night market |
| Hero | Split: type left, claymation *card* right | Type over full-bleed art |
| Imagery | Claymation 3D on `#14070d` | Soft digital painting / concept-art |
| Accent system | Coral / teal / yellow triad everywhere | Lantern amber + sky indigo; coral/teal as stall accents + live states |
| Density | Long scroll, glass cards, marquee | Airier first viewport |
| Theme | Dark-default product shell | Marketing stays dusk/dark; product UI can keep tokens |

Shop themes (`src/lib/shop-theme.ts`) stay seller-owned and out of scope.

## Night-market iteration notes (v2)

Goals vs the original rooftop plate:

- More **open sky** in the upper half for white type (Hassan composition).
- Market activity pushed to **lower third** or soft **left/right bookends**.
- Keep warm lantern glow vs cool indigo sky (the emotional hook).
- Optional coral / teal fabric accents as quiet brand bridges, not neon mesh.

### Palette lock (marketing)

- Sky: indigo `#0b1026` → magenta → peach/orange horizon  
- Glow / CTA candidate: lantern amber `#ffb347` or soft coral `#ff3b8b`  
- Surfaces over art: white type + light scrim; solid white or near-black CTA pill  
- Avoid purple-glow SaaS mesh; let the painting carry atmosphere

### Typography & chrome (if prototyped)

- Geist Sans for continuity (or marketing-only Outfit / Satoshi).
- Emphasize one word with *italic of the same family*.
- Disable `AnimatedBackground` orbs on marketing routes.
- Optional frosted header only over busy art, with solid fallback.

## Sample backgrounds (generated)

Stored as WebP under `public/rebrand-samples/`. Preview: `/rebrand-samples` (dev only).

### Locked lane: night market v2

| File | Variant | Notes |
| ---- | ------- | ----- |
| `night-market-v2-open-sky.webp` | **Hero favorite** | Stalls lower; sky dominates; best type canvas |
| `night-market-v2-bookend-stalls.webp` | Strong alternate | Classic left/right stall frame, clear center sky |
| `night-market-v2-sky-ribbon.webp` | Wide pullback | Market as warm light ribbon; maximum sky |
| `night-market-v2-alley.webp` | Angle change | Street market corridor; more intimate, less sky |

### Earlier exploration (kept)

| File | Lane |
| ---- | ---- |
| `popup-hero-rooftop-blue-hour.webp` | Original rooftop (owner pick / base) |
| `popup-hero-dusk-park-market.webp` | Dusk Park |
| `popup-hero-sunset-coast-market.webp` | Coast Sunset |
| `popup-hero-bright-hills-fair.webp` | Bright Hills |

These are **exploration samples**, not production assets.

## Where it would plug in (when approved)

1. **`LandingHero`** — break out of `max-w-6xl`; `min-h-[100dvh]` full-bleed
   `next/image` + scrim; type in upper sky.
2. **`AnimatedBackground`** — off or muted on `/` (and maybe `/sell`).
3. **Do not** apply full-bleed landscapes to dashboard / shop room by default.

## Explicit non-goals

- No rename of PopUp / popupdrop.co
- No shop-theme preset changes
- No replacement of claymation step art yet
- No production deploy of sample images as OG / PWA icons

## Suggested next step (owner decision)

1. Confirm hero plate: **open-sky** vs **bookend-stalls**.
2. Approve a thin prototype: invite-only hero + muted ambient bg only.
3. Decide CTA color: lantern amber vs existing coral primary.

Until then, this branch is documentation + sample art only.
