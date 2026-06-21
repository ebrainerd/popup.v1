-- ===========================================================================
-- PopUp — inventory reservations (prevents overselling during checkout)
-- ===========================================================================

create table if not exists public.product_reservations (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id   uuid not null references public.profiles(id) on delete cascade,
  session_id text,
  status     text not null default 'held' check (status in ('held', 'completed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reservations_active_idx
  on public.product_reservations(product_id)
  where status = 'held';
create index if not exists reservations_session_idx
  on public.product_reservations(session_id);

alter table public.product_reservations enable row level security;

-- Buyers can see their own reservations; writes happen via security-definer
-- functions / the service role (webhook).
drop policy if exists "Buyers read own reservations" on public.product_reservations;
create policy "Buyers read own reservations"
  on public.product_reservations for select
  using (buyer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reserve_product — atomically hold one unit if available, else return null.
-- Availability = products.quantity - active (held, non-expired) reservations.
-- ---------------------------------------------------------------------------
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
begin
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
  values (p_product, p_buyer, p_session, 'held', now() + make_interval(mins => p_ttl_minutes))
  returning id into v_res;
  return v_res;
end; $$;

grant execute on function public.reserve_product(uuid, uuid, text, integer) to authenticated;

-- Active held units per product (for display of "X available").
create or replace function public.held_quantity(p_product uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.product_reservations
  where product_id = p_product and status = 'held' and expires_at > now();
$$;
grant execute on function public.held_quantity(uuid) to anon, authenticated;
