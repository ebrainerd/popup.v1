# PopUp Auctions PRD

## Purpose

Auctions should become a core PopUp feature because they make a live shop feel
like an event. Sellers can choose whether a product is sold as **Buy Now** or
as a **Live Auction**. Buyers should feel the tension of a countdown, the rush
of being outbid, and the satisfaction of winning a one-link creator drop.

This document gives engineering the product requirements, implementation notes,
and an agent prompt to build auctioning safely.

## Positioning

Auctions should show up in PopUp's top-level marketing, not as an advanced
seller setting.

Recommended invite-only homepage hero:

> Online pop-up shops with live auctions in one link.

Recommended supporting line:

> Create a timed shop, share it anywhere, run live auctions or Buy Now drops,
> and sell before the clock runs out.

Recommended CTA:

> Create a pop-up shop

Recommended capability card:

- Title: `Live auctions`
- Body: `Run countdown auctions in the room with max bids, anti-snipe extensions, and instant winner checkout.`

Avoid treating auctions as a marketplace-only feature. In the current launch
mode, sellers bring their own audience and use PopUp to make the drop more fun.

## Marketplace patterns researched

Use these patterns as the product baseline:

- **eBay:** automatic/proxy bidding. Buyer enters the maximum they are willing
  to pay; the system bids only enough to keep them in the lead. Bid increments
  scale as prices rise. Equal max bids favor the earlier bid.
  Source: https://www.ebay.com/help/buying/bidding/automatic-bidding?id=4014
- **eBay reserve prices:** hidden reserve can protect sellers but also creates
  buyer frustration. PopUp should avoid hidden reserves in v1 and use starting
  bid as the seller's floor.
  Source: https://www.ebay.com/help/selling/listings/selling-auctions/reserve-prices?id=4143
- **Whatnot:** live auctions can be started during a show; sellers set starting
  bid and duration. Standard auctions extend near the end; sudden death auctions
  do not. Buyers can use max bids and pre-bids.
  Source: https://help.whatnot.com/hc/en-us/articles/9779931101837-Start-an-auction-during-your-show
- **Whatnot bidding:** max bid is default; the app auto-bids in increments up
  to the buyer's limit. Pre-bids work before the item goes live.
  Source: https://help.whatnot.com/hc/en-us/articles/14932924544141-Bid-on-an-item-during-a-show
- **Bring a Trailer:** anti-sniping extends the auction when bids arrive in the
  final minutes so buyers can respond.
  Source: https://bringatrailer.com/2016/06/11/new-bat-auction-features-and-2-minute-extensions/
- **Sotheby's:** maximum bids execute automatically, max values stay private,
  bid increments are predetermined, and first equal maximum bid wins.
  Source: https://help.sothebys.com/en/support/solutions/articles/44002518078-guide-for-buyers-global

## Product decision

Build **live auction lots** for PopUp shops.

Each product has one sale mode:

- `buy_now`: current behavior.
- `auction`: seller runs the product as an auction lot.

Do not support hidden reserve prices in v1. Starting bid is the seller's
minimum acceptable price.

Do not support automatic payment capture in v1 unless saved payment methods are
already available. Current Stripe Checkout flow does not store buyer payment
methods, so v1 settlement should use an exclusive winner checkout window.

## V1 feature set

### Seller setup

On product create/edit:

- Add sale mode:
  - `Buy Now`
  - `Auction`
- If `Buy Now`:
  - Use existing price and quantity behavior.
- If `Auction`:
  - Required `starting_bid`.
  - Required `minimum_increment`.
  - Required `auction_duration_seconds`.
  - Optional `allow_prebids` toggle, default `true`.
  - Optional `sudden_death` toggle, default `false`.
  - Quantity must be `1` for v1 auctions.

Recommended defaults:

- Starting bid: seller-entered, minimum `$0.50`.
- Minimum increment:
  - Default to `$1.00` for items under `$100`.
  - Seller may raise it.
  - Do not allow less than `$0.50`.
- Duration:
  - Presets: `30 sec`, `60 sec`, `2 min`, `5 min`.
  - Default: `60 sec`.
