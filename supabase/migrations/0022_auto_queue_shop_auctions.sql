-- Auto-queue auction lots when a shop is open so buyers can place pre-bids
-- without the seller manually clicking "Add to queue" for each product.

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

  -- Published shop within the open purchase window.
  if v_shop.status = 'draft' then
    return 0;
  end if;
  if now() < v_shop.start_at or now() >= v_shop.end_at then
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

grant execute on function public.auto_queue_shop_auctions(uuid) to anon, authenticated, service_role;
