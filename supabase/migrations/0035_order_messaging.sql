-- Order-scoped messaging + "Need help with this order".
--
-- Buyers and sellers message each other about a specific order (separate from
-- shop chat / LiveKit). Either party can open a help request (notifies the
-- other party) and, as a second step, escalate it to PopUp support. The
-- conversation stays open indefinitely — even after the shop ends — until BOTH
-- parties mark it resolved, at which point it is archived (composer hidden,
-- history still readable). Either party removing their resolution reopens it.

-- True when the current user is a party to the order (buyer or shop owner).
create or replace function public.is_order_party(target_order uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order
      and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))
  );
$$;

-- ===========================================================================
-- order_messages
-- ===========================================================================
create table if not exists public.order_messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_idx
  on public.order_messages(order_id, created_at);

alter table public.order_messages enable row level security;

drop policy if exists "Order parties read messages" on public.order_messages;
create policy "Order parties read messages"
  on public.order_messages for select
  using (public.is_order_party(order_id));

drop policy if exists "Order parties send messages" on public.order_messages;
create policy "Order parties send messages"
  on public.order_messages for insert
  with check (sender_id = auth.uid() and public.is_order_party(order_id));

-- ===========================================================================
-- order_help_requests
-- ===========================================================================
create table if not exists public.order_help_requests (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  opened_by    uuid not null references public.profiles(id) on delete cascade,
  reason       text not null check (reason in ('shipping', 'wrong_item', 'damaged', 'not_received', 'other')),
  message      text not null check (char_length(message) between 1 and 2000),
  status       text not null default 'open' check (status in ('open', 'resolved')),
  escalated_at timestamptz,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- At most one open help request per order.
create unique index if not exists order_help_requests_one_open_idx
  on public.order_help_requests(order_id) where status = 'open';

create index if not exists order_help_requests_order_idx
  on public.order_help_requests(order_id, created_at);

alter table public.order_help_requests enable row level security;

drop policy if exists "Order parties read help requests" on public.order_help_requests;
create policy "Order parties read help requests"
  on public.order_help_requests for select
  using (public.is_order_party(order_id));

drop policy if exists "Order parties open help requests" on public.order_help_requests;
create policy "Order parties open help requests"
  on public.order_help_requests for insert
  with check (opened_by = auth.uid() and public.is_order_party(order_id));

-- Either party can escalate or resolve (server actions gate the transitions).
drop policy if exists "Order parties update help requests" on public.order_help_requests;
create policy "Order parties update help requests"
  on public.order_help_requests for update
  using (public.is_order_party(order_id))
  with check (public.is_order_party(order_id));

-- ===========================================================================
-- order_conversation_resolutions
-- ===========================================================================
-- One row per party who marked the conversation resolved. The conversation is
-- archived when BOTH the buyer and the seller have a row. Deleting your own
-- row reopens the conversation.
create table if not exists public.order_conversation_resolutions (
  order_id    uuid not null references public.orders(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  resolved_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

alter table public.order_conversation_resolutions enable row level security;

drop policy if exists "Order parties read resolutions" on public.order_conversation_resolutions;
create policy "Order parties read resolutions"
  on public.order_conversation_resolutions for select
  using (public.is_order_party(order_id));

drop policy if exists "Order parties mark resolved" on public.order_conversation_resolutions;
create policy "Order parties mark resolved"
  on public.order_conversation_resolutions for insert
  with check (user_id = auth.uid() and public.is_order_party(order_id));

drop policy if exists "Users clear own resolution" on public.order_conversation_resolutions;
create policy "Users clear own resolution"
  on public.order_conversation_resolutions for delete
  using (user_id = auth.uid());
