# PopUp Creator Drop Loop PRD

> **Status: mostly shipped; some items partial.** This PRD is a **historical
> requirements doc**. Rough mapping: **Milestone A** (drop page + launch kit) —
> shipped; **Milestone B** (drop reminders + cron) — shipped; **Milestone C**
> (waiting room + post-drop loop) — largely shipped; **Milestone D** (curated
> marketplace) — partial (invite-only mode; Explore gates in
> `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md`). For live status, see
> **`docs/HANDOFF.md`**.

## Purpose

PopUp should reduce cold-start risk by launching as creator-led drop
infrastructure first, then growing into a marketplace after enough scheduled
supply exists. The product loop is:

1. Creator schedules a drop.
2. Creator shares one public link with their existing audience.
3. Buyers follow, waitlist, preview products, and opt into reminders.
4. PopUp reminds buyers before and at opening time.
5. Drop goes live with chat, video, flash drops, and checkout.
6. Buyers receive order updates and follow the creator.
7. Seller sees results and schedules the next drop.

This document turns that loop into implementation work for engineering.

## Product bet

The first winning use case is not "browse PopUp every day." It is "a creator
can run a high-energy limited drop from one link." Marketplace discovery should
support the loop, but it should not be the only way a drop gets buyers.

### Why this matters

- Live marketplaces look empty when supply is thin.
- Creators already have audiences on Instagram, TikTok, Twitch, YouTube,
  Discord, email, and SMS.
- PopUp can provide the commerce mechanics those channels do not: timed shop,
  waitlist, reminders, live room, flash drops, checkout, fulfillment, and
  post-drop analytics.

## Current foundation

Already shipped:

- Public shop pages with countdown, live embed, products, follow, chat, and
  realtime room.
- Explore with All, Live stream, Opening Soon, Following, Soonest, and Popular.
- Seller dashboard, shop creation, draft to publish, product management, and
  Stripe Connect payouts.
- Checkout, inventory reservations, orders, shipping updates, ratings, and
  order emails.
- Go-live follower notifications through web push and email when providers are
  configured.

Known gaps this PRD addressed (see status banner for what shipped):

- Opening-time and drop reminders — **shipped** (cron every 15 min on
  `/api/cron/send-drop-reminders`; opening sends on shop open).
- Empty marketplace states do not help buyers find future value.
- The product does not yet capture drop-level intent before checkout.
- Sellers do not have a launch kit that helps them bring their own audience.
- Post-drop analytics are not framed around helping sellers repeat the loop.

## Goals

### User goals

- Creators can publish a drop page before launch and confidently promote it.
- Buyers can express interest before a drop opens without creating a checkout.
- Buyers receive reliable reminders before the drop and when it opens.
- Sellers can see whether their promotion worked and schedule the next drop.
- PopUp can show curated upcoming activity even when no shop is currently open.

### Business goals

- Increase first-drop attendance per seller.
- Increase buyer follow and reminder opt-in rates.
- Increase repeat drops per seller.
- Reduce the perception that PopUp is empty during off-hours.
- Create enough scheduled supply to make Explore useful later.

### Non-goals for this phase

- **Native PopUp Live (LiveKit) shipped** after this PRD; YouTube/Twitch embeds
  remain supported. See `docs/NATIVE_LIVE_STREAMING.md`.
- International shipping and tax.
- Full CRM or marketing automation.
- Replacing seller-owned social channels.
- Complex creator eligibility, paid ads, or recommendation algorithms.

Note: live auctions became a separate core feature direction after this PRD;
use `docs/AUCTIONS_PRD.md` for auction requirements.

## Target users

### Creator with an existing audience

Has products and followers elsewhere. Wants a simple link, a countdown, a live
event feel, and payment handling.

Primary success: "I shared a link and people showed up when the drop opened."

### Buyer from the creator's audience

Arrives from a social link. May not know PopUp. Wants to see what is dropping,
get reminded, and buy quickly.

Primary success: "I did not miss the drop."

### PopUp operator

Curates early supply, monitors drop quality, and helps creators launch.

Primary success: "The homepage and Explore show credible upcoming activity."

## Loop requirements

### 1. Creator schedules a drop

#### Product requirement

The seller dashboard should treat a scheduled shop as a launch campaign, not
only an inventory container.

#### UX requirements

- Add a "Launch checklist" on the shop dashboard:
  - Shop details complete.
  - At least one product added.
  - Cover image added.
  - Live URL optional but recommended.
  - Stripe payouts connected.
  - Drop published.
  - Share link copied.
  - First reminder test sent, if notifications are configured.
