-- ===========================================================================
-- PopUp — Milestone 2: realtime (presence, chat moderation, flash drops)
-- ===========================================================================

-- Peak concurrent viewers, recorded for analytics.
alter table public.shops
  add column if not exists peak_viewers integer not null default 0;

-- ---------------------------------------------------------------------------
-- shop_mutes — sellers can mute a user in their shop's chat
-- ---------------------------------------------------------------------------
create table if not exists public.shop_mutes (
  shop_id   uuid not null references public.shops(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  muted_by  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

alter table public.shop_mutes enable row level security;

-- Anyone who can read the shop can see who is muted (mutes are public per spec).
drop policy if exists "Mutes readable with shop" on public.shop_mutes;
create policy "Mutes readable with shop"
  on public.shop_mutes for select using (public.can_read_shop(shop_id));

-- Only the shop owner can mute / unmute.
drop policy if exists "Sellers manage mutes" on public.shop_mutes;
create policy "Sellers manage mutes"
  on public.shop_mutes for all
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id) and muted_by = auth.uid());

create or replace function public.is_muted(target_shop uuid, target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shop_mutes m
    where m.shop_id = target_shop and m.user_id = target_user
  );
$$;

-- Tighten chat insert: authenticated, can read shop, and not muted.
drop policy if exists "Authenticated users can chat" on public.chat_messages;
create policy "Authenticated users can chat"
  on public.chat_messages for insert
  with check (
    user_id = auth.uid()
    and public.can_read_shop(shop_id)
    and not public.is_muted(shop_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- bump_peak_viewers — security-definer RPC so any viewer (incl. guests) can
-- raise a shop's recorded peak without owning the row.
-- ---------------------------------------------------------------------------
create or replace function public.bump_peak_viewers(p_shop uuid, p_count integer)
returns void language sql security definer set search_path = public as $$
  update public.shops
  set peak_viewers = greatest(coalesce(peak_viewers, 0), p_count)
  where id = p_shop;
$$;

grant execute on function public.bump_peak_viewers(uuid, integer) to anon, authenticated;
