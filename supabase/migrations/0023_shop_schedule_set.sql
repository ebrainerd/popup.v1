-- Track whether the seller has explicitly chosen drop open/close times.
-- Draft shops use PLACEHOLDER_SCHEDULE until schedule_set becomes true.

alter table public.shops
  add column if not exists schedule_set boolean not null default false;

-- Existing shops already have real schedules from prior flows.
update public.shops
set schedule_set = true
where schedule_set = false;
