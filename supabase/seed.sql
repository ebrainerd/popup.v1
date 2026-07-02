-- Local-development seed (applied automatically by `supabase start` / `supabase db reset`).
--
-- The migrations in supabase/migrations enable Row Level Security and define
-- policies, but they rely on the API roles (anon / authenticated / service_role)
-- already holding table-level privileges on the `public` schema. A hosted
-- Supabase project configures those default privileges at project creation; a
-- local CLI stack does not, which otherwise leaves every table reporting
-- "permission denied" even though RLS policies exist.
--
-- Re-grant the standard Supabase privileges here so the local stack matches a
-- hosted project. RLS remains enabled on every table, so row access is still
-- gated by the policies in the migrations — these grants only restore the
-- table-level access the policies are written against.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Re-apply the targeted restrictions from 0025_security_hardening.sql, which
-- the blanket grants above would otherwise undo on a local stack. Keep this
-- block in sync with that migration.
revoke insert, update on table public.orders from anon;
revoke insert on table public.orders from authenticated;
revoke update on table public.orders from authenticated;
grant update (status, tracking_number, carrier, shipped_at, received_at, delivered_at)
  on table public.orders to authenticated;
revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
revoke all on table public.support_tickets from anon, authenticated;