- Soft close:
  - Default on.
  - If a bid lands with fewer than `10 seconds` left, reset remaining time to
    `10 seconds`.
- Sudden death:
  - Optional, clearly labeled as "advanced".
  - No extension; final valid bid before zero wins.

Seller copy:

> Auction items run live in your shop room. Buyers place max bids and PopUp
> handles the countdown.

### Seller live controls

On the shop management page / seller room controls:

- Show auction products in an `Auction queue`.
- Seller can:
  - Start an auction.
  - See current high bid, bidder display name, bid count, and timer.
  - Let the auction end automatically.
  - Re-run an unsold auction.
  - Cancel a queued auction.
  - Cancel a live auction only if there are no bids.
- Once a live auction has bids:
  - Seller cannot edit starting bid, increment, duration, or product details.
  - Seller cannot delete the product.
  - Seller cannot end the auction early except via an admin/support-only path.

### Buyer bidding

For scheduled shops:

- Auction products show as `Auction`.
- If `allow_prebids` is enabled, buyers can place a max pre-bid before the shop
  opens or before the seller starts the lot.
- If pre-bids are not enabled, show "Bidding opens live."

For open shops:

- The active auction is pinned above products and chat.
- The product card for the active auction should show:
  - Current bid.
  - Next minimum bid.
  - Time left.
  - Bid count.
  - Leading bidder display name or "You are winning".
- Buyer bid control:
  - Primary button: `Bid $X`.
  - Secondary option: `Set max bid`.
  - Max bid should be the default mental model.
- Buyer must be logged in to bid.
- Seller cannot bid on their own auction.
- Bids are binding. Show clear copy:
  - `If you win, you agree to pay this price plus shipping.`
- Show outbid feedback immediately:
  - `You were outbid. Your max bid was reached.`
- Show winning feedback:
  - `You are winning at $X.`

### Proxy/max bidding

Implement proxy bidding for v1.

Rules:

- Buyer submits a `max_bid`.
- Public current bid only rises enough to beat the next highest max bid by the
  minimum increment.
- The max bid amount is private to the bidder.
- If two bidders submit the same max bid, the earlier bid wins.
- If a new bid is not high enough to become leading, it is accepted as a max bid
  only if it improves that bidder's previous max, and the buyer is told they are
  still outbid.
- Public bid events show:
  - Current visible bid.
  - Current leading bidder display name.
  - Bid count.
  - Whether the current viewer is winning.
- Do not broadcast private max amounts.

Example:

1. Starting bid is `$20`, increment is `$2`.
2. Alice max-bids `$50`; visible bid becomes `$20`; Alice leads.
3. Bob max-bids `$30`; visible bid becomes `$32`; Alice leads.
4. Bob max-bids `$60`; visible bid becomes `$52`; Bob leads.

### Soft close / anti-snipe

Default live auction behavior:

- If a bid is accepted with fewer than `10 seconds` remaining, extend the
  auction so `10 seconds` remain.
- Broadcast an `auction_extended` event.
- Show a small UI pulse:
  - `Bid landed - timer extended.`

Sudden death:

- Optional seller setting.
- No extension.
- Label clearly:
  - `Sudden death: last valid bid before zero wins.`
- Use sparingly; standard soft-close should be the default because it is fairer
  and better for higher bids.

### Winning and checkout

V1 should use a **winner checkout window** because the current app uses Stripe
Checkout and does not store buyer payment methods.

At auction close:

- Highest bidder becomes `winner`.
- Product inventory is reserved for the winner.
- Winner sees a prominent CTA:
  - `You won - checkout now`
- Winner has an exclusive checkout window:
  - Use `30 minutes` to align with Stripe Checkout minimum session lifetime.
- The winning checkout amount is:
  - winning bid + shop shipping rate.
- Checkout metadata must include:
  - `auction_id`
  - `winning_bid_id`
  - `product_id`
  - `shop_id`
  - `buyer_id`
- Existing Stripe webhook should create the order and mark the auction
  `paid/settled`.
- If checkout expires or is canceled:
  - Auction becomes `payment_expired`.
  - Seller can re-run the auction or offer to next highest bidder in a later
    phase.

V2 goal:

