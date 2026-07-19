-- ===========================================================================
-- Auction / shop-end integrity: clamp run ends_at to shop close, reconcile
-- leaders from max_bids, finalize when shop closes, repair mis-marked unsold.
-- ===========================================================================

-- Clamp start_auction_run ends_at to shop close when applicable ----------------
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

  if v_shop_end_at is not null and v_shop_end_at > v_now then
    v_ends_at := least(v_ends_at, v_shop_end_at);
  end if;
  if v_ends_at <= v_now then
    raise exception 'auction end time is not in the future';
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

-- Recompute leader / visible bid from auction_max_bids -----------------------
create or replace function public.reconcile_auction_run_leader(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
  v_winner_id uuid;
  v_winner_max int;
  v_runner_max int;
  v_visible int;
  v_bid_count int;
begin
  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;

  select count(*) into v_bid_count
  from public.auction_max_bids
  where auction_id = p_auction_id;

  if v_bid_count = 0 then
    return;
  end if;

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

  update public.auction_runs
  set current_winner_id = v_winner_id,
      current_bid = v_visible,
      bid_count = v_bid_count,
      updated_at = now()
  where id = p_auction_id;
end;
$$;

-- Finalize a live run (timer elapsed or shop closed) -------------------------
create or replace function public.finalize_auction_run(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.auction_runs%rowtype;
  v_shop_end_at timestamptz;
  v_now timestamptz := now();
  v_has_max_bids boolean;
begin
  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;
  if v_run.status <> 'live' then raise exception 'auction not live'; end if;

  select end_at into v_shop_end_at
  from public.shops
  where id = v_run.shop_id;

  if (v_run.ends_at is null or v_run.ends_at > v_now)
     and (v_shop_end_at is null or v_shop_end_at > v_now) then
    raise exception 'auction still running';
  end if;

  if v_shop_end_at is not null and v_shop_end_at <= v_now
     and (v_run.ends_at is null or v_run.ends_at > v_now) then
    update public.auction_runs
    set ends_at = least(coalesce(v_run.ends_at, v_shop_end_at), v_shop_end_at, v_now),
        updated_at = v_now
    where id = p_auction_id
    returning * into v_run;
  end if;

  -- If this live row has no max bids but a canceled sibling for the same
  -- product does (duplicate-run bug), adopt those bids before deciding.
  if not exists (select 1 from public.auction_max_bids where auction_id = p_auction_id) then
    update public.auction_max_bids amb
    set auction_id = p_auction_id,
        updated_at = v_now
    where amb.auction_id in (
      select sibling.id
      from public.auction_runs sibling
      where sibling.product_id = v_run.product_id
        and sibling.status = 'canceled'
        and sibling.id <> p_auction_id
        and exists (
          select 1 from public.auction_max_bids m where m.auction_id = sibling.id
        )
    )
    and not exists (
      select 1
      from public.auction_max_bids other
      where other.auction_id = p_auction_id
        and other.bidder_id = amb.bidder_id
    );
  end if;

  perform public.reconcile_auction_run_leader(p_auction_id);

  select * into v_run from public.auction_runs where id = p_auction_id;

  select exists (
    select 1 from public.auction_max_bids where auction_id = p_auction_id
  ) into v_has_max_bids;

  if v_has_max_bids and v_run.current_winner_id is null then
    raise exception 'auction has bids but no winner after reconcile';
  end if;

  if not v_has_max_bids and (v_run.current_winner_id is null or v_run.bid_count = 0) then
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

-- Finalize all due live auctions for a shop ----------------------------------
create or replace function public.finalize_due_shop_auctions(p_shop_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_end_at timestamptz;
  v_now timestamptz := now();
  v_run record;
  v_count int := 0;
begin
  select end_at into v_shop_end_at from public.shops where id = p_shop_id;
  if not found then
    return 0;
  end if;

  if v_shop_end_at is not null and v_shop_end_at <= v_now then
    update public.auction_runs
    set ends_at = least(coalesce(ends_at, v_shop_end_at), v_shop_end_at),
        updated_at = v_now
    where shop_id = p_shop_id
      and status = 'live'
      and ends_at is not null
      and ends_at > v_now;
  end if;

  for v_run in
    select ar.id
    from public.auction_runs ar
    where ar.shop_id = p_shop_id
      and ar.status = 'live'
      and (
        (ar.ends_at is not null and ar.ends_at <= v_now)
        or (v_shop_end_at is not null and v_shop_end_at <= v_now)
      )
  loop
    begin
      perform public.finalize_auction_run(v_run.id);
      v_count := v_count + 1;
    exception
      when others then
        null;
    end;
  end loop;

  return v_count;
end;
$$;

-- Repair: pull bids off canceled duplicate runs onto the product's unsold /
-- awaiting/live canonical run (the duplicate-run bug left high bids stranded).
do $$
declare
  v_target record;
  v_source uuid;
begin
  for v_target in
    select ar.id as target_id, ar.product_id
    from public.auction_runs ar
    where ar.status in ('unsold', 'live', 'awaiting_payment')
      and exists (
        select 1
        from public.auction_runs sibling
        join public.auction_max_bids amb on amb.auction_id = sibling.id
        where sibling.product_id = ar.product_id
          and sibling.status = 'canceled'
          and sibling.id <> ar.id
      )
      and not exists (
        select 1 from public.auction_max_bids m where m.auction_id = ar.id
      )
  loop
    select sibling.id into v_source
    from public.auction_runs sibling
    join public.auction_max_bids amb on amb.auction_id = sibling.id
    where sibling.product_id = v_target.product_id
      and sibling.status = 'canceled'
      and sibling.id <> v_target.target_id
    group by sibling.id
    order by count(*) desc, max(amb.max_amount) desc
    limit 1;

    if v_source is null then
      continue;
    end if;

    -- Move max bids (skip bidder conflicts if any already exist on target).
    update public.auction_max_bids amb
    set auction_id = v_target.target_id,
        updated_at = now()
    where amb.auction_id = v_source
      and not exists (
        select 1
        from public.auction_max_bids other
        where other.auction_id = v_target.target_id
          and other.bidder_id = amb.bidder_id
      );

    update public.auction_bid_events e
    set auction_id = v_target.target_id
    where e.auction_id = v_source;

    perform public.reconcile_auction_run_leader(v_target.target_id);

    update public.auction_runs ar
    set status = 'awaiting_payment',
        checkout_expires_at = now() + interval '30 minutes',
        updated_at = now()
    where ar.id = v_target.target_id
      and ar.status in ('unsold', 'live')
      and ar.current_winner_id is not null;

    insert into public.auction_bid_events (auction_id, bidder_id, visible_amount, event_type)
    select ar.id, ar.current_winner_id, ar.current_bid, 'win'
    from public.auction_runs ar
    where ar.id = v_target.target_id
      and ar.status = 'awaiting_payment'
      and ar.current_winner_id is not null
      and not exists (
        select 1
        from public.auction_bid_events e
        where e.auction_id = ar.id
          and e.event_type = 'win'
      );
  end loop;
end;
$$;

-- Repair: unsold runs that already have max bids on the same run --------------
do $$
declare
  v_run record;
begin
  for v_run in
    select ar.id
    from public.auction_runs ar
    where ar.status = 'unsold'
      and exists (
        select 1 from public.auction_max_bids amb where amb.auction_id = ar.id
      )
  loop
    perform public.reconcile_auction_run_leader(v_run.id);

    update public.auction_runs ar
    set status = 'awaiting_payment',
        checkout_expires_at = now() + interval '30 minutes',
        updated_at = now()
    where ar.id = v_run.id
      and ar.current_winner_id is not null;

    insert into public.auction_bid_events (auction_id, bidder_id, visible_amount, event_type)
    select ar.id, ar.current_winner_id, ar.current_bid, 'win'
    from public.auction_runs ar
    where ar.id = v_run.id
      and ar.current_winner_id is not null
      and not exists (
        select 1
        from public.auction_bid_events e
        where e.auction_id = ar.id
          and e.event_type = 'win'
      );
  end loop;
end;
$$;

-- Soft-close / live bids must never push ends_at past shop close ------------
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
  v_shop_end_at timestamptz;
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
  v_now timestamptz := now();
begin
  if v_bidder is null then raise exception 'authentication required'; end if;
  if p_max_amount < 50 then raise exception 'bid too low'; end if;

  select * into v_run from public.auction_runs where id = p_auction_id for update;
  if not found then raise exception 'auction not found'; end if;

  select * into v_product from public.products where id = v_run.product_id;
  if v_product.sale_type <> 'auction' then raise exception 'not an auction product'; end if;
  if v_run.seller_id = v_bidder then raise exception 'seller cannot bid'; end if;

  select end_at into v_shop_end_at from public.shops where id = v_run.shop_id;
  if v_shop_end_at is not null and v_shop_end_at <= v_now then
    raise exception 'shop has ended';
  end if;

  if v_run.status = 'queued' then
    if not v_product.auction_allow_prebids then
      raise exception 'pre-bids not enabled';
    end if;
  elsif v_run.status <> 'live' then
    raise exception 'auction not accepting bids';
  end if;

  if v_run.status = 'live'
     and v_run.ends_at is not null
     and v_run.ends_at <= v_now then
    raise exception 'auction has ended';
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
     and v_run.ends_at - v_now < make_interval(secs => v_run.soft_close_seconds)
  then
    v_run.ends_at := v_now + make_interval(secs => v_run.soft_close_seconds);
    -- Never let soft-close push an auction past shop close.
    if v_shop_end_at is not null then
      v_run.ends_at := least(v_run.ends_at, v_shop_end_at);
    end if;
    if v_run.ends_at > v_now then
      v_extended := true;
    end if;
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

-- Grants ---------------------------------------------------------------------
grant execute on function public.finalize_due_shop_auctions(uuid) to anon, authenticated, service_role;
