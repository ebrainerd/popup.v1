-- ===========================================================================
-- PopUp — Milestone 3: payments, fulfillment & payouts
-- ===========================================================================

-- Seller payout/onboarding state on the profile.
alter table public.profiles
  add column if not exists stripe_onboarded boolean not null default false;

-- Payment + payout bookkeeping on orders.
alter table public.orders
  add column if not exists stripe_session_id text,
  add column if not exists payment_intent text,
  add column if not exists shipping_amount integer not null default 0,
  add column if not exists transfer_id text,
  add column if not exists released_at timestamptz,
  add column if not exists received_at timestamptz;

-- Idempotency for the Stripe webhook (one order per checkout session).
create unique index if not exists orders_stripe_session_idx
  on public.orders(stripe_session_id)
  where stripe_session_id is not null;

-- ---------------------------------------------------------------------------
-- decrement_stock — atomically reduce a product's quantity (never below 0).
-- Used by the webhook (service role) when an order is paid.
-- ---------------------------------------------------------------------------
create or replace function public.decrement_stock(p_product uuid, p_qty integer)
returns void language sql security definer set search_path = public as $$
  update public.products
  set quantity = greatest(0, quantity - p_qty)
  where id = p_product;
$$;
