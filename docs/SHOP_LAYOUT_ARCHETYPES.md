# Shop layout archetypes — product & engineering spec

Living handoff doc for redesigning PopUp’s **page layout** customization around four
seller archetypes. Pair with `src/lib/shop-theme.ts` (presets + layout modes) and
`docs/PRODUCT_UX_REVIEW.md` for broader UX context.

**Status:** Phase 0 (metadata + defaults) and Phase 1 (editor archetype picker +
preview phase toggle) and Phase 2 (Live Stage / `broadcast` buyer-page parity)
implemented (June 2026). Phases 3–5 (remaining per-layout buyer-page parity)
not started.  
**Owner intent:** Make shop customization feel intentional (“built for my kind of
drop”), not four interchangeable skins of the same page.

---

## 1. Goals

| Goal | Success signal |
| ---- | -------------- |
| Sellers pick a layout that matches *how they sell*, not just aesthetics | Layout picker shows archetype stories; lower “which one do I pick?” support |
| Buyer page hierarchy matches seller intent | Stream-first drops feel like events; curator drops feel like lookbooks |
| Preserve backward compatibility | Existing shops keep working; `shop_theme.layout` values unchanged in DB |
| Theme editor preview matches production | `ShopThemePreview` and `/shop/[id]` render the same structure per layout |

**Non-goals for v1 of this work**

- New color presets (keep Neon PopUp, Gallery, Dark Room, Market Stall)
- Per-layout custom CSS or drag-and-drop page builder
- Different layouts per shop phase (one layout per shop is enough)

---

## 2. Current state (baseline)

### Data model

Shop appearance is stored in `shops.shop_theme` (JSON), parsed by `parseShopTheme()`
in `src/lib/shop-theme.ts`:

```ts
type ShopTheme = {
  preset: "default" | "gallery" | "dark_room" | "market_stall";
  layout: "classic" | "broadcast" | "countdown" | "catalog";
  accent: string;           // #rrggbb
  background: "solid" | "gradient" | "none";
  productGridColumns: 2 | 3;
  showChat: boolean;
  showSellerBio: boolean;
  showReminderCta: boolean;
};
```

No migration required for layout work unless we add new fields (e.g. recommended
preset hints).

### Where layout is edited

| Surface | File |
| ------- | ---- |
| Setup wizard (Layout & theme step) | `src/components/wizard-theme-step.tsx` → `ShopThemeEditor` |
| Manage shop customize page | `src/app/dashboard/shops/[id]/customize/page.tsx` → `ShopThemeEditor` |
| Server persist | `updateShopTheme()` in `src/app/dashboard/actions.ts` |

### Where layout is rendered (buyer shop)

| Concern | File |
| ------- | ---- |
| Page shell + section order | `src/components/shop-page-view.tsx` (`StreamChatRow`, `MainContent`, header) |
| Stream / banner / countdown hero | `src/components/stream-slot.tsx` |
| Theme editor preview (must match prod) | `src/components/shop-theme-preview.tsx` |
| Product grid density | `src/components/products-grid-live.tsx` via `theme.productGridColumns` |
| CSS hooks | `shopThemeRootClassName()` → `shop-layout-{layout}` on `ShopThemeShell` |

### Current layout modes (internal IDs → UI labels)

| `layout` slug | Current label | One-line behavior |
| ------------- | ------------- | ----------------- |
| `classic` | Classic | Banner top, details, products; chat in right column beside stream |
| `broadcast` | Stream first | Large stream/banner hero; products below; chat full width under grid |
| `countdown` | Waiting room | Oversized countdown on hero; reminder CTA prominent; lighter preview |
| `catalog` | Catalog | Product grid leads; stream/chat as supporting panels below |

Metadata lives in `SHOP_LAYOUT_MODE_META` in `src/lib/shop-theme.ts`.

### Shop phases (all layouts must handle)

Derived in `derivePublishedShopWindow()` (`src/lib/utils.ts`):

| Phase | Buyer experience |
| ----- | ---------------- |
| **Draft preview** (owner only) | Preview banner; purchases/chat disabled |
| **Scheduled** (published, before `start_at`) | Waiting room; reminders; optional product preview |
| **Open** (within window) | Purchases enabled; live stream may replace banner |
| **Ended** | Sold-out / closed messaging |

