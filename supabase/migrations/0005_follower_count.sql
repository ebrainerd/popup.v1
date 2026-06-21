-- ===========================================================================
-- PopUp — denormalized follower_count for popularity sorting & profile display
-- ===========================================================================

alter table public.profiles
  add column if not exists follower_count integer not null default 0;

-- Backfill from existing follows.
update public.profiles p
set follower_count = sub.c
from (
  select seller_id, count(*)::int as c
  from public.shop_follows
  group by seller_id
) sub
where p.id = sub.seller_id;

-- Keep it in sync as follows are added/removed.
create or replace function public.refresh_follower_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.profiles p
  set follower_count = (
    select count(*) from public.shop_follows where seller_id = target
  )
  where p.id = target;
  return null;
end; $$;

drop trigger if exists shop_follows_refresh_count on public.shop_follows;
create trigger shop_follows_refresh_count
  after insert or delete on public.shop_follows
  for each row execute function public.refresh_follower_count();

create index if not exists profiles_follower_count_idx
  on public.profiles(follower_count desc);
