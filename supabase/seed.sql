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