Layouts should define behavior per phase, especially **scheduled vs open vs live**.

---

## 3. Strategy: archetypes → layouts

We anchor customization on **what the seller optimizes for**, not visual taste alone.

| Archetype | In-product layout name | Keep slug | Evolves |
| --------- | ---------------------- | --------- | ------- |
| **The Showrunner** | **Live Stage** | `broadcast` | Stream-first event |
| **The Curator** | **Lookbook** | `catalog` | Product/editorial-first |
| **The Hype Dropper** | **Drop Clock** | `countdown` | Countdown/reminder-first |
| **The Room Host** | **The Room** | `classic` | Balanced community room |

**Keep existing enum slugs** (`classic`, `broadcast`, `countdown`, `catalog`) for
backward compatibility. Rebrand labels, descriptions, defaults, and preview art in
`SHOP_LAYOUT_MODE_META` and the theme editor.

Recommended **default preset pairings** (suggested on pick, not forced):

| Layout | Suggested preset | Why |
| ------ | ---------------- | --- |
| Live Stage (`broadcast`) | Neon PopUp (`default`) | High energy, live badges |
| Lookbook (`catalog`) | Gallery (`gallery`) | Editorial, image-forward |
| Drop Clock (`countdown`) | Dark Room (`dark_room`) | Urgency, night-drop vibe |
| The Room (`classic`) | Market Stall (`market_stall`) | Warm, conversational |

---

## 4. Archetype profiles (full)

### 4.1 The Showrunner — *“My drop is a live event.”*

**Who**

- TikTok / IG / YouTube creators, musicians, personalities
- Audience shows up when they go live; the stream *is* the marketing

**What they sell**

- Merch, collabs, signed items, 1-of-1 lots
- Heavy use of flash drops and live auctions

**How they use PopUp**

- PopUp Live or embedded YouTube/Twitch
- Chat banter, flash price changes, “starting this auction now”
- Link in bio → shop opens during or right before stream

**Buyer mindset**

- “I’m here for the show.” FOMO, presence, impulse bids
- Wants stream + chat visible without hunting for products

**Layout job:** Maximize **watch time** and make buy/bid one tap away.

**North-star reference:** Live shopping / Whatnot-style energy (without copying UI).

---

### 4.2 The Curator — *“Every piece deserves a moment.”*

**Who**

- Artists, photographers, printmakers, jewelers, small-batch makers

**What they sell**

- Few SKUs, high consideration, story-driven listings
- May never go live; banner/cover is enough

**How they use PopUp**

- Multiple photos per product, thoughtful descriptions
- Scheduled open; sells through the window, not a single live moment

**Buyer mindset**

- “Let me look.” Collecting, gifting, aesthetic fit
- Scrolls, reads, compares — not racing a clock

**Layout job:** **Products lead**; imagery and whitespace sell; stream/chat optional.

**North-star reference:** Editorial shop / gallery opening page.

---

### 4.3 The Hype Dropper — *“The clock is the product.”*

**Who**

- Streetwear, sneakers, resin artists, anyone whose brand is scarcity + “doors at…”

**What they sell**

- Small runs that sell out fast; reminders and group-chat link shares matter

**How they use PopUp**

- Pre-marketing on social; “Remind me” is critical
- Shop opens at exact time; may flip live at open but **time** is the hook

**Buyer mindset**

- “Don’t miss the window.” Timer-driven, reminder-driven
- Tolerates less chat before open; wants clarity on when and how to buy

**Layout job:** **Countdown + reminder CTA** dominate pre-open; sharp transition to shop-open state.

**North-star reference:** Drop page clarity (SNKRS / Supreme-style tension, not clutter).

---

### 4.4 The Room Host — *“Come hang out — something might be for sale.”*

**Who**

- Vintage dealers, hobby resellers, craft-fair regulars, casual community sellers

**What they sell**

- Mixed lots, vintage finds, handmade — trust in the *person* matters

**How they use PopUp**

- Pre-bids on multiple auction lots while shop is open
- Chat Q&A, repeat drops, same followers month to month

**Buyer mindset**

- “I trust this seller.” Asks questions, pre-bids, comes back
- Wants seller visible and chat handy, not a stadium show

**Layout job:** **Balanced room** — stream/banner, sidebar chat, scannable product grid, seller bio on.

