-- ===========================================================================
-- Persist the IANA timezone sellers intend for shop open/close wall clocks.
-- start_at / end_at remain UTC instants; schedule_timezone is display/edit context.
-- ===========================================================================

alter table public.shops
  add column if not exists schedule_timezone text;

comment on column public.shops.schedule_timezone is
  'IANA timezone for seller schedule wall clocks (e.g. America/Los_Angeles). null = unset (client defaults to browser zone).';
