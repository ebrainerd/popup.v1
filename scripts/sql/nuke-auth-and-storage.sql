-- Run after `supabase db reset` on a hosted project.
-- Clears auth accounts and uploaded file metadata (schema/migrations stay intact).
-- Requires postgres/service_role access (via `supabase db query --linked`).

DELETE FROM storage.objects;
DELETE FROM auth.users;
