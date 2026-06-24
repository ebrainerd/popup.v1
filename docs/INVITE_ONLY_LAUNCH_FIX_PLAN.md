# PopUp Invite-Only Launch & Creator Loop Fix Plan

## Recommendation

Run PopUp in **seller-led, invite-link-only launch mode** for now.

Do not market PopUp as a buyer marketplace yet. The worst early impression is a
visitor clicking Explore and seeing no activity. Instead, market the seller
capability:

> Run a timed live drop from one link. Bring your audience; PopUp handles the
> countdown, waiting room, flash drops, checkout, orders, and post-drop report.

Buyers should enter through a creator's shared shop link. PopUp can become a
marketplace later, after there is enough scheduled supply to make discovery
feel alive.

## Why invite-link only

- It removes the "empty marketplace" failure mode.
- It matches the current growth loop: sellers market their shops to buyers.
- It works with free-trial infrastructure because the product can succeed
  without paid discovery, paid scheduler frequency, or native marketplace
  liquidity.
- It makes scarcity feel intentional: "selected creators are opening drops,"
  not "nobody is here."

## Free-trial constraints to respect

These constraints should shape the implementation:

- **Vercel Hobby cron is daily only.** Do not rely on sub-hour jobs for opening
  reminders until there is another scheduler or a paid plan.
- **Resend free/default sender is constrained.** If the custom domain and
  verified sender are not configured, do not promise real buyer email delivery.
- **Push is optional.** Web push requires keys, browser support, and permission.
  Treat it as additive, not the main reminder channel.
- **No paid marketplace demand yet.** Public buyer discovery should stay hidden
  until scheduled supply exists.
- **Manual operations are acceptable early.** It is fine if the owner manually
  curates sellers, checks drops, and sends launch comms outside PopUp while the
  product loop is validated.

## Product decision: remove public Explore for now

### Launch mode behavior

Add a single launch-mode switch, for example:

- `NEXT_PUBLIC_DISCOVERY_MODE=invite_only`
- Default: `invite_only` until intentionally changed.
- Future value: `marketplace`.

When `invite_only`:

- Hide Explore from primary navigation.
- Homepage is seller-facing, not buyer-marketplace-facing.
- `/sell` and `/signup` are primary CTAs.
- `/shop/[id]` remains public by link for published shops.
- `/explore` should not show empty grids.
- `/search` should be hidden from nav or restricted to logged-in/internal use.
- Shop pages should remain excluded from sitemap.

### `/explore` options

Pick one:

1. **Recommended:** redirect `/explore` to `/sell` or `/`.
2. Render a lightweight holding page:
   - "PopUp is invite-link only while we onboard selected creators."
   - CTA: "Start a drop."
   - Optional CTA: "Have a shop link? Paste it/open it directly."

Do not render an empty marketplace grid in invite-only mode.

### Homepage changes

In invite-only mode:

- Remove "Live now" counts and any copy implying broad marketplace activity.
- Replace "Browse what's happening now" with "See how seller-led drops work."
- Keep product capability sections:
  - Timed drops.
  - Shareable shop links.
  - Waiting room / announcements.
  - Flash drops.
  - Checkout and fulfillment.
  - Post-drop report.
- Add one buyer-facing note:
  - "Got a creator's PopUp link? Open it directly to join their drop."

### Route/nav acceptance criteria

- A first-time visitor cannot land on a public page that says there are zero
  drops.
- A seller can still create, publish, preview, and copy a shop link.
- A buyer with `/shop/[id]` can view the scheduled/open shop without logging in.
- No primary nav item points to an empty discovery surface.

## P0 engineering fixes before relying on the creator loop

### 1. Fail closed on cron auth

Problem: cron routes perform service-role work and currently authorize only
when `CRON_SECRET` is set.

Fix:

- Apply to both:
  - `src/app/api/cron/send-drop-reminders/route.ts`
  - `src/app/api/cron/release-funds/route.ts`
- In production, return `500` or `401` if `CRON_SECRET` is missing.
- Allow unauthenticated local calls only when `NEXT_PUBLIC_APP_ENV !==
  "production"` or `NODE_ENV !== "production"`.
- Update `docs/DEPLOYMENT.md`: move `CRON_SECRET` from Recommended to Required.

Acceptance:

- Production without `CRON_SECRET` does not run cron work.
- Wrong/missing token returns `401`.
- Correct bearer token or `?secret=` runs the job.

### 2. Make reminder counts public without exposing reminder rows

Problem: reminder social proof uses normal RLS. Buyers can only see their own
reminder rows, so public counts usually show zero.

Fix options:

- Add a security-definer RPC, e.g. `public.drop_reminder_count(target_shop uuid)`.
- Or add a `shop_reminder_counts` view/RPC that only returns aggregate counts.
- Use that helper in `getDropReminderCount()`.
- Do not make `drop_reminders` broadly selectable.

Acceptance:

- Logged-out visitors see the same aggregate reminder count as logged-in buyers.
- Buyers still cannot read another user's `drop_reminders` row.
- Sellers still see counts on their dashboard.
- Add an RLS/integration test for aggregate count plus row privacy.

### 3. Make reminder delivery idempotent under concurrency

Problem: the reminder cron sends first and marks sent afterward. Two concurrent
jobs can send the same reminder before either update lands.

Fix:

- Add `drop_reminder_deliveries`:
  - `id`
  - `reminder_id`
  - `window` (`24h`, `1h`, `opening`)
  - `status` (`processing`, `sent`, `failed`, `skipped_no_provider`)
  - `attempted_at`
  - `sent_at`
  - `error`
  - unique `(reminder_id, window)`
- Claim work by inserting the delivery row first.
- Only the claim winner sends.
- Update status after provider attempts.

Acceptance:

