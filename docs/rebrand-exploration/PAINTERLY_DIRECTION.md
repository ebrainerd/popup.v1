# PopUp rebrand exploration: painterly full-bleed

**Status:** exploration only (no product UI shipped)  
**Branch:** `cursor/painterly-rebrand-exploration-9929`  
**Date:** 2026-07-09

Reading this as: **marketing redesign exploration** for PopUp (timed pop-up shops),
inspired by painterly full-bleed landscape landings (GrowthOS / BookDem / Coltax
style), for founding sellers. Dials if we prototype: variance 7 / motion 5 /
density 3.

## What the references share

| Pattern | How it shows up |
| ------- | --------------- |
| Full-bleed illustration | Edge-to-edge painterly landscape, not a card |
| Sky as UI canvas | Headline + CTA sit in open sky / negative space |
| Minimal chrome | Logo + one CTA (+ optional sparse nav); white or dark type on art |
| One hero job | Brand, one line, one supporting sentence, one CTA |
| Soft social proof | Logo row *below* the fold, not inside the hero |
| Nature + product | Organic world with a light product metaphor (here: temporary markets) |

## Current PopUp (v3) vs this direction

| | Today (`globals.css` v3) | Painterly direction |
| - | ------------------------ | ------------------- |
| Atmosphere | CSS orbs + charcoal `#0f0f14` | Illustrated place as the brand world |
| Hero | Split: type left, claymation *card* right | Type over full-bleed art |
| Imagery | Claymation 3D on `#14070d` | Soft digital painting / concept-art landscapes |
| Accent system | Coral / teal / yellow triad everywhere | Accents reserved for CTAs + live states; art carries mood |
| Density | Long scroll, glass cards, marquee | Airier first viewport; cards only where interaction needs them |
| Theme | Dark-default product shell | Marketing can go high-key *or* dusk; product UI can stay dark |

Shop themes (`src/lib/shop-theme.ts`) stay seller-owned and out of scope for this
marketing exploration.

## Recommended PopUp adaptation (not a clone)

Keep PopUp’s product truth: **temporary markets, doors on a clock, live drops**.
Borrow the *composition language* of the references, not their industries.

**Working theme name:** *Temporary Market World*

- Painterly places where a pop-up could actually happen (park fair, coast tents,
  valley market, rooftop stalls).
- Open sky for type; market activity lives in the lower third.
- Brand accents appear as *light in the scene* (string lights, awnings) and as
  UI CTAs, not as neon mesh overlays.

### Palette options (marketing surfaces)

Pick one lane for a prototype; do not mix.

1. **Dusk Park (recommended default)**  
   Sky navy → peach; greens; warm stall lights. White type. CTA: coral or soft
   amber. Closest to “event tonight” energy without neon SaaS.

2. **Bright Hills (high-key / light mode)**  
   Cerulean sky, lime greens, dark type. CTA: near-black or deep coral. Best if
   we want to leave dark-default marketing behind.

3. **Coast Sunset (premium / calm)**  
   Indigo → orange sky; teal water. White type. CTA: black pill or coral. Softest
   “escape” mood; slightly less “drop urgency.”

4. **Rooftop Blue Hour (closest to current brand)**  
   Indigo city + warm lanterns; coral/teal awning accents. Easiest bridge from
   night-market v3 while adopting full-bleed art.

### Typography & UI chrome (if prototyped)

- Keep **Geist Sans** for product continuity, or trial a slightly more
  expressive sans for marketing only (e.g. Outfit / Satoshi) with Geist for app
  chrome.
- Emphasize one word with *italic of the same family*, not a random serif insert.
- Primary CTA: solid high-contrast pill (blue/coral/black depending on lane),
  not glass-on-glass.
- Optional frosted header CTA only when over busy art (BookDem-style), with a
  solid fallback for `prefers-reduced-transparency`.
- Disable or heavily tone `AnimatedBackground` orbs on marketing routes so they
  do not fight the illustration.

## Sample backgrounds (generated)

Stored as WebP under `public/rebrand-samples/` (full PNG masters in run
artifacts). Preview: `/rebrand-samples` (dev only).

| File | Lane | Best use |
| ---- | ---- | -------- |
| `popup-hero-dusk-park-market.webp` | Dusk Park | Default invite-only hero |
| `popup-hero-sunset-coast-market.webp` | Coast Sunset | Alternate / seasonal |
| `popup-hero-bright-hills-fair.webp` | Bright Hills | Light-mode marketing |
| `popup-hero-rooftop-blue-hour.webp` | Rooftop Blue Hour | Bridge from v3 night market |

These are **exploration samples**, not production assets. Before shipping:
optimize further, add a text scrim, and regenerate at 2x for retina if needed.

## Where it would plug in (when approved)

1. **`LandingHero`** — break out of `max-w-6xl`; `min-h-[100dvh]` full-bleed
   `next/image` + scrim; type centered or upper-third in sky.
2. **`AnimatedBackground`** — marketing-only off switch or replace with static
   art on `/` (and maybe `/sell`).
3. **Do not** apply full-bleed landscapes to dashboard / shop room by default;
   keep product UI on tokens.

## Explicit non-goals for this exploration

- No rename of PopUp / popupdrop.co
- No shop-theme preset changes
- No replacement of claymation step art yet (can stay for mid-page story)
- No production deploy of sample images as OG / PWA icons

## Suggested next step (owner decision)

1. Pick a lane (recommend **Dusk Park** or **Rooftop Blue Hour**).
2. Approve a thin prototype: invite-only hero + muted ambient bg only.
3. Decide whether product accents stay coral/teal/yellow or soften for marketing
   parity.

Until then, this branch is documentation + sample art only.