- Add "Preview public drop page" and "Copy share link" as prominent actions.
- Show a "Drop health" summary:
  - Published status.
  - Opening time.
  - Product count.
  - Available units.
  - Followers for seller.
  - Drop waitlist count.

#### Engineering notes

- Extend `src/app/dashboard/shops/[id]/page.tsx` with a launch checklist card.
- Reuse existing shop/product/payout data where possible.
- Add a computed helper in `src/lib/shops.ts` or a new `src/lib/drop-readiness.ts`
  to keep readiness rules out of the page component.
- No schema is required for the first checklist except waitlist count.

#### Acceptance criteria

- A seller can open a draft or published shop and see what remains before
  launch.
- The share URL can be copied without opening the public page.
- The checklist updates after product, publish, payout, and live URL changes.

### 2. Creator shares one public link

#### Product requirement

Every published scheduled shop should act as a promotional landing page before
it opens.

#### UX requirements

- On scheduled shop pages, emphasize:
  - Creator identity.
  - Countdown.
  - Product preview.
  - "Remind me" primary CTA.
  - "Follow creator" secondary CTA.
  - Share controls.
- Add share copy variants sellers can copy:
  - Short social caption.
  - Live-shopping caption.
  - Countdown reminder caption.
- Generate Open Graph metadata with shop image, name, seller handle, and start
  time so links look good in social previews.

#### Engineering notes

- Update `src/app/shop/[id]/page.tsx` scheduled-state layout.
- Add a small `ShareDropCard` client component for copy/share actions.
- Enhance `generateMetadata` for shop pages with OG fields.
- Keep private/link-only shops out of Explore, but allow the page link to work.

#### Acceptance criteria

- A logged-out buyer can understand what is dropping and when.
- A seller can copy at least one share link and one caption.
- Social unfurls use the shop cover where available.

### 3. Buyers waitlist and opt into reminders

#### Product requirement

Buyers need a drop-level intent action before checkout. "Follow seller" is
useful, but it is too broad; "Remind me for this drop" is the core action.

#### UX requirements

- Add "Remind me" on scheduled shop pages.
- Logged-out buyers can start the action and are prompted to sign up/log in.
- Logged-in buyers can choose reminder channels:
  - Email.
  - Web push, if supported and permission is granted.
- Buyers can cancel a reminder from the same CTA.
- Show social proof:
  - "23 people want a reminder."
  - If count is low, use softer copy like "Be first in the room."

#### Data model

Add `drop_reminders`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `shop_id` | uuid | References `shops.id`, cascade delete |
| `user_id` | uuid | References auth user/profile |
| `email_enabled` | boolean | Default true |
| `push_enabled` | boolean | Default false |
| `remind_before_at` | timestamptz | Nullable; next pre-open reminder |
| `opening_sent_at` | timestamptz | Nullable |
| `created_at` | timestamptz | Default now |
| `cancelled_at` | timestamptz | Nullable |

Constraints:

- Unique active reminder per `(shop_id, user_id)` where `cancelled_at is null`.
- RLS:
  - Users can select/insert/update their own reminders.
  - Sellers can read aggregate reminder counts for their own shops.
  - Service role can send reminders.

#### Engineering notes

- Add server actions in `src/app/shop/reminder-actions.ts`.
- Add helper functions in `src/lib/drop-reminders.ts`.
- Use existing `push_subscriptions` and email helpers where possible.
- Avoid making the buyer choose channels in a modal for MVP; default email on,
  offer push permission inline when available.

#### Acceptance criteria

- A logged-in buyer can add and remove a reminder for a scheduled shop.
- Reminder count is visible on scheduled shop pages and seller dashboard.
- RLS prevents users from reading another buyer's reminder rows.

### 4. PopUp reminds buyers before and at opening time

#### Product requirement

The product promise depends on reliable scheduled reminders. Go-live
notifications are not enough because a shop can open on the clock without a
seller pressing "Go live."

#### Reminder policy

For MVP:

- 24 hours before open, if the drop is more than 24 hours away.
- 1 hour before open, if the drop is more than 1 hour away.
- At opening time.

If cron frequency is limited, prioritize:

1. Opening-time reminders.
2. 1-hour reminders.
3. 24-hour reminders.

#### Engineering options

Option A: Vercel cron

- Add `/api/cron/send-drop-reminders`.
- Run every 15 minutes on paid Vercel, daily is not enough for this feature.
- Query upcoming reminders due since the last run.

Option B: Supabase scheduled function

