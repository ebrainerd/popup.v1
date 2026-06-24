-- ===========================================================================
-- PopUp — Live auctions (v1)
-- ===========================================================================

-- Product sale mode ---------------------------------------------------------
alter table public.products
  add column if not exists sale_type text not null default 'buy_now'
    check (sale_type in ('buy_now', 'auction')),
  add column if not exists auction_starting_bid integer,
  add column if not exists auction_min_increment integer,
  add column if not exists auction_duration_seconds integer,
  add column if not exists auction_allow_prebids boolean not null default true,
  add column if not exists auction_sudden_death boolean not null default false;

alter table public.products
  add constraint products_auction_fields_check check (
    sale_type = 'buy_now'
    or (
      auction_starting_bid is not null
      and auction_starting_bid >= 50
      and auction_min_increment is not null
      and auction_min_increment >= 50
      and auction_duration_seconds is not null
      and auction_duration_seconds > 0
      and quantity = 1
    )
  );

-- Auction runs --------------------------------------------------------------
create table if not exists public.auction_runs (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid not null references public.shops(id) on delete cascade,
  product_id          uuid not null references public.products(id) on delete cascade,
  seller_id           uuid not null references public.profiles(id) on delete cascade,
  status              text not null check (status in (
    'queued', 'live', 'ended', 'awaiting_payment', 'paid',
    'payment_expired', 'canceled', 'unsold'
  )),
  starting_bid        integer not null,
  min_increment       integer not null,
  current_bid         integer not null,
  current_winner_id   uuid references public.profiles(id) on delete set null,
  winning_bid_id      uuid,
  bid_count           integer not null default 0,
  starts_at           timestamptz,
  ends_at             timestamptz,
  soft_close_seconds  integer not null default 10,
  sudden_death        boolean not null default false,
  checkout_expires_at timestamptz,
  stripe_session_id   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists auction_runs_shop_idx on public.auction_runs(shop_id);
create index if not exists auction_runs_product_idx on public.auction_runs(product_id);
create index if not exists auction_runs_status_idx on public.auction_runs(status);

-- Private max bids ----------------------------------------------------------
create table if not exists public.auction_max_bids (
  id         uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_runs(id) on delete cascade,
  bidder_id  uuid not null references public.profiles(id) on delete cascade,
  max_amount integer not null check (max_amount >= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auction_id, bidder_id)
);

create index if not exists auction_max_bids_auction_idx on public.auction_max_bids(auction_id);

-- Public bid events ---------------------------------------------------------
create table if not exists public.auction_bid_events (
  id             uuid primary key default gen_random_uuid(),
  auction_id     uuid not null references public.auction_runs(id) on delete cascade,
  bidder_id      uuid references public.profiles(id) on delete set null,
  visible_amount integer not null,
  event_type     text not null check (event_type in (
    'prebid', 'bid', 'proxy_bid', 'outbid', 'win', 'extend'
  )),
  created_at     timestamptz not null default now()
);

create index if not exists auction_bid_events_auction_idx on public.auction_bid_events(auction_id);

-- Orders link ---------------------------------------------------------------
alter table public.orders
  add column if not exists auction_id uuid references public.auction_runs(id) on delete set null,
  add column if not exists winning_bid_id uuid;

-- RLS -----------------------------------------------------------------------
alter table public.auction_runs enable row level security;
alter table public.auction_max_bids enable row level security;
alter table public.auction_bid_events enable row level security;

drop policy if exists "Auction runs readable with shop" on public.auction_runs;
create policy "Auction runs readable with shop"
  on public.auction_runs for select
  using (public.can_read_shop(shop_id));

drop policy if exists "Sellers manage own auction runs" on public.auction_runs;
create policy "Sellers manage own auction runs"
  on public.auction_runs for all
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "Bidder reads own max bid" on public.auction_max_bids;
create policy "Bidder reads own max bid"
  on public.auction_max_bids for select
  using (bidder_id = auth.uid());

drop policy if exists "Bid events readable with shop" on public.auction_bid_events;
create policy "Bid events readable with shop"
  on public.auction_bid_events for select
  using (
    exists (
      select 1 from public.auction_runs ar
      where ar.id = auction_id and public.can_read_shop(ar.shop_id)
    )
  );

-- Helpers -------------------------------------------------------------------
create or replace function public.compute_auction_visible_bid(
  p_starting_bid int,
  p_min_increment int,
  p_winner_max int,
  p_runner_up_max int
) returns int
language sql immutable as $$
  select case
    when p_runner_up_max is null then p_starting_bid
    when p_runner_up_max = p_winner_max then p_starting_bid
    else least(p_winner_max, p_runner_up_max + p_min_increment)
  end;
$$;

create or replace function public.auction_next_minimum_bid(
  p_starting_bid int,
  p_min_increment int,
  p_current_bid int,
  p_bid_count int
) returns int
language sql immutable as $$
  select case
    when p_bid_count = 0 then p_starting_bid
    else p_current_bid + p_min_increment
  end;
$$;

-- Queue an auction lot --------------------------------------------------------
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
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;
  if v_run.seller_id <> auth.uid() then raise exception 'not shop owner'; end if;
  if v_run.status <> 'queued' then raise exception 'auction not queued'; end if;

  select * into v_product from public.products where id = v_run.product_id;
  if v_product.sale_type <> 'auction' then raise exception 'not an auction product'; end if;

  update public.auction_runs
  set status = 'live',
      starts_at = v_now,
      ends_at = v_now + make_interval(secs => v_product.auction_duration_seconds),
      updated_at = v_now
  where id = p_auction_id;
end;
$$;

-- Place max bid (proxy bidding) ---------------------------------------------
create or replace function public.place_auction_bid(
  p_auction_id uuid,
  p_max_amount integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
  v_product public.products%rowtype;
  v_bidder uuid := auth.uid();
  v_prev_max int;
  v_next_min int;
  v_winner_id uuid;
  v_winner_max int;
  v_runner_max int;
  v_visible int;
  v_prev_winner uuid;
  v_extended boolean := false;
  v_event_type text;
  v_viewer_state text;
begin
  if v_bidder is null then raise exception 'authentication required'; end if;
  if p_max_amount < 50 then raise exception 'bid too low'; end if;

  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;

  select * into v_product from public.products where id = v_run.product_id;
  if v_product.sale_type <> 'auction' then raise exception 'not an auction product'; end if;
  if v_run.seller_id = v_bidder then raise exception 'seller cannot bid'; end if;

  if v_run.status = 'queued' then
    if not v_product.auction_allow_prebids then
      raise exception 'pre-bids not enabled';
    end if;
  elsif v_run.status <> 'live' then
    raise exception 'auction not accepting bids';
  end if;

  v_next_min := public.auction_next_minimum_bid(
    v_run.starting_bid, v_run.min_increment, v_run.current_bid, v_run.bid_count
  );
  if p_max_amount < v_next_min then
    raise exception 'bid below minimum of % cents', v_next_min;
  end if;

  select max_amount into v_prev_max
  from public.auction_max_bids
  where auction_id = p_auction_id and bidder_id = v_bidder;

  if v_prev_max is not null and p_max_amount <= v_prev_max then
    raise exception 'must raise your max bid';
  end if;

  v_prev_winner := v_run.current_winner_id;

  insert into public.auction_max_bids (auction_id, bidder_id, max_amount)
  values (p_auction_id, v_bidder, p_max_amount)
  on conflict (auction_id, bidder_id) do update
    set max_amount = excluded.max_amount, updated_at = now();

  select bidder_id, max_amount into v_winner_id, v_winner_max
  from public.auction_max_bids
  where auction_id = p_auction_id
  order by max_amount desc, created_at asc
  limit 1;

  select max_amount into v_runner_max
  from public.auction_max_bids
  where auction_id = p_auction_id and bidder_id <> v_winner_id
  order by max_amount desc, created_at asc
  limit 1;

  v_visible := public.compute_auction_visible_bid(
    v_run.starting_bid, v_run.min_increment, v_winner_max, v_runner_max
  );

  if v_run.status = 'live'
     and not v_run.sudden_death
     and v_run.ends_at is not null
     and v_run.ends_at - now() < make_interval(secs => v_run.soft_close_seconds)
  then
    v_run.ends_at := now() + make_interval(secs => v_run.soft_close_seconds);
    v_extended := true;
  end if;

  v_event_type := case when v_run.status = 'queued' then 'prebid' else 'bid' end;

  insert into public.auction_bid_events (auction_id, bidder_id, visible_amount, event_type)
  values (p_auction_id, v_bidder, v_visible, v_event_type);

  if v_extended then
    insert into public.auction_bid_events (auction_id, bidder_id, visible_amount, event_type)
    values (p_auction_id, null, v_visible, 'extend');
  end if;

  update public.auction_runs
  set current_bid = v_visible,
      current_winner_id = v_winner_id,
      bid_count = bid_count + 1,
      ends_at = v_run.ends_at,
      updated_at = now()
  where id = p_auction_id;

  if v_bidder = v_winner_id then
    v_viewer_state := 'winning';
  else
    v_viewer_state := 'outbid';
  end if;

  return jsonb_build_object(
    'auction_id', p_auction_id,
    'current_bid', v_visible,
    'current_winner_id', v_winner_id,
    'bid_count', v_run.bid_count + 1,
    'ends_at', v_run.ends_at,
    'extended', v_extended,
    'viewer_state', v_viewer_state,
    'next_minimum_bid', public.auction_next_minimum_bid(
      v_run.starting_bid, v_run.min_increment, v_visible, v_run.bid_count + 1
    ),
    'your_max_bid', p_max_amount
  );
end;
$$;

-- Finalize when timer elapses ------------------------------------------------
create or replace function public.finalize_auction_run(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
  v_now timestamptz := now();
begin
  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;
  if v_run.status <> 'live' then raise exception 'auction not live'; end if;
  if v_run.ends_at is null or v_run.ends_at > v_now then
    raise exception 'auction still running';
  end if;

  if v_run.current_winner_id is null or v_run.bid_count = 0 then
    update public.auction_runs
    set status = 'unsold', updated_at = v_now
    where id = p_auction_id;

    return jsonb_build_object('status', 'unsold');
  end if;

  update public.auction_runs
  set status = 'awaiting_payment',
      checkout_expires_at = v_now + interval '30 minutes',
      updated_at = v_now
  where id = p_auction_id;

  insert into public.auction_bid_events (auction_id, bidder_id, visible_amount, event_type)
  values (p_auction_id, v_run.current_winner_id, v_run.current_bid, 'win');

  return jsonb_build_object(
    'status', 'awaiting_payment',
    'winner_id', v_run.current_winner_id,
    'winning_bid', v_run.current_bid,
    'checkout_expires_at', v_now + interval '30 minutes'
  );
end;
$$;

-- Cancel queued / live without bids -----------------------------------------
create or replace function public.cancel_auction_run(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;
  if v_run.seller_id <> auth.uid() then raise exception 'not shop owner'; end if;
  if v_run.bid_count > 0 then raise exception 'cannot cancel after bids'; end if;
  if v_run.status not in ('queued', 'live') then raise exception 'cannot cancel'; end if;

  update public.auction_runs
  set status = 'canceled', updated_at = now()
  where id = p_auction_id;
end;
$$;

-- Mark auction paid (webhook) -----------------------------------------------
create or replace function public.settle_auction_payment(
  p_auction_id uuid,
  p_order_id uuid,
  p_stripe_session_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.auction_runs
  set status = 'paid',
      stripe_session_id = p_stripe_session_id,
      updated_at = now()
  where id = p_auction_id and status = 'awaiting_payment';
end;
$$;

create or replace function public.expire_auction_payment(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.auction_runs
  set status = 'payment_expired', updated_at = now()
  where id = p_auction_id and status = 'awaiting_payment';
end;
$$;

-- Grants --------------------------------------------------------------------
grant execute on function public.queue_auction_run(uuid) to authenticated;
grant execute on function public.start_auction_run(uuid) to authenticated;
grant execute on function public.place_auction_bid(uuid, integer) to authenticated;
grant execute on function public.finalize_auction_run(uuid) to authenticated;
grant execute on function public.cancel_auction_run(uuid) to authenticated;
grant execute on function public.compute_auction_visible_bid(int, int, int, int) to anon, authenticated, service_role;
grant execute on function public.auction_next_minimum_bid(int, int, int, int) to anon, authenticated, service_role;

grant execute on function public.settle_auction_payment(uuid, uuid, text) to service_role;
grant execute on function public.expire_auction_payment(uuid) to service_role;
