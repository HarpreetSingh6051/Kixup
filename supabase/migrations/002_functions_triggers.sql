-- =====================================================================
-- Ride & Roam (PackPulse) — 002 functions, triggers, RPCs
-- Run AFTER 001_initial_schema.sql and BEFORE 003_rls_policies.sql
-- (the RLS policies call the helpers defined here).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER avoids recursive RLS lookups)
-- ---------------------------------------------------------------------
create or replace function public.is_club_member(_club_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = _club_id and user_id = _user_id
  );
$$;

create or replace function public.is_club_admin(_club_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = _club_id and user_id = _user_id and role in ('admin', 'captain')
  );
$$;

create or replace function public.is_ride_participant(_ride_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ride_participants
    where ride_id = _ride_id and user_id = _user_id
  );
$$;

create or replace function public.is_ride_captain(_ride_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rides
    where id = _ride_id and captain_id = _user_id
  );
$$;

create or replace function public.can_view_ride(_ride_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = _ride_id
      and (
        r.visibility = 'public'
        or r.captain_id = _user_id
        or public.is_ride_participant(r.id, _user_id)
        or (r.club_id is not null and public.is_club_member(r.club_id, _user_id))
      )
  );
$$;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists clubs_touch on public.clubs;
create trigger clubs_touch before update on public.clubs
  for each row execute function public.touch_updated_at();

drop trigger if exists rides_touch on public.rides;
create trigger rides_touch before update on public.rides
  for each row execute function public.touch_updated_at();

drop trigger if exists participants_touch on public.ride_participants;
create trigger participants_touch before update on public.ride_participants
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Auto-create a rider profile for every new auth user
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, full_name, avatar_url, city, primary_bike)
  values (
    new.id,
    coalesce(
      nullif(regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'user_name', '')), '[^a-z0-9_]', '', 'g'), ''),
      'rider_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'New Rider'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'city', 'Ludhiana, IN'),
    coalesce(new.raw_user_meta_data ->> 'primary_bike', 'Set your bike in the garage')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Keep rides.likes_count in sync
-- ---------------------------------------------------------------------
create or replace function public.sync_ride_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.ride_id, old.ride_id);
begin
  update public.rides
     set likes_count = (select count(*) from public.ride_likes where ride_id = target)
   where id = target;
  return null;
end;
$$;

drop trigger if exists ride_likes_sync on public.ride_likes;
create trigger ride_likes_sync
  after insert or delete on public.ride_likes
  for each row execute function public.sync_ride_like_count();

-- ---------------------------------------------------------------------
-- Club counters: member_count + riding_now
-- ---------------------------------------------------------------------
create or replace function public.refresh_club_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_table_name = 'club_members' then
    target := coalesce(new.club_id, old.club_id);
    update public.clubs c
       set member_count = (select count(*) from public.club_members m where m.club_id = target)
     where c.id = target;
  else
    -- ride_participants: recompute riding_now for every club touched
    for target in
      select distinct r.club_id
        from public.rides r
       where r.id in (coalesce(new.ride_id, old.ride_id))
         and r.club_id is not null
    loop
      update public.clubs c
         set riding_now = (
           select count(distinct rp.user_id)
             from public.ride_participants rp
             join public.rides r on r.id = rp.ride_id
            where r.club_id = c.id
              and r.status = 'ongoing'
              and rp.rsvp_status = 'going'
         )
       where c.id = target;
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists club_members_count on public.club_members;
create trigger club_members_count
  after insert or delete on public.club_members
  for each row execute function public.refresh_club_counters();

drop trigger if exists participants_riding_now on public.ride_participants;
create trigger participants_riding_now
  after insert or update or delete on public.ride_participants
  for each row execute function public.refresh_club_counters();

