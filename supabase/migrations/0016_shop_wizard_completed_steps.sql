-- Track which setup-wizard steps the seller has explicitly completed for draft shops.
alter table public.shops
  add column if not exists wizard_completed_steps text[] not null default '{}';
