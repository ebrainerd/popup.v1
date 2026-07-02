-- Stream product row changes (quantity/sold-out, flash pricing) to shop pages
-- via Supabase Realtime postgres_changes, so buyers see "Sold out" the moment
-- a purchase lands instead of after a refresh. RLS still applies: subscribers
-- only receive rows for shops they can read (can_read_shop).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;
