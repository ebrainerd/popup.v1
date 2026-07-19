-- ===========================================================================
-- One active auction run per product: dedupe existing rows, enforce uniqueness,
-- serialize concurrent queueing, and return authoritative ends_at from start.
-- ===========================================================================

-- Cancel duplicate active runs, keeping the best per product.
with ranked as (
  select
    id,
    row_number() over (
      partition by product_id
      order by
        case status
          when 'live' then 0
          when 'awaiting_payment' then 1
          when 'queued' then 2
          else 3
        end,
        bid_count desc,
        current_bid desc,
        created_at asc
    ) as rn
  from public.auction_runs
  where status in ('queued', 'live', 'awaiting_payment')
)
update public.auction_runs ar
set status = 'canceled', updated_at = now()
from ranked r
where ar.id = r.id
  and r.rn > 1;

create unique index if not exists auction_runs_one_active_per_product
  on public.auction_runs (product_id)
  where status in ('queued', 'live', 'awaiting_payment');

-- Auto-queue auction lots (serialize per shop) --------------------------------
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
  perform pg_advisory_xact_lock(hashtext('auto_queue_shop:' || p_shop_id::text));

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

-- Queue a single auction lot (serialize per product) --------------------------
create or replace function public.queue_auction_run(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_run_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('queue_auction:' || p_product_id::text));

  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'product not found'; end if;
  if not public.owns_shop(v_product.shop_id) then raise exception 'not shop owner'; end if;
  if v_product.sale_type <> 'auction' then raise exception 'not an auction product'; end if;

  if exists (
    select 1 from public.auction_runs
    where product_id = p_product_id
      and status in ('queued', 'live', 'awaiting_payment')
  ) then
    raise exception 'auction already queued or active';
  end if;

  insert into public.auction_runs (
    shop_id, product_id, seller_id, status,
    starting_bid, min_increment, current_bid,
    soft_close_seconds, sudden_death
  ) values (
    v_product.shop_id, v_product.id, auth.uid(), 'queued',
    v_product.auction_starting_bid, v_product.auction_min_increment,
    v_product.auction_starting_bid,
    10, v_product.auction_sudden_death
  ) returning id into v_run_id;

  return v_run_id;
end;
$$;

-- Start a queued auction (return authoritative ends_at) -----------------------
create or replace function public.start_auction_run(p_auction_id uuid)
returns timestamptz
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

  return v_ends_at;
end;
$$;
