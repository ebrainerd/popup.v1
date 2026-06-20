-- ===========================================================================
-- PopUp — Milestone 2: web push subscriptions
-- ===========================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Users manage only their own push subscriptions. The server uses the
-- service-role key (which bypasses RLS) to read followers' subscriptions
-- when sending notifications.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