- Save buyer payment method before bidding.
- Auto-charge winner when auction ends, like Whatnot.
- This should not block v1.

### Realtime behavior

Use the existing shop Realtime channel.

Add room events:

- `auction_started`
- `auction_bid`
- `auction_outbid`
- `auction_extended`
- `auction_ended`
- `auction_won`
- `auction_payment_started`
- `auction_payment_expired`

Use `emit` for seller-started auctions and local sender updates, consistent
with existing room guidance.

### Data model

Add to `products`:

- `sale_type text not null default 'buy_now' check in ('buy_now', 'auction')`
- `auction_starting_bid integer`
- `auction_min_increment integer`
- `auction_duration_seconds integer`
- `auction_allow_prebids boolean not null default true`
- `auction_sudden_death boolean not null default false`

Add `auction_runs`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `shop_id` | uuid | References shops |
| `product_id` | uuid | References products |
| `seller_id` | uuid | Denormalized owner |
| `status` | text | `queued`, `live`, `ended`, `awaiting_payment`, `paid`, `payment_expired`, `canceled`, `unsold` |
| `starting_bid` | integer | cents |
| `min_increment` | integer | cents |
| `current_bid` | integer | visible current bid, cents |
| `current_winner_id` | uuid | nullable profile id |
| `winning_bid_id` | uuid | nullable |
| `bid_count` | integer | public count |
| `starts_at` | timestamptz | nullable until live |
| `ends_at` | timestamptz | nullable until live |
| `soft_close_seconds` | integer | default 10 |
| `sudden_death` | boolean | default false |
| `checkout_expires_at` | timestamptz | nullable |
| `stripe_session_id` | text | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | maintained |

Add `auction_max_bids`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `auction_id` | uuid | References auction_runs |
| `bidder_id` | uuid | References profiles |
| `max_amount` | integer | private cents |
| `created_at` | timestamptz | tie-breaker |
| `updated_at` | timestamptz | latest max |

Constraint:

- Unique `(auction_id, bidder_id)`.

RLS:

- Bidder can read own max bid.
- Seller can read max bid rows only after auction ends, or never if simpler.
- Public viewers cannot read max bid rows.
- Service role / RPC can read all for bid resolution.

Add `auction_bid_events`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `auction_id` | uuid | References auction_runs |
| `bidder_id` | uuid | nullable for system opening events |
| `visible_amount` | integer | public current bid after resolution |
| `event_type` | text | `prebid`, `bid`, `proxy_bid`, `outbid`, `win`, `extend` |
| `created_at` | timestamptz | default now |

RLS:

- Readable if `can_read_shop(shop_id)` for the auction.
- Insert only through server action/RPC.

Add to `orders`:

- `auction_id uuid null references auction_runs(id)`
- `winning_bid_id uuid null`

### Atomic bidding

Do not implement bidding with client-side reads followed by updates.

Create a Postgres RPC or service-role server function that performs one
transaction:

1. Lock `auction_runs` row `for update`.
2. Validate auction status:
   - `live`, or `queued/scheduled` for pre-bids if enabled.
3. Validate bidder:
   - authenticated,
   - not seller,
   - not muted/banned if applicable,
   - bid amount >= required minimum.
4. Upsert bidder max bid.
5. Recompute leader using max amount desc, created_at asc.
6. Recompute visible current bid.
7. Extend timer if soft-close applies.
8. Insert public bid event rows.
9. Update `auction_runs`.
10. Return public state plus viewer-specific state:
    - winning,
    - outbid,
    - next minimum bid,
    - current bid,
    - ends_at.

### Bid increments

V1:

- Seller sets `auction_min_increment`.
- App enforces `next_minimum_bid = current_bid + min_increment`.
- Min increment must be at least `$0.50`.

V2:

- Add optional automatic increment table similar to eBay.
- Keep seller-set increment for creator control.

### Product inventory rules

V1 auctions require quantity `1`.

Reason:

- Multi-quantity auctions create complex allocation rules.
- PopUp's fun live mechanic is strongest when a single item is on the clock.

If a seller wants to sell multiples:

- They can create multiple auction products/lots.
- Or use Buy Now.

