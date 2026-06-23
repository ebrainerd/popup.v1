-- ===========================================================================
-- PopUp — Creator drop loop: reminders, announcements, featured drops
-- ===========================================================================

-- Drop-level buyer reminders (per shop, not per seller).
create table if not exists public.drop_reminders (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references public.shops(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  email_enabled      boolean not null default true,
  push_enabled       boolean not null default false,
  before_24h_sent_at timestamptz,
  before_1h_sent_at  timestamptz,
  opening_sent_at    timestamptz,
  created_at         timestamptz not null default now(),
  cancelled_at       timestamptz
);

create unique index if not exists drop_reminders_active_unique
  on public.drop_reminders(shop_id, user_id)
  where cancelled_at is null;

create index if not exists drop_reminders_shop_idx
  on public.drop_reminders(shop_id)
  where cancelled_at is null;

create index if not exists drop_reminders_user_idx
  on public.drop_reminders(user_id)
  where cancelled_at is null;

alter table public.drop_reminders enable row level security;

drop policy if exists "Users manage own drop reminders" on public.drop_reminders;
create policy "Users manage own drop reminders"
  on public.drop_reminders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Sellers read reminders for own shops" on public.drop_reminders;
create policy "Sellers read reminders for own shops"
  on public.drop_reminders for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = drop_reminders.shop_id and s.seller_id = auth.uid()
    )
  );

-- Seller announcements shown in the waiting room before a drop opens.
create table if not exists public.shop_announcements (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists shop_announcements_shop_idx
  on public.shop_announcements(shop_id, created_at desc);

alter table public.shop_announcements enable row level security;

drop policy if exists "Announcements readable with shop" on public.shop_announcements;
create policy "Announcements readable with shop"
  on public.shop_announcements for select
  using (public.can_read_shop(shop_id));

drop policy if exists "Sellers post announcements" on public.shop_announcements;
create policy "Sellers post announcements"
  on public.shop_announcements for insert
  with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.seller_id = auth.uid()
    )
  );

drop policy if exists "Sellers delete own announcements" on public.shop_announcements;
create policy "Sellers delete own announcements"
  on public.shop_announcements for delete
  using (seller_id = auth.uid());

-- Operator curation: featured drops surface on homepage / Explore.
alter table public.shops
  add column if not exists featured_at timestamptz;

create index if not exists shops_featured_idx
  on public.shops(featured_at desc nulls last)
  where featured_at is not null;
