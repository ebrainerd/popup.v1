# Shop layout archetypes — product & engineering spec

Living handoff doc for PopUp’s **page layout** customization. Pair with
`src/lib/shop-theme.ts` (presets + layout modes) and `docs/PRODUCT_UX_REVIEW.md`
for broader UX context.

> **Current product (July 2026):** The seller **layout picker ships only two
> layouts** — **The Room** (`classic`) and **Lookbook** (`catalog`). Legacy slugs
> `broadcast` (Live Stage) and `countdown` (Drop Clock) are **retired from the
> picker** and fold into `classic` via `normalizeLayout()` /
> `SHOP_PICKABLE_LAYOUTS` in `src/lib/shop-theme.ts`. They may remain in the DB
> enum for backward compatibility; code may still branch on them for legacy shops
> and preview, but **do not implement them as active picker options.**

**Status:** **All phases complete (June 2026).** Phase 0 (metadata + defaults),
Phase 1 (editor archetype picker + preview phase toggle), Phase 2 (Live Stage /
`broadcast`), Phase 3 (Lookbook / `catalog`), Phase 4 (Drop Clock / `countdown`),
and Phase 5 (The Room / `classic`) shipped the buyer-page parity work; **Phase 6
(QA & docs)** is now done — see §7 below.  
**Owner intent:** Make shop customization feel intentional (“built for my kind of
drop”), not interchangeable skins of the same page.

---

## 1. Goals

| Goal | Success signal |
| ---- | -------------- |
| Sellers pick a layout that matches *how they sell*, not just aesthetics | Picker shows two archetype stories (The Room + Lookbook); lower “which one do I pick?” support |
| Buyer page hierarchy matches seller intent | Room-style drops balance stream + chat; curator drops lead with products |
| Preserve backward compatibility | Existing shops keep working; legacy `broadcast` / `countdown` fold to `classic` |
| Theme editor preview matches production | `ShopThemePreview` and `/shop/[id]` render the same structure per layout |

**Non-goals for v1 of this work**

- New color presets (keep Neon PopUp, Gallery, Dark Room, Market Stall)
- Per-layout custom CSS or drag-and-drop page builder
- Different layouts per shop phase (one layout per shop is enough)
- Re-adding Live Stage (`broadcast`) or Drop Clock (`countdown`) to the picker — retired July 2026

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

### Layout modes (internal IDs → UI labels)

| `layout` slug | Picker label | Status | One-line behavior |
| ------------- | ------------ | ------ | ----------------- |
| `classic` | **The Room** | **Pickable** | Stream + chat first (two columns); products below |
| `catalog` | **Lookbook** | **Pickable** | Product grid leads; stream band below |
| `broadcast` | Live Stage | **Retired** — folds to `classic` | Was stream-first hero; legacy DB values only |
| `countdown` | Drop Clock | **Retired** — folds to `classic` | Was countdown-first hero; legacy DB values only |

Pickable set: `SHOP_PICKABLE_LAYOUTS` in `src/lib/shop-theme.ts`. Legacy slugs
normalize via `normalizeLayout()`. Metadata for all four slugs lives in
`SHOP_LAYOUT_MODE_META` (retired entries kept for display of legacy shops).

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

### Pickable today (July 2026)

| Archetype | In-product layout name | Slug | Behavior |
| --------- | ---------------------- | ---- | -------- |
| **The Room Host** | **The Room** | `classic` | Stream + chat first; products below |
| **The Curator** | **Lookbook** | `catalog` | Products first; stream band below |

### Retired from picker (fold into The Room)

| Archetype | Was | Slug | Fate |
| --------- | --- | ---- | ---- |
| **The Showrunner** | Live Stage | `broadcast` | Retired — `normalizeLayout()` → `classic` |
| **The Hype Dropper** | Drop Clock | `countdown` | Retired — `normalizeLayout()` → `classic` |

**Keep existing enum slugs** (`classic`, `broadcast`, `countdown`, `catalog`) in the
DB for backward compatibility. Only `classic` and `catalog` appear in the seller
picker (`SHOP_PICKABLE_LAYOUTS`).

Recommended **default preset pairings** (suggested on pick, not forced):

| Layout | Suggested preset | Why |
| ------ | ---------------- | --- |
| Lookbook (`catalog`) | Gallery (`gallery`) | Editorial, image-forward |
| The Room (`classic`) | Market Stall (`market_stall`) | Warm, conversational |

---

## 4. Archetype profiles (full)

### 4.1 The Showrunner — *“My drop is a live event.”* **(retired — folded into The Room)**

> **July 2026:** Live Stage (`broadcast`) is no longer pickable. Sellers who want
> stream-first energy use **The Room** (`classic`), which keeps stream + chat
> prominent. Do not re-implement as a separate picker option.

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

### 4.3 The Hype Dropper — *“The clock is the product.”* **(retired — folded into The Room)**

> **July 2026:** Drop Clock (`countdown`) is no longer pickable. Countdown and
> reminder UX live in the stream slot and `WaitingRoomBanner` (status-only: final
> stretch / on the list) across layouts. Do not re-implement as a separate picker
> option.

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

### 5.1 Live Stage (`broadcast`) — **RETIRED** (folds to The Room)

> Historical spec. Legacy `broadcast` values in the DB render as **The Room**
> (`classic`) via `normalizeLayout()`. Kept for reference only — do not implement
> as an active layout.

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

### 5.3 Drop Clock (`countdown`) — **RETIRED** (folds to The Room)

> Historical spec. Legacy `countdown` values in the DB render as **The Room**
> (`classic`) via `normalizeLayout()`. Countdown UX is owned by the stream slot;
> `WaitingRoomBanner` is status-only (not a second clock). Kept for reference only.

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

