-- Support tickets: buyers and sellers report problems / ask questions via
-- /support. Rows are written and read only through the service role (the
-- server action validates + inserts, and the owner triages from Supabase or
-- email). RLS stays enabled with no client policies, so anon/authenticated
-- cannot touch the table directly.

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  email      text not null check (char_length(email) <= 320),
  topic      text not null check (topic in ('order', 'payment', 'shop', 'bug', 'other')),
  message    text not null check (char_length(message) between 1 and 2000),
  status     text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_created_idx on public.support_tickets(created_at desc);

alter table public.support_tickets enable row level security;

-- Defense-in-depth for local stacks where seed.sql grants blanket privileges.
revoke all on table public.support_tickets from anon, authenticated;
