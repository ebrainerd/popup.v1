-- Buyer opt-in: notify when seller goes live (separate from drop opening reminders).

create table if not exists public.live_reminders (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists live_reminders_active_unique
  on public.live_reminders(shop_id, user_id)
  where cancelled_at is null;

create index if not exists live_reminders_shop_idx
  on public.live_reminders(shop_id)
  where cancelled_at is null;

alter table public.live_reminders enable row level security;

drop policy if exists "Users manage own live reminders" on public.live_reminders;
create policy "Users manage own live reminders"
  on public.live_reminders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Sellers read live reminders for own shops" on public.live_reminders;
create policy "Sellers read live reminders for own shops"
  on public.live_reminders for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = live_reminders.shop_id and s.seller_id = auth.uid()
    )
  );

create or replace function public.live_reminder_count(target_shop uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.live_reminders
  where shop_id = target_shop
    and cancelled_at is null;
$$;

revoke all on function public.live_reminder_count(uuid) from public;
grant execute on function public.live_reminder_count(uuid) to anon, authenticated, service_role;