Replace flat list of technical names with **archetype cards** (two pickable today):

Each card shows:

- Layout name + tagline (e.g. **The Room** — *Your regulars’ hangout*)
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
> reordering** per §5 landed in Phases 2–5 alongside `shop-page-view.tsx`.
> **July 2026:** picker narrowed to The Room + Lookbook; legacy layouts fold to
> `classic` — see banner at top of this doc.

---

### Phase 2 — Live Stage (`broadcast`) parity

- [x] Audit `stream-slot.tsx` `wideHero` paths for broadcast
- [x] Implement §5.1 section order in `shop-page-view.tsx` (chat below products on open)
- [x] Mobile: collapsible chat below fold; stream-first section order
- [x] Mirror in preview

**Test:** Manual on `/shop/[id]` with native live + embed; Playwright smoke optional.

---

### Phase 3 — Lookbook (`catalog`) parity

- [x] Products before stream on buyer page when layout `catalog` (`shop-page-view.tsx` — mirror Phase 2 `isBroadcast` branch)
- [x] Cap stream height when below grid (~40vh in `stream-slot.tsx`)
- [x] Verify 3-column grid offered via existing “Apply recommended settings” on catalog pick (Phase 1 — no new editor work expected)
- [x] Preview mirror (`shop-theme-preview.tsx` catalog branch)

**Pattern:** See `isCatalog` / `BroadcastChatBelow` / `CatalogReminderFooter` in `shop-page-view.tsx`.

---

### Phase 4 — Drop Clock (`countdown`) parity

- [x] Hero countdown sizing + reminder prominence
- [x] Deduplicate `WaitingRoomBanner` vs layout hero (pick one source of truth)
- [x] Open-state transition (hero shrink)
- [x] Preview mirror

**Files:** `stream-slot.tsx`, `waiting-room-banner.tsx`, `countdown.tsx`, `shop-page-view.tsx`, `countdown-layout-panel.tsx`

---

### Phase 5 — The Room (`classic`) polish — DONE

- [x] Seller bio in header when `showSellerBio` — header now leads the `classic`
      section order (was below the stream), so the bio/title sit at the top per §5.4
- [x] Confirm auction pre-bid grid works in classic layout (multi-lot) — `classic`
      renders `AuctionLivePanel` + `ProductsGridLive` (per-lot bid state) unchanged
- [x] Desktop chat sidebar min-heights — `StreamChatRow` adds `lg:min-h-[20rem]` so
      the chat column stays usable beside a short banner without scrolling
- [x] Preview mirror — `shop-theme-preview.tsx` `classic` branch reordered to
      title → [hero + chat sidebar] → products

**Files:** `shop-page-view.tsx`, `shop-theme-preview.tsx`

---

### Phase 6 — QA & docs — DONE

- [x] Walk `docs/PRE_MARKETING_TEST.md` Phase 17 (theme & customize) — expanded
      to 17.1–17.10 covering pickable layouts, phase toggles, recommended-settings
      prompt, and preview ≈ buyer-page parity
- [x] `docs/MANUAL_TESTING.md` — added a **Shop layout archetypes** section with a
      two-layout editor smoke matrix (L1–L11) plus buyer-page parity checks (B1–B4)
- [x] Update `docs/PRODUCT_UX_REVIEW.md` cross-link — note added under Layout &
      visual critique pointing at this spec and the smoke matrix

**QA performed (June 2026):** `npm run typecheck`, `npm run lint`, `npm run test`
(134 passed / 9 skipped), and `npm run build` all pass. Manual GUI smoke on a
seeded scheduled shop walked both pickable layouts × Scheduled/Open/Live in the
customize **Live preview**: each layout reordered/restyled per §5.2 and §5.4,
the phase toggle swapped the hero (countdown → open → LIVE badge), and the "Apply
recommended settings" prompt fired on layout change. No errors or broken/blank
previews. **July 2026:** picker narrowed to The Room + Lookbook; legacy
`broadcast` / `countdown` fold to `classic`. Local-stack note: a stale DB volume
can leave migrations partially applied (`profiles.follower_count` missing → shop
queries fail with `column … does not exist`, surfacing as a 404 on owner pages);
`supabase db reset` re-applies all migrations + `seed.sql` grants and resolves it.

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

### Manual (per pickable layout)

| Step | Lookbook (`catalog`) | The Room (`classic`) |
| ---- | -------------------- | -------------------- |
| Scheduled: hero correct | products preview first | stream + chat two-col; stream countdown |
| Open: products buyable | ✓ | ✓ |
| Live: stream replaces banner | capped below grid | left column beside chat |
| Mobile 375px | grid readable; chat collapsed | stream visible; chat accordion |
| `WaitingRoomBanner` | status-only (no duplicate countdown) | status-only (stream owns timer) |
| Customize preview ≈ shop page | ✓ | ✓ |

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
2. Read **`docs/HANDOFF.md` → “Shop layout archetypes”** for current picker state
3. Run app locally (`AGENTS.md` — Supabase + `npm run dev`)
4. Open `/dashboard/shops/[id]/customize` and `/shop/[id]` for a draft shop
5. Pick **one phase** per PR; keep preview and production in sync
6. Do not change `ShopLayoutMode` union without migration plan
7. Update `SHOP_LAYOUT_MODE_META` in the same PR as any buyer-facing layout behavior change

**Suggested next PR:** None — all phases (0–6) are complete. Future layout work
would be net-new scope (e.g. per-layout custom CSS, layout badges on Explore
cards — see §11 open questions).

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

*Last updated: July 2026 — picker ships The Room + Lookbook only; legacy layouts fold to classic.*
