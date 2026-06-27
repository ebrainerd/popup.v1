-- Separate Twitch stream URL from YouTube (stored in live_url).
alter table public.shops
  add column if not exists twitch_url text;
