-- ===========================================================================
-- Auction products may run until shop close (shop.end_at) instead of a fixed
-- countdown (auction_duration_seconds).
-- ===========================================================================

alter table public.products
  add column if not exists auction_ends_with_shop boolean not null default false;

alter table public.products
  drop constraint if exists products_auction_fields_check;

alter table public.products
  add constraint products_auction_fields_check check (
    sale_type = 'buy_now'
    or (
      auction_starting_bid is not null
      and auction_starting_bid >= 50
      and auction_min_increment is not null
      and auction_min_increment >= 50
      and quantity = 1
      and (
        (
          auction_ends_with_shop = true
          and auction_duration_seconds is null
        )
        or (
          auction_ends_with_shop = false
          and auction_duration_seconds is not null
          and auction_duration_seconds > 0
        )
      )
    )
  );

-- Start a queued auction ----------------------------------------------------
create or replace function public.start_auction_run(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
  v_product public.products%rowtype;
  v_shop_end_at timestamptz;
  v_shop_schedule_set boolean;
  v_now timestamptz := now();
  v_ends_at timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;
  if v_run.seller_id <> auth.uid() then raise exception 'not shop owner'; end if;
  if v_run.status <> 'queued' then raise exception 'auction not queued'; end if;

  select * into v_product from public.products where id = v_run.product_id;
  if v_product.sale_type <> 'auction' then raise exception 'not an auction product'; end if;

  select end_at, schedule_set
    into v_shop_end_at, v_shop_schedule_set
  from public.shops
  where id = v_run.shop_id;

  if not found then raise exception 'shop not found'; end if;

  if v_product.auction_ends_with_shop then
    if coalesce(v_shop_schedule_set, false) is not true then
      raise exception 'set shop schedule before starting a shop-length auction';
    end if;
    if v_shop_end_at is null or v_shop_end_at <= v_now then
      raise exception 'shop has already ended';
    end if;
    v_ends_at := v_shop_end_at;
  else
    if v_product.auction_duration_seconds is null or v_product.auction_duration_seconds < 1 then
      raise exception 'auction duration required';
    end if;
    v_ends_at := v_now + make_interval(secs => v_product.auction_duration_seconds);
  end if;

  update public.auction_runs
  set status = 'live',
      starts_at = v_now,
      ends_at = v_ends_at,
      updated_at = v_now
  where id = p_auction_id;
end;
$$;

-- Sold auction lots: also clear auction_ends_with_shop (see 0029) ------------
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
    update public.products
    set
      sale_type = 'buy_now',
      auction_starting_bid = null,
      auction_min_increment = null,
      auction_duration_seconds = null,
      auction_ends_with_shop = false,
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
