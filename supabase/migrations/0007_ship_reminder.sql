-- ===========================================================================
-- PopUp — track when an "unshipped order" reminder was sent to the seller
-- ===========================================================================

alter table public.orders
  add column if not exists ship_reminder_sent_at timestamptz;