- Concurrent cron invocations send at most one reminder per user/window.
- Failed sends are visible as failed, not silently marked sent.
- Retrying does not duplicate successful sends.

### 4. Do not burn reminders when providers are missing

Problem: email send is a no-op without `RESEND_API_KEY`, but the reminder
window can still be marked sent.

Fix:

- Before claiming/sending, detect available providers:
  - email available: `RESEND_API_KEY` and verified `RESEND_FROM`.
  - push available: VAPID keys and a push subscription.
- If no provider is available for a reminder, record
  `skipped_no_provider` or leave it unsent.
- In free-trial launch mode, consider renaming the CTA from "Remind me" to
  "Join waitlist" unless email delivery is confirmed.

Acceptance:

- Missing Resend config does not mark email reminders as sent.
- UI copy does not promise email reminders when email is unavailable.
- Logs clearly show skipped reminders and why.

### 5. Wire reminder scheduling in a free-trial-friendly way

Problem: Vercel Hobby cannot run every 15 minutes, so opening-time reminders
will not run automatically.

Free-trial recommendation:

- Treat reminder signups as **waitlist/demand capture** until scheduler and
  email are ready.
- Do not promise "we will remind you" unless the delivery path is configured.
- Add seller dashboard copy: "X people joined the waitlist for this drop."
- Let sellers copy the waitlist count and shop link into their own social/email
  posts.

Implementation options:

- Keep `/api/cron/send-drop-reminders` but do not add it to `vercel.json` on
  Hobby.
- Add a manual owner-only "Send opening reminder now" action later, if needed.
- When budget allows, use Vercel Pro cron or Supabase scheduled functions every
  15 minutes.

Acceptance:

- Free-tier production does not imply automatic reminders are active.
- Handoff/deployment docs clearly say reminder cron is not wired.
- Seller dashboard still benefits from waitlist counts.

### 6. Fix post-purchase follow CTA state

Problem: `PostPurchaseCta` always renders `initialFollowing={false}`. If a
buyer already follows the seller, clicking can unfollow them.

Fix:

- Query follow state for sellers represented in recent orders.
- Pass the true `initialFollowing` value.
- Or replace the toggle with a non-destructive link to the seller profile.

Acceptance:

- Already-following buyers do not see a CTA that unfollows on click.
- New buyers can still follow after purchase.

### 7. Enforce draft/publish invariants at the database boundary

Problem: app actions create drafts and require products before publish, but RLS
still lets an authenticated seller insert or update their own shop as
non-draft directly.

Fix:

- Change the `shops.status` default to `draft` in a new migration.
- Add a database trigger/check function:
  - A shop can move from `draft` to non-draft only if at least one product
    exists.
  - Seller-authenticated direct inserts must start as `draft`.
  - Service role/admin flows can be explicitly exempted if needed.
- Add RLS/integration coverage for direct Supabase inserts and updates.

Acceptance:

- Direct authenticated insert with `status='scheduled'` fails.
- Direct authenticated update from `draft` to `scheduled` without products
  fails.
- App-level publish with products still succeeds.

## P1 product improvements after P0

### Seller-led launch kit

- Make share link/caption copy the most prominent dashboard action.
- Add "Launch checklist" copy focused on seller-owned channels:
  - Post to Instagram/TikTok.
  - Add to Discord.
  - Pin the shop link.
  - Schedule a reminder post 1 hour before open.
- Add a downloadable or copyable "drop launch plan."

### Buyer shop page polish

- Scheduled shop pages should feel like a real event page even with no global
  marketplace:
  - countdown,
  - product preview,
  - seller note,
  - waitlist/reminder CTA,
  - share CTA,
  - trust copy for checkout/shipping.

### Operator curation, not public marketplace

- Keep `featured_at` for later, but do not expose broad discovery yet.
- If you need a public proof page, use a curated "Examples" page with hand-picked
  past/sandbox drops, not a live Explore grid.

## When to reintroduce Explore

Re-enable marketplace discovery only after there is enough supply that a buyer
visit feels alive.

Suggested gates:

- At least 10 upcoming public drops scheduled across the next 14 days.
- At least 3 creators with successful prior drops.
- At least 1 drop scheduled in the next 48 hours most days.
- Reminder/waitlist conversion is measurable.
- Email/domain setup is complete.
- Empty states have useful next actions beyond "start a drop."

When reintroduced:

- Default Explore to "Upcoming" instead of "All."
- Keep "Live now" as a filter, not the default.
- Use curation first; do not rely on algorithms while supply is thin.

## Implementation order

1. Add invite-only discovery mode.
2. Hide or redirect Explore.
3. Make homepage seller-led.
4. Fix cron auth fail-closed.
5. Fix reminder aggregate counts.
6. Fix reminder idempotency/provider semantics.
7. Fix post-purchase follow state.
8. Add DB publish invariant.
9. Update tests and docs.

## QA checklist

- Logged-out homepage does not imply active marketplace liquidity.
- Primary nav does not link to Explore in invite-only mode.
- `/explore` cannot show an empty marketplace grid.
- Seller can create, publish, preview, and copy a shop link.
- Logged-out buyer with shop link can view scheduled/open shops.
- Reminder/waitlist count displays consistently for logged-out, logged-in, and
  seller views.
- Cron routes fail closed in production without a valid secret.
- Duplicate cron invocations do not duplicate reminder sends.
- Missing email/push config does not mark reminders as sent.
- Existing checkout, inventory holds, flash drops, and order flows still work.

## Success metric for this phase

Do not measure "marketplace browsing" yet. Measure whether sellers can bring
their own audience to a drop:

- sellers recruited,
- drops scheduled,
- shop links copied/shared,
- waitlist/reminder signups per shop,
- room viewers at open,
- orders,
- sell-through,
- sellers scheduling a second drop.