- Use Supabase cron/Edge Function for sub-hour scheduling.
- Keep sending logic in the app if operational simplicity matters, but trigger
  from Supabase.

Recommendation: use whichever platform can run at least every 15 minutes in
production. A daily cron does not satisfy this requirement.

#### Engineering notes

- Add idempotency columns for each reminder window or a child
  `drop_reminder_deliveries` table.
- Reuse existing Resend and web push infrastructure.
- Record delivery attempts and failures for seller/operator visibility.
- Do not block the cron on a single failed email or push send.

#### Acceptance criteria

- A reminder is sent once per due window.
- Retrying the cron does not duplicate already-sent reminders.
- Cancelled reminders are skipped.
- Reminders include a direct link to the shop.
- Missing email/push provider config degrades gracefully and is visible in logs.

### 5. Drop opens into a waiting room and live room

#### Product requirement

The scheduled shop page should convert smoothly from "come back later" to "join
now." Buyers who arrive early should feel like they are part of the event.

#### UX requirements

- Scheduled state:
  - Countdown.
  - Product preview.
  - Reminder CTA.
  - Share CTA.
  - "Waiting room" chat or seller announcements, if enabled.
- Final 10 minutes:
  - More urgent countdown treatment.
  - "You are in the waiting room" state after reminder signup.
  - Optional quick emoji reactions.
- Open state:
  - Products and checkout become primary.
  - Chat remains visible.
  - Live embed appears when available.
  - Flash drops retain current behavior.

#### Engineering notes

- Current chat is tied to `isOpen`; evaluate allowing pre-open seller
  announcements first, then full waiting-room chat later.
- Start with seller announcements to reduce moderation risk.
- Consider a `shop_announcements` table before opening pre-drop chat to all
  users.
- Preserve current Realtime channel naming (`shop:{id}`).

#### Acceptance criteria

- Buyers arriving before open understand whether they should wait, follow,
  share, or return later.
- At open time, a refresh or client-side status update makes purchase actions
  available.
- Existing flash-drop broadcasts continue to work.

### 6. Buyer purchases and follows

#### Product requirement

Checkout should be fast, and a successful purchase should reinforce the loop.

#### UX requirements

- After checkout success, show:
  - Order confirmation.
  - Follow creator CTA if not already following.
  - "Get next drop reminders" CTA.
  - Share "I caught the drop" CTA.
- If inventory sells out:
  - Show sold-out state.
  - Offer follow/reminder for next drop.

#### Engineering notes

- Enhance `/orders?checkout=success` with contextual post-purchase CTA if the
  last checkout session/order can be resolved safely.
- If resolving the exact order is complex, start with a generic "Follow creators
  you bought from" module on `/orders`.
- Keep checkout inventory reservation behavior unchanged.

#### Acceptance criteria

- A buyer sees a clear next action after purchase.
- Sold-out buyers are not dead-ended.

### 7. Seller reviews results and schedules next drop

#### Product requirement

The seller should leave a drop with enough feedback to decide whether to run
another one.

#### UX requirements

Add a post-drop report to the shop dashboard:

- Gross sales.
- Orders.
- Units sold.
- Product sell-through.
- Peak viewers.
- Chat message count.
- Drop reminder signups.
- Reminder open/click/send counts, if available.
- Conversion from reminder signup to purchase, if available.
- Followers gained during the drop window.
- Suggested next actions:
  - Schedule another drop.
  - Duplicate this drop.
  - Message followers about the next drop, if supported later.

#### Data model notes

- Reuse existing orders, products, peak viewers, ratings, and follows.
- Add reminder counts from `drop_reminders`.
- Consider `drop_events` later for more precise attribution:
  - `shop_viewed`
  - `reminder_created`
  - `checkout_started`
  - `order_completed`
  - `follow_created`

#### Acceptance criteria

- Seller can see a post-drop summary without exporting data.
- "Duplicate drop" or "Schedule next drop" is a visible CTA.
- The report can load even if analytics tables are empty.

## Marketplace and homepage changes

### Principle

Early marketplace pages should show scheduled momentum, not only live liquidity.

### Homepage requirements

- Replace or supplement "Happening Now" with "Upcoming Drops."
- Show curated or soonest upcoming drops by default.
- If there are no upcoming drops:
  - Show creator onboarding.
  - Show "Get notified when PopUp launches more drops."
  - Avoid implying the marketplace is dead.

### Explore requirements

- Default to upcoming + open drops.
- Add clearer labels:
  - "Live now"
  - "Streaming"
  - "Opening soon"
  - "Following"
- For Following, consider showing upcoming followed drops, not only open shops.

### Operator curation

