-- Stream new orders to the seller's live backstage feed via Supabase Realtime
-- postgres_changes, so a host sees "who bought what" the instant a checkout
-- lands instead of after a refresh. RLS still applies: the orders SELECT policy
-- (buyer_id = auth.uid() or owns_shop(shop_id)) means only the shop owner (and
-- the buyer themselves) receive a given order row — buyer identities are never
-- exposed to other shoppers.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
