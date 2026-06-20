-- ===========================================================================
-- PopUp — initial schema (Milestone 1)
-- Postgres / Supabase. Enables Row Level Security on every table.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type shop_visibility as enum ('public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shop_status as enum ('draft', 'scheduled', 'open', 'ended', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum
    ('paid', 'shipped', 'in_transit', 'delivered', 'received', 'refunded', 'canceled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ===========================================================================
-- profiles  (1:1 with auth.users)
-- ===========================================================================
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text,
  avatar_url        text,
  bio               text,
  stripe_account_id text,
  rating_avg        numeric(3,2),
  rating_count      integer not null default 0,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1),
      'user'
    ),
    '[^a-z0-9_]', '', 'g'
  ));
  if base_username = '' then base_username := 'user'; end if;
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- shops
-- ===========================================================================
create table if not exists public.shops (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  slug          text,
  description   text,
  cover_url     text,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  visibility    shop_visibility not null default 'public',
  shipping_rate integer not null default 0 check (shipping_rate >= 0), -- cents
  is_live       boolean not null default false,
  live_url      text,
  status        shop_status not null default 'scheduled',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint shops_time_order check (end_at > start_at)
);

create index if not exists shops_seller_idx on public.shops(seller_id);
create index if not exists shops_explore_idx on public.shops(visibility, status, start_at);

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

alter table public.shops enable row level security;

-- Public + private(link) shops are readable by anyone once not a draft.
-- Private shops rely on the unguessable UUID for access control.
drop policy if exists "Shops are viewable when published" on public.shops;
create policy "Shops are viewable when published"
  on public.shops for select
  using (status <> 'draft' or seller_id = auth.uid());

drop policy if exists "Sellers manage own shops insert" on public.shops;
create policy "Sellers manage own shops insert"
  on public.shops for insert with check (seller_id = auth.uid());

drop policy if exists "Sellers manage own shops update" on public.shops;
create policy "Sellers manage own shops update"
  on public.shops for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "Sellers manage own shops delete" on public.shops;
create policy "Sellers manage own shops delete"
  on public.shops for delete using (seller_id = auth.uid());

-- ===========================================================================
-- products
-- ===========================================================================
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 140),
  description      text,
  photo_url        text,
  price            integer not null check (price >= 0),        -- cents, shipping included
  quantity         integer not null default 1 check (quantity >= 0),
  discount_price   integer check (discount_price >= 0),         -- flash-drop price (cents)
  is_flash_only    boolean not null default false,
  flash_expires_at timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists products_shop_idx on public.products(shop_id);

alter table public.products enable row level security;

-- Helper: is the parent shop readable by the current viewer?
create or replace function public.can_read_shop(target_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shops s
    where s.id = target_shop
      and (s.status <> 'draft' or s.seller_id = auth.uid())
  );
$$;

create or replace function public.owns_shop(target_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shops s
    where s.id = target_shop and s.seller_id = auth.uid()
  );
$$;

drop policy if exists "Products readable with shop" on public.products;
create policy "Products readable with shop"
  on public.products for select using (public.can_read_shop(shop_id));

drop policy if exists "Sellers manage own products" on public.products;
create policy "Sellers manage own products"
  on public.products for all
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

-- ===========================================================================
-- orders
-- ===========================================================================
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references public.profiles(id) on delete restrict,
  shop_id          uuid not null references public.shops(id) on delete restrict,
  product_id       uuid not null references public.products(id) on delete restrict,
  amount_paid      integer not null check (amount_paid >= 0),  -- cents
  platform_fee     integer not null default 0 check (platform_fee >= 0),
  shipping_address jsonb,
  status           order_status not null default 'paid',
  tracking_number  text,
  carrier          text,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists orders_shop_idx on public.orders(shop_id);

alter table public.orders enable row level security;

drop policy if exists "Buyers and sellers can read orders" on public.orders;
create policy "Buyers and sellers can read orders"
  on public.orders for select
  using (buyer_id = auth.uid() or public.owns_shop(shop_id));

-- Inserts happen via the Stripe webhook (service role). Buyers may also
-- create their own order record in dev. Sellers update fulfillment fields.
drop policy if exists "Buyers create own orders" on public.orders;
create policy "Buyers create own orders"
  on public.orders for insert with check (buyer_id = auth.uid());

drop policy if exists "Sellers update orders" on public.orders;
create policy "Sellers update orders"
  on public.orders for update
  using (public.owns_shop(shop_id) or buyer_id = auth.uid())
  with check (public.owns_shop(shop_id) or buyer_id = auth.uid());

-- ===========================================================================
-- shop_follows  (follow a seller)
-- ===========================================================================
create table if not exists public.shop_follows (
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (seller_id, follower_id)
);

alter table public.shop_follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.shop_follows;
create policy "Follows are viewable by everyone"
  on public.shop_follows for select using (true);

drop policy if exists "Users manage own follows" on public.shop_follows;
create policy "Users manage own follows"
  on public.shop_follows for all
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

-- ===========================================================================
-- ratings
-- ===========================================================================
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  order_id   uuid not null references public.orders(id) on delete cascade,
  stars      integer not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists ratings_seller_idx on public.ratings(seller_id);

alter table public.ratings enable row level security;

drop policy if exists "Ratings are viewable by everyone" on public.ratings;
create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

-- A buyer may only rate an order they own that has reached a completed state.
drop policy if exists "Buyers rate completed orders" on public.ratings;
create policy "Buyers rate completed orders"
  on public.ratings for insert
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.buyer_id = auth.uid()
        and o.status in ('delivered', 'received')
    )
  );

-- Keep profiles.rating_avg / rating_count in sync.
create or replace function public.refresh_seller_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.profiles p
  set rating_avg = sub.avg_stars,
      rating_count = sub.cnt
  from (
    select avg(stars)::numeric(3,2) as avg_stars, count(*)::int as cnt
    from public.ratings where seller_id = target
  ) sub
  where p.id = target;
  return null;
end; $$;

drop trigger if exists ratings_refresh on public.ratings;
create trigger ratings_refresh
  after insert or update or delete on public.ratings
  for each row execute function public.refresh_seller_rating();

-- ===========================================================================
-- chat_messages
-- ===========================================================================
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_shop_idx on public.chat_messages(shop_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "Chat readable with shop" on public.chat_messages;
create policy "Chat readable with shop"
  on public.chat_messages for select using (public.can_read_shop(shop_id));

drop policy if exists "Authenticated users can chat" on public.chat_messages;
create policy "Authenticated users can chat"
  on public.chat_messages for insert
  with check (user_id = auth.uid() and public.can_read_shop(shop_id));

-- Sellers can hide (mute) messages in their shop.
drop policy if exists "Sellers moderate chat" on public.chat_messages;
create policy "Sellers moderate chat"
  on public.chat_messages for update
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

-- ===========================================================================
-- Storage buckets (public read; owners write into their own folder)
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true), ('products', 'products', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
  on storage.objects for select
  using (bucket_id in ('covers', 'products', 'avatars'));

drop policy if exists "Users upload own media" on storage.objects;
create policy "Users upload own media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('covers', 'products', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own media" on storage.objects;
create policy "Users update own media"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('covers', 'products', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own media" on storage.objects;
create policy "Users delete own media"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('covers', 'products', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