**North-star reference:** Dealer table / friendly pop-up stall.

---

## 5. Per-layout specification

Each layout defines: **hero priority**, **section order**, **default toggles**, and
**phase behavior**. Implement in `shop-page-view.tsx`, `stream-slot.tsx`, and
`shop-theme-preview.tsx` together (preview drift is a common bug).

### 5.1 Live Stage (`broadcast`)

| Attribute | Spec |
| --------- | ---- |
| **Tagline** | Built for live selling |
| **Hero** | Stream or cover at **wide aspect** (min ~16:9); replaces banner when live |
| **Section order (open)** | Header → **Stream hero** → auction live panel (if any) → products (full width) → chat (full width below products) |
| **Section order (scheduled)** | Header → cover/banner → **compact** countdown strip (not full waiting-room takeover) → product preview → chat as announcements |
| **Chat** | Full width below products when open; side column optional on xl only if it improves stream height |
| **Default toggles** | `showChat: true`, `showSellerBio: false`, `showReminderCta: false`, `productGridColumns: 2` |
| **Header** | Compact when live; emphasize LIVE badge + viewer count |
| **Mobile** | Stream sticky or top; products stack; chat collapsible accordion below fold |

**Acceptance**

- [ ] When `shop.is_live`, stream is visually dominant on first screen (mobile + desktop)
- [ ] Product cards remain reachable within one scroll on mobile
- [ ] Preview matches production for scheduled + open + live

---

### 5.2 Lookbook (`catalog`)

| Attribute | Spec |
| --------- | ---- |
| **Tagline** | Let your work lead |
| **Hero** | **No oversized stream** unless live; cover image as editorial band or omitted when products exist |
| **Section order (open)** | Header (minimal) → **products grid first** → stream/banner band (if configured) → chat |
| **Section order (scheduled)** | Header → short shop story + seller bio → **product preview grid** → slim countdown footer → reminders |
| **Chat** | Below products; collapsible on mobile; never competes with row 1 |
| **Default toggles** | `showChat: true`, `showSellerBio: true`, `showReminderCta: true`, `productGridColumns: 3` |
| **Product grid** | Prefer 3 columns desktop; larger card images, more description visible |
| **Mobile** | Single column; generous image aspect; sticky “View cart” not required v1 |

**Acceptance**

- [ ] First paint above fold is product imagery (scheduled + open)
- [ ] Stream embed height capped (e.g. max 40vh) when shown below grid
- [ ] Seller bio visible when `showSellerBio` (default on)

---

### 5.3 Drop Clock (`countdown`)

| Attribute | Spec |
| --------- | ---- |
| **Tagline** | Hype the opening |
| **Hero** | **Oversized countdown** + shop name; cover as backdrop |
| **Section order (scheduled)** | Header → **hero countdown** → Remind me + follower CTAs → **product preview** (muted/teaser) → announcements (not full chat) |
| **Section order (open)** | Clear “We’re open” state; shrink hero; products at full fidelity; chat enabled |
| **Default toggles** | `showChat: false` (pre-open), `showReminderCta: true`, `showSellerBio: false`, `productGridColumns: 2` |
| **Reminder CTA** | Always visible when scheduled + `showReminderCta` |
| **Product preview** | Scheduled: titles/prices visible; buy buttons disabled until open |
| **Mobile** | Countdown readable at 375px; reminder button thumb-reachable |

**Acceptance**

- [ ] Scheduled shop: countdown is the largest element in hero
- [ ] Transition at `start_at`: hero collapses or swaps without full page reload (client `useShopOpen`)
- [ ] `WaitingRoomBanner` + layout hero don’t duplicate countdown awkwardly (consolidate copy)

---

### 5.4 The Room (`classic`)

| Attribute | Spec |
| --------- | ---- |
| **Tagline** | Your regulars’ hangout |
| **Hero** | Standard banner / stream in left column |
| **Section order** | Header (with seller bio snippet) → **two-column**: stream/banner + **chat sidebar** → auction panel → products |
| **Section order (scheduled)** | Same grid; chat panel shows announcements; bio + remind visible |
| **Default toggles** | `showChat: true`, `showSellerBio: true`, `showReminderCta: true`, `productGridColumns: 2` |
| **Chat** | Persistent right column desktop (`lg:grid-cols-[1fr_340px]` — already in `StreamChatRow`) |
| **Auctions** | Pre-bid on multiple lots; product grid shows per-lot bid state (see auctions PRD) |
| **Mobile** | Chat below stream (stacked), not sidebar |