Add lightweight curation before algorithmic ranking:

- `shops.featured_at` nullable timestamp, or
- `shops.editorial_rank` integer nullable.

Use this to ensure the homepage has credible scheduled supply while the market
is small.

### Acceptance criteria

- A visitor can find future drops even when none are live.
- Operator can feature a drop without code changes.
- Empty states drive to reminders, search, creator invite, or seller signup.

## Implementation milestones

### Milestone A: Drop page and seller launch kit

Ship:

- Shop dashboard launch checklist.
- Copy share link.
- Scheduled shop page emphasis.
- Share captions.
- OG metadata for shop pages.
- Homepage "Upcoming Drops" treatment.

Why first: improves seller-led distribution without new background jobs.

### Milestone B: Drop reminders

Ship:

- `drop_reminders` migration and RLS.
- Reminder CTA on scheduled shop pages.
- Reminder count on shop page and seller dashboard.
- Cron/function for 1-hour and opening reminders.
- Email and push sends with idempotency.

Why second: closes the largest product promise gap.

### Milestone C: Waiting room and post-drop loop

Ship:

- Pre-open waiting state.
- Seller announcements or limited pre-open chat.
- Post-checkout follow/reminder CTAs.
- Post-drop seller report.
- "Duplicate/schedule next drop" CTA.

Why third: increases event energy and repeat seller behavior.

### Milestone D: Curated marketplace

Ship:

- Featured drops.
- Operator curation tooling or simple admin-only field workflow.
- Improved Explore Following behavior.
- Better buyer empty states.

Why fourth: marketplace value grows after scheduled supply exists.

## Metrics

### Activation

- Shops published per seller.
- Published shops with at least one product.
- Published shops with share link copied.
- Published shops with at least one reminder signup.

### Demand capture

- Reminder signup rate per shop view.
- Follow rate per shop view.
- Share action rate.
- Product preview engagement.

### Attendance

- Reminder delivery success rate.
- Reminder click-through rate.
- Open-time room viewers.
- Peak viewers.

### Conversion

- Checkout starts per viewer.
- Orders per viewer.
- Sell-through rate.
- Sold-out drops.

### Retention

- Buyers who follow after purchase.
- Buyers who set reminders for another drop.
- Sellers who schedule another drop.
- Time between seller drops.

## Technical dependencies and risks

### Custom domain and email

Real email delivery is blocked until domain and Resend sender setup are
finished. Do this before relying on reminders as a launch mechanic.

### Cron frequency

Daily cron is not sufficient for opening-time reminders. Engineering and ops
must choose a sub-hour scheduler before Milestone B ships.

### Notification permissions

Web push requires browser permission and can fail silently by platform. Email
should be the default reminder channel.

### Realtime scale

Waiting rooms and live rooms increase concurrent Realtime connections. Keep
the initial waiting room lightweight and measure before opening full pre-drop
chat.

### Abuse and moderation

Pre-open chat increases moderation needs. Seller announcements are safer for
the first version.

## Open product decisions

- Should "Remind me" require an account, or allow email-only reminders?
  - Recommendation: account required for MVP because auth, follows, push, and
    order history already assume users.
- Should reminders be per seller or per shop?
  - Recommendation: both. "Follow seller" remains broad; "Remind me" is per
    shop.
- Should private/link-only drops support reminders?
  - Recommendation: yes, if the viewer has the link.
- Should pre-open chat be buyer-enabled?
  - Recommendation: not in the first milestone. Start with seller
    announcements.
- Should PopUp support operator-curated drops before an admin UI exists?
  - Recommendation: yes, with a nullable featured timestamp edited directly in
    the database until an admin surface is justified.

## QA checklist

- Scheduled public shop renders correctly for logged-out and logged-in users.
- Reminder CTA handles add, cancel, unauthenticated redirect, and provider
  fallback states.
- Opening reminder sends once and links to the correct shop.
- Seller dashboard shows accurate reminder and readiness counts.
- Existing checkout, flash drops, chat, and follow actions still work for open
  shops.
- Explore and homepage do not look empty when upcoming drops exist.
- RLS prevents reminder data leakage between buyers.
- Cron/function is idempotent under retries.

## Launch plan

1. Fix custom domain and email sender setup.
2. Recruit a small number of creators with existing audiences.
3. Manually curate their scheduled drops on the homepage.
4. Have each creator publish a drop page and share the link externally.
5. Measure reminder signup, attendance, and sales.
6. Use post-drop reports to get creators to schedule another drop.
7. Only expand broad marketplace discovery once there is consistent upcoming
   supply.
