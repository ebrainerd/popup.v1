-- ===========================================================================
-- Security hardening (pre-marketing audit)
--
-- 1. reserve_product: bind reservations to the caller and cap the TTL so an
--    authenticated user can't hold inventory under someone else's ID or with
--    an arbitrarily long hold (checkout griefing).
-- 2. orders: remove the direct buyer INSERT path (orders are created only by
--    the Stripe webhook via service_role) and narrow UPDATE to the columns
--    and status transitions the app actually uses.
-- 3. decrement_stock: only the service role (webhook) may execute it.
-- ===========================================================================

-- 1. reserve_product ---------------------------------------------------------
create or replace function public.reserve_product(
  p_product uuid,
  p_buyer uuid,
  p_session text,
  p_ttl_minutes integer
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_qty int;
  v_held int;
  v_res uuid;
  v_ttl int;
begin
  -- Reservations may only be created by the buyer they belong to.
  if auth.uid() is null or p_buyer is distinct from auth.uid() then
    raise exception 'reservation buyer mismatch';
  end if;

  -- Cap the hold window (checkout sessions expire after 30 minutes).
  v_ttl := least(greatest(coalesce(p_ttl_minutes, 1), 1), 30);

  -- Reuse an existing active hold by the same buyer (avoids self-exhaustion).
  select id into v_res
  from public.product_reservations
  where product_id = p_product and buyer_id = p_buyer
    and status = 'held' and expires_at > now()
  limit 1;
  if v_res is not null then
    return v_res;
  end if;

  -- Lock the product row to serialize concurrent checkouts.
  select quantity into v_qty from public.products where id = p_product for update;
  if v_qty is null then
    return null;
  end if;

  select count(*) into v_held
  from public.product_reservations
  where product_id = p_product and status = 'held' and expires_at > now();

  if v_qty - v_held <= 0 then
    return null; -- sold out / fully reserved right now
  end if;

  insert into public.product_reservations (product_id, buyer_id, session_id, status, expires_at)
  values (p_product, p_buyer, p_session, 'held', now() + make_interval(mins => v_ttl))
  returning id into v_res;
  return v_res;
end; $$;

-- 2. orders ------------------------------------------------------------------
-- Orders are only created by the Stripe webhook (service_role bypasses RLS).
drop policy if exists "Buyers create own orders" on public.orders;

-- Replace the broad shared UPDATE policy with purpose-scoped ones.
drop policy if exists "Sellers update orders" on public.orders;

-- Sellers mark orders shipped (and may re-save tracking on shipped/received).
create policy "Sellers update fulfillment"
  on public.orders for update
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id) and status in ('shipped', 'received'));

-- Buyers can only confirm receipt of their own orders.
create policy "Buyers confirm receipt"
  on public.orders for update
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid() and status = 'received');

-- Column-level defense: authenticated clients may only touch fulfillment /
-- receipt columns. Money, identity, and payment-reference columns stay
-- writable only by service_role.
revoke update on table public.orders from authenticated;
grant update (status, tracking_number, carrier, shipped_at, received_at, delivered_at)
  on table public.orders to authenticated;

-- 3. decrement_stock ---------------------------------------------------------
revoke all on function public.decrement_stock(uuid, integer) from public;
revoke all on function public.decrement_stock(uuid, integer) from anon;
revoke all on function public.decrement_stock(uuid, integer) from authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