**Acceptance**

- [ ] Desktop: chat visible beside stream without scrolling
- [ ] Seller bio appears in header when `showSellerBio`
- [ ] Feels warm with Market Stall preset (rounded cards, earthy tones)

---

## 6. Theme editor UX (seller-facing)

### 6.1 Layout picker redesign

Replace flat list of four technical names with **archetype cards**:

Each card shows:

- Layout name + tagline (e.g. **Live Stage** — *Built for live selling*)
- 1-sentence “Best for…” (Showrunner-style copy)
- Mini thumbnail (static SVG or screenshot per layout × preset)
- “Recommended theme: Gallery” chip (click applies preset)

File: `src/components/shop-theme-editor.tsx` — layout section (~line 139).

### 6.2 Smart defaults on layout change

When seller selects a layout, **offer** (modal or inline confirm):

> Apply recommended settings for Live Stage? (Neon PopUp theme, chat on, 2-column grid)

If accepted, patch `preset`, `accent`, toggles, and `productGridColumns` per §5 defaults.
If declined, only change `layout`.

Do **not** silently overwrite preset without consent (existing shops switching layout).

### 6.3 Preview fidelity

`ShopThemePreview` must implement the same section order as `shop-page-view.tsx` for
each layout. Add a **phase toggle** in editor: Scheduled / Open / Live (mock).

File: `src/components/shop-theme-preview.tsx`.

---

## 7. Technical implementation plan

Phased so an agent can land incremental PRs without a big-bang rewrite.

### Phase 0 — Spec & metadata (small PR)

- [x] This document
- [x] Update `SHOP_LAYOUT_MODE_META` labels/taglines/descriptions to archetype copy
- [x] Add `SHOP_LAYOUT_DEFAULTS: Record<ShopLayoutMode, Partial<ShopTheme>>` in `shop-theme.ts`
- [x] Unit tests for new metadata and defaults helper
- [x] Link from `docs/HANDOFF.md` → here

**Files:** `src/lib/shop-theme.ts`, `test/unit/shop-theme.test.ts`, `docs/HANDOFF.md`

---

### Phase 1 — Theme editor archetype picker

- [x] Archetype cards with recommended preset chips
- [x] Optional “Apply recommended settings” when changing layout
- [x] Phase toggle in preview (scheduled / open / live mock)
- [x] `docs/PRE_MARKETING_TEST.md` §3 — update layout names

**Files:** `shop-theme-editor.tsx`, `shop-theme-preview.tsx`

**Risks:** Preview/prod drift — add comment cross-links between preview and page view.

> **Note (Phase 1, June 2026):** The preview phase toggle is a *mock* — it
> swaps the hero treatment (countdown overlay / LIVE badge), shows the reminder
> CTA when scheduled, and tints products as "soon". Full per-phase **section
> reordering** per §5 lands in Phases 2–5 alongside `shop-page-view.tsx`; until
> then the preview keeps each layout's existing section order.

---

### Phase 2 — Live Stage (`broadcast`) parity

- [x] Audit `stream-slot.tsx` `wideHero` paths for broadcast
- [x] Implement §5.1 section order in `shop-page-view.tsx` (chat below products on open)
- [x] Mobile: collapsible chat below fold; stream-first section order
- [x] Mirror in preview

**Test:** Manual on `/shop/[id]` with native live + embed; Playwright smoke optional.

---

### Phase 3 — Lookbook (`catalog`) parity

- [ ] Products before stream on buyer page when layout `catalog`
- [ ] Cap stream height when below grid
- [ ] Default 3-column grid when switching to catalog (with consent)
- [ ] Preview mirror

---

### Phase 4 — Drop Clock (`countdown`) parity

- [ ] Hero countdown sizing + reminder prominence
- [ ] Deduplicate `WaitingRoomBanner` vs layout hero (pick one source of truth)
- [ ] Open-state transition (hero shrink)
- [ ] Preview mirror

**Files:** `stream-slot.tsx`, `waiting-room-banner.tsx`, `countdown.tsx`

---

### Phase 5 — The Room (`classic`) polish

