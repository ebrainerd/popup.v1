-- Native in-app live streaming (LiveKit) + stream source per shop.

create type public.stream_provider as enum ('none', 'native', 'youtube', 'twitch');

alter table public.shops
  add column if not exists stream_provider public.stream_provider not null default 'native',
  add column if not exists stream_room_id text,
  add column if not exists native_live_started_at timestamptz,
  add column if not exists native_live_ended_at timestamptz,
  add column if not exists native_live_tos_accepted_at timestamptz;

-- Infer external stream source from existing URL columns.
update public.shops
set stream_provider = 'twitch'
where coalesce(twitch_url, '') <> '';

update public.shops
set stream_provider = 'youtube'
where coalesce(live_url, '') <> ''
  and coalesce(twitch_url, '') = '';

comment on column public.shops.stream_provider is 'Video source: native (PopUp Live), youtube, twitch, or none';
comment on column public.shops.stream_room_id is 'LiveKit room name, e.g. shop-{uuid}';