### Editing rules

Auction product can be edited while:

- no auction run exists, or
- latest run is `queued`, `unsold`, `canceled`, or `payment_expired`.

Auction product cannot be edited while:

- `live`,
- `awaiting_payment`,
- `paid`.

### Notifications

Use realtime for live-room feedback first.

Optional notifications:

- If a buyer places a pre-bid, show dashboard/profile state.
- If outbid while not watching, push/email is a later enhancement.
- Free-trial constraints mean do not promise email/push auction alerts yet.

### Analytics

Post-drop report should include:

- Auctions run.
- Auction revenue.
- Average bids per auction.
- Highest bid.
- Unsold auctions.
- Payment completion rate.
- Auction viewer count if available.

Seller dashboard should distinguish:

- Buy Now sales.
- Auction wins.
- Auction payments pending.
- Auction payments expired.

## UX requirements

### Seller product form

Add a `Sale type` segmented control:

- `Buy Now`
- `Auction`

When `Auction` selected:

- Hide/rename existing `Price` as `Starting bid`.
- Show `Minimum increment`.
- Show `Auction duration`.
- Show `Allow pre-bids`.
- Show `Sudden death` advanced toggle.
- Show helper:
  - `Auction items sell to the highest bidder. The winner checks out after the timer ends.`

### Product cards

Buy Now card:

- Same as today.

Auction card before live:

- Badge: `Auction`
- Starting bid.
- If pre-bids enabled: `Place pre-bid`
- If pre-bids disabled: `Bidding opens live`

Auction card while active:

- Pinned active auction treatment.
- Current bid and countdown.
- Bid button.
- Max bid input.

Auction card ended:

- If viewer won: checkout CTA.
- If paid: `Sold for $X`.
- If expired/unsold: `Auction ended`.

### Live room

The active auction should be a room moment:

- Pin it above the product grid/chat on desktop.
- On mobile, pin it above chat/products with sticky bid controls while live.
- Broadcast bid events into the room feed:
  - `Maya is winning at $42`
  - `Timer extended`
  - `Sold to @maya for $42`
- Use tasteful animation when:
  - new high bid,
  - outbid,
  - final 10 seconds,
  - winner declared.

## Copy requirements

Homepage hero should mention auctions:

- H1 option A: `Online pop-up shops with live auctions in one link.`
- H1 option B: `Create a live pop-up shop with auctions, drops, and checkout.`

Suggested supporting copy:

> Share one link, open on the clock, run live auctions or Buy Now drops, and
> turn your audience into a room of bidders.

Seller page hero:

> Run live auctions from your own shop link.

Auction setup helper:

> Set the starting bid, choose a countdown, and start the auction when your room
> is ready.

Buyer bid helper:

> Enter your max bid. PopUp will bid just enough to keep you winning, never
> above your max.

Winner copy:

> You won. Checkout within 30 minutes to claim it.

## Legal/trust requirements

- Show that bids are binding before submission.
- Show final checkout may include shipping and taxes.
- Prevent seller self-bidding.
- Prevent bidding on closed shops.
- Prevent bidding on unpublished/draft products.
- Prevent bid retraction in v1.
- Keep an immutable bid event audit log.
- Do not reveal private max bid values.
- Add Terms language later for auctions before public launch.

## Testing requirements

Automated:

- Unit tests:
  - increment calculation,
  - proxy bid resolution,
  - equal max bid tie-breaker,
  - anti-snipe extension,
  - seller cannot self-bid,
  - winner checkout state transitions.
- RLS/integration tests:
  - public can read public auction events but not private max bids,
  - bidder can read own max bid,
  - seller cannot create non-draft/public auction bypassing product rules,
  - non-owner cannot start/cancel another seller's auction.
- Server action/RPC tests:
  - concurrent bids resolve to one correct winner,
  - lower bid rejected,
  - stale auction rejected,
  - checkout only for winner.
- E2E:
  - seller creates auction product,
  - seller starts auction,
  - buyer bids,
  - second buyer outbids,
  - timer extends,
  - winner sees checkout CTA.

Manual:

- Test in a live room with two browser sessions.
- Verify realtime bid updates, countdown extension, outbid state, and winner CTA.
- Record a short walkthrough video for the PR.

