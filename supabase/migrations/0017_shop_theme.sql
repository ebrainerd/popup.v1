-- Seller-customizable shop theme and layout (preset, accent, layout mode, visibility toggles).
alter table public.shops
  add column if not exists shop_theme jsonb not null default '{}'::jsonb;
