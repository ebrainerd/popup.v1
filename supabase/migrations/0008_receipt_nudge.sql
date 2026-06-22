-- ===========================================================================
-- PopUp — track "did it arrive? confirm receipt" buyer nudges
-- ===========================================================================

alter table public.orders
  add column if not exists receipt_nudge_count integer not null default 0,
  add column if not exists receipt_nudge_at timestamptz;