## Implementation milestones

### Milestone A: Auction data model and product setup

Ship:

- Product sale type.
- Auction fields.
- Product form changes.
- Validation and RLS.
- Auction product display for scheduled/open shops.

### Milestone B: Live auction runner

Ship:

- Auction queue.
- Seller start controls.
- `auction_runs`.
- Realtime events.
- Active auction UI.

### Milestone C: Bidding engine

Ship:

- Atomic bid placement.
- Proxy max bids.
- Bid event log.
- Soft-close timer extension.
- Buyer winning/outbid states.

### Milestone D: Winner checkout

Ship:

- Winner-only checkout action.
- Stripe metadata.
- Webhook settlement.
- Payment expired state.
- Seller dashboard order state.

### Milestone E: Marketing and analytics

Ship:

- Hero copy with auctions.
- Seller page auction copy.
- Post-drop auction metrics.
- E2E walkthrough.

## Open decisions

- Should pre-bids be enabled by default?
  - Recommendation: yes. It lets sellers build demand before live time.
- Should sudden death exist in v1?
  - Recommendation: yes as an advanced toggle, but default to standard soft
    close.
- Should hidden reserves exist?
  - Recommendation: no v1. Use starting bid as the seller's floor.
- Should winners be auto-charged?
  - Recommendation: v2. V1 uses exclusive checkout because the current app does
    not store buyer payment methods.
- Should auction products support Buy Now fallback?
  - Recommendation: not in v1. Seller chooses Buy Now or Auction to keep UX
    clear.

## Engineer agent prompt

Use this prompt to implement:

---

Implement PopUp live auctions from `docs/AUCTIONS_PRD.md`.

Goal: auctions become a core PopUp feature and a core marketing promise. PopUp
should read as "online pop-up shops with live auctions in one link."

Implement in milestones, keeping the current invite-only launch mode intact:

1. Add auction sale type to products:
   - `buy_now` keeps current behavior.
   - `auction` requires starting bid, minimum increment, duration, allow
     pre-bids, and optional sudden death.
   - V1 auction quantity must be 1.
2. Add auction tables and types:
   - `auction_runs`
   - `auction_max_bids`
   - `auction_bid_events`
   - nullable `orders.auction_id` / `orders.winning_bid_id`
   - update `src/lib/database.types.ts`
3. Implement seller UX:
   - product form sale type selector,
   - auction queue,
   - start auction control,
   - current high bid/timer/bid count,
   - re-run unsold auction,
   - prevent editing/deleting active or awaiting-payment auction products.
4. Implement buyer UX:
   - auction cards,
   - active auction pinned in the room,
   - max bid input,
   - next bid button,
   - winning/outbid states,
   - pre-bids if enabled,
   - clear binding-bid copy.
5. Implement atomic bidding:
   - use a Postgres RPC or service-role transaction,
   - row-lock auction run,
   - validate auth/shop/product/auction state,
   - resolve proxy max bids,
   - first equal max bid wins,
   - write public bid events,
   - soft-close extension if bid lands under 10 seconds,
   - broadcast realtime events.
6. Implement winner checkout:
   - highest bidder gets exclusive checkout,
   - 30 minute checkout window,
   - Stripe Checkout amount is winning bid plus shipping,
   - metadata includes auction and bid IDs,
   - webhook marks auction paid/settled and creates order,
   - expired/canceled checkout marks auction payment expired.
7. Update marketing:
   - homepage hero must mention live auctions,
   - seller page must mention live auctions,
   - add auction capability card.
8. Add tests:
   - unit tests for proxy bidding, increments, tie-breakers, soft close,
   - RLS tests for max bid privacy and auction event visibility,
   - server/RPC tests for concurrent bids,
   - e2e/manual two-browser walkthrough for seller starts auction and buyers bid.
9. Run:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
   - `npm run test:e2e`
10. Create/update the PR with:
   - migration instructions,
   - test results,
   - a walkthrough video showing a live auction.

Do not remove Buy Now behavior. Do not re-enable public marketplace discovery.
Auctions should work inside invite-link shops.

---
