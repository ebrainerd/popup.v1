# PopUp — Launch Marketing Kit

A ready-to-run campaign for the invite-only launch. Assets live in
`marketing/assets/`; the share-preview image is wired into the site at
`public/og.jpg` (every link you share shows the branded card automatically).

## Positioning

**One line:** Your own pop-up shop: products, countdown, live video, and
checkout — all in one link.

**Who it's for (in order):**
1. **Founding sellers** — small creators and makers who already sell in DMs,
   comments, or clunky link-in-bio stores: vintage resellers, sticker/print
   artists, candle and ceramics makers, card/collectible streamers.
2. Their audiences (buyers follow the sellers in; don't market to buyers
   directly during invite-only).

**Why it wins (talking points, plain language):**
- A drop, not a store: the shop opens and closes on a clock, so there's a
  reason to show up now.
- Go live right on the shop page (or embed Twitch/YouTube) — chat, flash
  deals, and auctions happen where the checkout is.
- One link to share anywhere; buyers wait in a countdown room and get
  reminded when doors open.
- Set up in one evening; get paid through Stripe.

**Voice:** hype but warm. Short sentences. "Drop", "doors open", "sold out".
Never "leverage", "revolutionize", or "seamless".

## The campaign: "Founding Sellers" (4 phases)

Run the phases in order; move to the next when the current one is done, not on
a calendar.

### Phase 1 — Seed list
Goal: 20-30 named sellers you can reach personally.
- List creators you know + small sellers you follow (Instagram, TikTok,
  Twitch, Etsy, Depop, Whatnot refugees).
- Prioritize people with 500-10k engaged followers who already sell drops
  informally. Small and engaged beats big and cold.

### Phase 2 — Direct outreach (the whole game during invite-only)
Goal: 5-10 committed founding sellers, each with a scheduled first drop.
- Send the DM templates below, personally, one at a time. No blasts.
- Offer the founding-seller deal: white-glove setup help (you on a call while
  they build their shop), plus a "Founding Seller" shout-out when the badge
  ships later.
- Book each seller's drop date on a shared calendar; space them out so you
  can be present in every first drop's chat.

### Phase 3 — First drops as content
Goal: turn every drop into proof.
- Before: seller posts the story graphic + their link ("doors open Friday 7pm").
- During: you and the seller screen-record the countdown flip, the chat, a
  flash deal or auction moment.
- After: post the receipts — "sold out in 40 minutes", screenshots of the
  drop report. Ask the seller for one quote.

### Phase 4 — Waitlist flywheel
Goal: let proof recruit the next cohort.
- Pin the recap posts. Every recap ends with "Want to run your own drop? DM
  me 'DROP'."
- Repeat phases 2-3 with the next cohort. When supply feels steady, flip
  `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` and announce Explore.

## Copy library (paste-ready)

### Bio lines
- Your own pop-up shop, in one link. Doors open on a clock. 🛍️⚡
- Drop it. Sell it. Sold out. — popupdrop.co

### Seller outreach DM (personal, first touch)
> Hey [name] — I've watched you sell [their thing] through [DMs/comments/their
> current setup] and I built something for exactly that. PopUp gives you a
> pop-up shop in one link: countdown, live video, chat, and checkout in one
> place. Doors open and close on a clock, so your drop feels like an event.
>
> I'm hand-picking a few founding sellers before opening it up. I'll
> personally help you set up your first drop (takes an evening). Want the
> link?

### Follow-up (3-4 days later, once)
> No pressure at all — but I'd love to see a [their product] drop as one of
> the first on PopUp. If you've got 15 minutes this week I'll walk you
> through it live. First drop could be this weekend.

### Launch announcement (your channels)
> I built a thing. 🚀
>
> PopUp is a pop-up shop that lives in one link. You add your products, pick
> when doors open, and share the link. Buyers wait in a countdown room, shop
> live with chat, and check out with Stripe. Flash deals and live auctions
> built in.
>
> We're invite-only while founding sellers run their first drops. Want in?
> DM me "DROP".

### Seller pre-drop post (give this to sellers)
> Doors open [Friday 7pm]. 🚪⚡
> My first PopUp drop: [what's dropping, e.g. "12 one-of-one prints"].
> One link, limited window, gone when it's gone: [shop link]
> Tap "Remind me" so you don't miss the open.

### Drop recap post
> [Shop name] opened at 7:00 and sold out by [7:42]. 🧨
> [N] pieces, [N] bidders in the auction, [N] people in chat.
> Next drop: [date]. Want to run your own? DM me "DROP".

### Buyer reminder nudge (story text over the countdown screenshot)
> Doors in 1 hour. Set your reminder or lose the [product]. ⏰

## Assets

| File | Use |
|------|-----|
| `marketing/assets/app_experience_wide.webp` | Hero product shot: real shop UI (live seller, chat, sold-out grid) with 3D pop effects — landing pages, X/LinkedIn posts, decks |
| `marketing/assets/app_experience_square.webp` | Square version of the product shot for IG feed |
| `marketing/assets/app_screenshot_clean.webp` | Clean (no effects) staged shop screenshot for press/docs |
| `marketing/assets/ig_launch_post.webp` | Square Ember Market launch/announcement post |
| `marketing/assets/story_founding_seller.webp` | 1080x1920 story for founding-seller recruitment |
| `marketing/assets/og_banner.webp` | Wide banner (X header, YouTube, deck cover) |
| `public/og.jpg` | Automatic link-preview card on every shared URL (uses the app-experience shot; bump the `?v=` in `layout.tsx` when replacing) |

The product shots were made by staging a real shop locally (seeded products,
sold-out items, live chat, streaming cover), screenshotting the actual UI, and
running a stylization pass that adds the LIVE badge, hearts/chat bubbles, and
confetti while keeping the interface legible.

**Brand (Ember Market):** ember orange accents, charcoal base (`#14100C`), warm
paper light mode (`#FAF8F4`). Seller shop accents stay in the warm family (ember,
amber, terracotta, gilt). Type: Syne ExtraBold logo lockup, Geist UI, Geist Mono
timers. Tagline: *Shops that live for the moment.* See `docs/HANDOFF.md` § Brand
identity and the [PopUp Design System](https://www.figma.com/design/AObYmWZZML1UhGVHetDoVw).

Older claymation assets in `marketing/assets/` may still show legacy coral/teal;
prefer new shots that match Ember Market when you create replacements.

## Measuring (keep it simple)

- Outreach: DMs sent → replies → shops created (track in a spreadsheet).
- Per drop: reminder count before open (manage page), peak viewers, sell-through
  %, gross (drop report), buyer signups.
- Weekly: founding sellers signed, drops completed, repeat-drop rate. A seller
  who books a second drop is the single best signal.

## Launch-week checklist

- [ ] `RELEASE_DELAY_HOURS` back to `72` in Vercel
- [ ] Share a link in a private chat and confirm the branded preview card shows
- [ ] Seed list built (Phase 1) and first 10 DMs sent (Phase 2)
- [ ] First two founding-seller drops on the calendar
- [ ] Support inbox checked daily (`/support` tickets email support@popupdrop.co)