-- ---------------------------------------------------------------------
-- Formation role guards: exactly one Road Captain, one Tail Sweep
-- ---------------------------------------------------------------------
create or replace function public.enforce_formation_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.formation_role in ('Road Captain', 'Tail Sweep') then
    update public.ride_participants p
       set formation_role = case
             when new.formation_role = 'Tail Sweep' then 'Pack Member'
             else 'Tail Sweep'
           end
     where p.ride_id = new.ride_id
       and p.user_id <> new.user_id
       and p.formation_role = new.formation_role;
  elsif new.formation_role = 'Pack Member' then
    -- no-op: demoting a role simply frees the slot
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists participants_role_guard on public.ride_participants;
create trigger participants_role_guard
  before insert or update of formation_role on public.ride_participants
  for each row execute function public.enforce_formation_roles();

-- ---------------------------------------------------------------------
-- RPC: rides near me (PostGIS radius search)
-- ---------------------------------------------------------------------
create or replace function public.nearby_rides(
  _lat double precision,
  _lng double precision,
  _radius_km double precision default 150,
  _limit integer default 30
)
returns setof public.rides
language sql
stable
security definer
set search_path = public
as $$
  select r.*
    from public.rides r
   where r.status in ('upcoming', 'ongoing')
     and r.meetup_coords is not null
     and st_dwithin(
           r.meetup_coords,
           st_setsrid(st_makepoint(_lng, _lat), 4326)::geography,
           _radius_km * 1000
         )
     and (r.visibility = 'public' or public.can_view_ride(r.id))
   order by st_distance(
              r.meetup_coords,
              st_setsrid(st_makepoint(_lng, _lat), 4326)::geography
            ) asc
   limit greatest(1, least(_limit, 100));
$$;

-- ---------------------------------------------------------------------
-- RPC: public family-tracking snapshot (no PII, token-scoped)
-- ---------------------------------------------------------------------
create or replace function public.ride_share_snapshot(_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ride', jsonb_build_object(
      'id', r.id,
      'title', r.title,
      'route_summary', r.route_summary,
      'status', r.status,
      'distance_km', r.distance_km,
      'start_time', r.start_time,
      'meetup_coords', st_asgeojson(r.meetup_coords)::jsonb,
      'destination_coords', st_asgeojson(r.destination_coords)::jsonb
    ),
    'riders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', p.handle,
        'formation_role', rp.formation_role,
        'speed_kmh', rp.current_speed_kmh,
        'last_ping_type', rp.last_ping_type,
        'coords', case
          when rp.last_coords is null then null
          else st_asgeojson(rp.last_coords)::jsonb
        end
      ))
      from public.ride_participants rp
      join public.profiles p on p.id = rp.user_id
      where rp.ride_id = r.id and rp.rsvp_status = 'going'
    ), '[]'::jsonb)
  )
  from public.rides r
  where r.share_token = _token;
$$;

-- ---------------------------------------------------------------------
-- RPC: mark a ping (used by the glove buttons)
-- ---------------------------------------------------------------------
create or replace function public.send_ride_ping(_ride_id uuid, _ping_type text)
returns public.ride_pings
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.ride_pings;
begin
  if not public.is_ride_participant(_ride_id) then
    raise exception 'Not a participant of this ride';
  end if;
  if _ping_type not in ('FUEL STOP', 'CHAI BREAK', 'HAZARD', 'ALL CLEAR') then
    raise exception 'Invalid ping type';
  end if;

  insert into public.ride_pings (ride_id, user_id, ping_type)
  values (_ride_id, auth.uid(), _ping_type)
  returning * into inserted;

  update public.ride_participants
     set last_ping_type = _ping_type, updated_at = now()
   where ride_id = _ride_id and user_id = auth.uid();

  return inserted;
end;
$$;

-- ---------------------------------------------------------------------
-- Realtime publication (idempotent)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.ride_participants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ride_pings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.stories;
exception when duplicate_object then null;
end $$;

-- Broadcast presence for the live radar.
alter table public.ride_participants replica identity full;
