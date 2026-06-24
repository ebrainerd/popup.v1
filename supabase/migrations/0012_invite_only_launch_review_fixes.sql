-- ===========================================================================
-- PopUp — Invite-only launch review fixes
-- ===========================================================================

-- Reminder counts only for shops the caller may read (no draft/private demand leak).
create or replace function public.drop_reminder_count(target_shop uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.can_read_shop(target_shop) then (
      select count(*)::bigint
      from public.drop_reminders
      where shop_id = target_shop
        and cancelled_at is null
    )
    else 0::bigint
  end;
$$;

revoke all on function public.drop_reminder_count(uuid) from public;
grant execute on function public.drop_reminder_count(uuid) to anon, authenticated, service_role;
