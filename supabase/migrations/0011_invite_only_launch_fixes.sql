-- ===========================================================================
-- PopUp — Invite-only launch fixes: reminder deliveries, publish invariants
-- ===========================================================================

-- Idempotent reminder delivery claims (concurrent cron safe).
create table if not exists public.drop_reminder_deliveries (
  id           uuid primary key default gen_random_uuid(),
  reminder_id  uuid not null references public.drop_reminders(id) on delete cascade,
  reminder_window text not null check (reminder_window in ('24h', '1h', 'opening')),
  status       text not null check (status in ('processing', 'sent', 'failed', 'skipped_no_provider')),
  attempted_at timestamptz not null default now(),
  sent_at      timestamptz,
  error        text,
  unique (reminder_id, reminder_window)
);

create index if not exists drop_reminder_deliveries_reminder_idx
  on public.drop_reminder_deliveries(reminder_id);

alter table public.drop_reminder_deliveries enable row level security;

-- Only service role sends reminders; no client access needed.
drop policy if exists "No client access to reminder deliveries" on public.drop_reminder_deliveries;
create policy "No client access to reminder deliveries"
  on public.drop_reminder_deliveries for all
  using (false)
  with check (false);

-- Public aggregate reminder count without exposing individual rows.
create or replace function public.drop_reminder_count(target_shop uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::bigint
  from public.drop_reminders
  where shop_id = target_shop
    and cancelled_at is null;
$$;

revoke all on function public.drop_reminder_count(uuid) from public;
grant execute on function public.drop_reminder_count(uuid) to anon, authenticated, service_role;

-- New shops default to draft (app already inserts draft; align DB default).
alter table public.shops alter column status set default 'draft';

-- Enforce draft/publish invariants at the database boundary.
create or replace function public.enforce_shop_publish_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  product_count int;
begin
  -- Service role / no auth context (cron, migrations) may bypass.
  if auth.uid() is null then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    if new.status is distinct from 'draft' then
      raise exception 'shops must be created as draft';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status is distinct from 'draft' then
    select count(*)::int into product_count
    from public.products
    where shop_id = new.id;
    if product_count < 1 then
      raise exception 'cannot publish shop without at least one product';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists shops_enforce_publish_invariants on public.shops;
create trigger shops_enforce_publish_invariants
  before insert or update on public.shops
  for each row execute function public.enforce_shop_publish_invariants();
