-- Profile setup gate: OAuth users pick a username on /onboarding; email signups
-- pass username in auth metadata at registration.

alter table public.profiles
  add column if not exists profile_setup_complete boolean not null default false;

-- Existing profiles were created before this gate; treat them as complete.
update public.profiles
set profile_setup_complete = true
where profile_setup_complete = false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_username text;
  base_username text;
  final_username text;
  suffix int := 0;
  setup_complete boolean := false;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  requested_username := regexp_replace(requested_username, '[^a-z0-9_]', '', 'g');

  if requested_username <> ''
     and length(requested_username) between 3 and 20
     and requested_username ~ '^[a-z][a-z0-9_]*$'
     and right(requested_username, 1) <> '_'
     and position('__' in requested_username) = 0
  then
    if exists (select 1 from public.profiles where username = requested_username) then
      raise exception 'username_taken';
    end if;
    final_username := requested_username;
    setup_complete := true;
  else
    base_username := lower(regexp_replace(
      coalesce(
        new.raw_user_meta_data->>'user_name',
        split_part(new.email, '@', 1),
        'user'
      ),
      '[^a-z0-9_]', '', 'g'
    ));
    if base_username = '' or length(base_username) < 3 then
      base_username := 'user';
    end if;
    if length(base_username) > 20 then
      base_username := left(base_username, 20);
    end if;
    if base_username !~ '^[a-z]' then
      base_username := 'u' || base_username;
      if length(base_username) > 20 then
        base_username := left(base_username, 20);
      end if;
    end if;
    final_username := base_username;
    setup_complete := false;

    while exists (select 1 from public.profiles where username = final_username) loop
      suffix := suffix + 1;
      final_username := left(base_username, greatest(3, 20 - length(suffix::text))) || suffix::text;
    end loop;
  end if;

  insert into public.profiles (id, username, display_name, avatar_url, profile_setup_complete)
  values (
    new.id,
    final_username,
    null,
    new.raw_user_meta_data->>'avatar_url',
    setup_complete
  )
  on conflict (id) do nothing;

  return new;
end; $$;
