-- True pre-open pre-bids + enforceable winner checkout deadline.
--
-- 1. auto_queue_shop_auctions now queues pre-bid lots as soon as a shop is
--    published (scheduled included), instead of only inside the open window,
--    so buyers can place pre-bids before the drop opens. place_auction_bid
--    already accepts pre-bids on any queued run.
-- 2. expire_due_auction_payment lets any signed-in (or anonymous) viewer flip
--    an awaiting_payment run to payment_expired once checkout_expires_at has
--    passed, mirroring the client-driven finalize_auction_run pattern. The
--    deadline check makes it safe to expose beyond service_role.

create or replace function public.auto_queue_shop_auctions(p_shop_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops%rowtype;
  v_product public.products%rowtype;
  v_count int := 0;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found then
    return 0;
  end if;

  -- Published shop that has not ended yet (scheduled shops included, so
  -- pre-bids can start before the doors open).
  if v_shop.status = 'draft' then
    return 0;
  end if;
  if now() >= v_shop.end_at then
    return 0;
  end if;

  for v_product in
    select p.*
    from public.products p
    where p.shop_id = p_shop_id
      and p.sale_type = 'auction'
      and p.auction_allow_prebids = true
      and p.quantity > 0
      and not exists (
        select 1
        from public.auction_runs ar
        where ar.product_id = p.id
          and ar.status in ('queued', 'live', 'awaiting_payment')
      )
  loop
    insert into public.auction_runs (
      shop_id,
      product_id,
      seller_id,
      status,
      starting_bid,
      min_increment,
      current_bid,
      soft_close_seconds,
      sudden_death
    ) values (
      v_product.shop_id,
      v_product.id,
      v_shop.seller_id,
      'queued',
      v_product.auction_starting_bid,
      v_product.auction_min_increment,
      v_product.auction_starting_bid,
      10,
      v_product.auction_sudden_death
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Expire an unpaid auction win once its checkout deadline has passed.
-- Returns true when the run was flipped to payment_expired.
create or replace function public.expire_due_auction_payment(p_auction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.auction_runs
  set status = 'payment_expired', updated_at = now()
  where id = p_auction_id
    and status = 'awaiting_payment'
    and checkout_expires_at is not null
    and checkout_expires_at <= now();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.expire_due_auction_payment(uuid) to anon, authenticated, service_role;
