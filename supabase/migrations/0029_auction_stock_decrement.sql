-- ===========================================================================
-- Fix: auction checkout stock decrement vs products_auction_fields_check
-- ===========================================================================
-- Auction products must keep quantity = 1 while sale_type = 'auction' (check
-- constraint from 0013). The Stripe webhook calls decrement_stock after payment,
-- which would set quantity to 0 and violate that check — leaving a captured
-- payment with no stock update (and a 500 on webhook retry).
--
-- After a successful auction sale, clear auction-only fields and flip sale_type
-- to buy_now so quantity can go to 0 like any other sold-out product.
-- ===========================================================================

create or replace function public.decrement_stock(p_product uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_type text;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'decrement_stock: p_qty must be > 0';
  end if;

  select sale_type into v_sale_type
  from public.products
  where id = p_product
  for update;

  if not found then
    raise exception 'decrement_stock: product % not found', p_product;
  end if;

  if v_sale_type = 'auction' then
    -- Sold auction lot: drop auction constraints so quantity may reach 0.
    update public.products
    set
      sale_type = 'buy_now',
      auction_starting_bid = null,
      auction_min_increment = null,
      auction_duration_seconds = null,
      quantity = greatest(0, quantity - p_qty)
    where id = p_product;
  else
    update public.products
    set quantity = greatest(0, quantity - p_qty)
    where id = p_product;
  end if;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public;
revoke all on function public.decrement_stock(uuid, integer) from anon;
revoke all on function public.decrement_stock(uuid, integer) from authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