- [ ] Seller bio in header when `showSellerBio`
- [ ] Confirm auction pre-bid grid works in classic layout (multi-lot)
- [ ] Desktop chat sidebar min-heights
- [ ] Preview mirror

---

### Phase 6 — QA & docs

- [ ] Walk `docs/PRE_MARKETING_TEST.md` Phase 17 (theme & customize)
- [ ] `docs/MANUAL_TESTING.md` — four layouts × two presets smoke matrix
- [ ] Update `docs/PRODUCT_UX_REVIEW.md` cross-link (optional)

---

## 8. File map (quick reference)

```
src/lib/shop-theme.ts              # Layout enum, meta, defaults, CSS class names
src/components/shop-theme-editor.tsx
src/components/shop-theme-preview.tsx
src/components/shop-theme-shell.tsx
src/components/shop-page-view.tsx  # Buyer page structure
src/components/stream-slot.tsx     # Hero/stream/countdown
src/components/waiting-room-banner.tsx
src/components/countdown.tsx
src/app/dashboard/shops/[id]/customize/page.tsx
src/components/wizard-theme-step.tsx
test/unit/shop-theme.test.ts
```

No DB migration expected unless adding new `shop_theme` keys.

---

## 9. Backward compatibility

| Concern | Approach |
| ------- | -------- |
| Existing `layout` values in DB | Keep slugs; only change display strings |
| Shops on old labels | Automatic — metadata drives UI |
| `shop_theme` JSON missing keys | `parseShopTheme()` already fills defaults |
| Legacy `preset: "broadcast"` | Already mapped to `default` in `parseShopTheme()` |

---

## 10. Testing checklist (implementer)

### Automated

```bash
npm run typecheck && npm run lint && npm run test
```

Extend `test/unit/shop-theme.test.ts`:

- `SHOP_LAYOUT_DEFAULTS` returns expected toggles per layout
- Renamed meta strings (snapshot or explicit asserts)

### Manual (per layout)

| Step | Live Stage | Lookbook | Drop Clock | The Room |
| ---- | ---------- | -------- | ---------- | -------- |
| Scheduled: hero correct | stream/cover wide | products preview | big countdown | balanced 2-col |
| Open: products buyable | ✓ | ✓ | ✓ | ✓ |
| Live: stream replaces banner | ✓ | capped below grid | ✓ | left column |
| Mobile 375px | stream visible | grid readable | timer readable | chat reachable |
| Customize preview ≈ shop page | ✓ | ✓ | ✓ | ✓ |

---

## 11. Open questions (resolve before Phase 2)

1. **Rename slugs?** Recommendation: **no** — rebrand UI only unless marketing needs new URLs.
2. **Auto-apply defaults on layout pick?** Recommendation: **confirm dialog**, not silent.
3. **Layout-specific auction panel placement?** Live Stage may pin panel above products; Lookbook may tuck panel below hero — document per layout when implementing.
4. **Explore/marketplace discovery cards** — do shop cards show layout badge? Defer.

---

## 12. Agent handoff checklist

Before starting implementation:

1. Read this doc + skim `src/lib/shop-theme.ts` and `shop-page-view.tsx`
2. Run app locally (`AGENTS.md` — Supabase + `npm run dev`)
3. Open `/dashboard/shops/[id]/customize` and `/shop/[id]` for a draft shop
4. Pick **one phase** per PR; keep preview and production in sync
5. Do not change `ShopLayoutMode` union without migration plan
6. Update `SHOP_LAYOUT_MODE_META` in the same PR as any buyer-facing layout behavior change

**Suggested first PR:** Phase 0 + Phase 1 (metadata + editor cards + preview phase toggle).

---

## 13. Related docs

| Doc | Relevance |
| --- | --------- |
| `docs/AUCTIONS_PRD.md` | Auction panel placement, pre-bids |
| `docs/NATIVE_LIVE_STREAMING.md` | Stream hero, PopUp Live |
| `docs/PRE_MARKETING_TEST.md` | §3 wizard theme, §17 customize |
| `docs/PRODUCT_UX_REVIEW.md` | Mobile density, trust |
| `docs/CREATOR_DROP_LOOP.md` | Scheduled-state layout notes |

---

*Last updated: June 2026 — spec authored for layout customization initiative.*
