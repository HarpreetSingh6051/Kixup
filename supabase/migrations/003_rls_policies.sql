-- =====================================================================
-- Ride & Roam (PackPulse) — 003 row level security
-- Run AFTER 001_initial_schema.sql and 002_functions_triggers.sql.
-- Helper functions (is_club_member, can_view_ride, ...) are SECURITY
-- DEFINER, so they evaluate without recursive RLS lookups.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFILES — public rider directory, self-managed
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- CLUBS — public clubs are discoverable, private clubs member-only
-- ---------------------------------------------------------------------
alter table public.clubs enable row level security;

drop policy if exists clubs_select_public on public.clubs;
create policy clubs_select_public on public.clubs
  for select to anon, authenticated
  using (privacy = 'public');

drop policy if exists clubs_select_member on public.clubs;
create policy clubs_select_member on public.clubs
  for select to authenticated
  using (public.is_club_member(id));

drop policy if exists clubs_insert_self on public.clubs;
create policy clubs_insert_self on public.clubs
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists clubs_update_admin on public.clubs;
create policy clubs_update_admin on public.clubs
  for update to authenticated
  using (created_by = auth.uid() or public.is_club_admin(id))
  with check (created_by = auth.uid() or public.is_club_admin(id));

drop policy if exists clubs_delete_owner on public.clubs;
create policy clubs_delete_owner on public.clubs
  for delete to authenticated
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- CLUB MEMBERSHIPS
-- ---------------------------------------------------------------------
alter table public.club_members enable row level security;

drop policy if exists club_members_select on public.club_members;
create policy club_members_select on public.club_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_club_member(club_id)
    or exists (
      select 1 from public.clubs c
      where c.id = club_id and c.privacy = 'public'
    )
  );

drop policy if exists club_members_insert_self on public.club_members;
create policy club_members_insert_self on public.club_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_club_member(club_id)
      or exists (
        select 1 from public.clubs c
        where c.id = club_id
          and (c.privacy = 'public' or c.created_by = auth.uid())
      )
    )
  );

drop policy if exists club_members_update_admin on public.club_members;
create policy club_members_update_admin on public.club_members
  for update to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

drop policy if exists club_members_delete_self_or_admin on public.club_members;
create policy club_members_delete_self_or_admin on public.club_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_club_admin(club_id));

-- ---------------------------------------------------------------------
-- RIDES
-- ---------------------------------------------------------------------
alter table public.rides enable row level security;

drop policy if exists rides_select on public.rides;
create policy rides_select on public.rides
  for select to authenticated
  using (public.can_view_ride(id));

drop policy if exists rides_insert_self on public.rides;
create policy rides_insert_self on public.rides
  for insert to authenticated
  with check (
    captain_id = auth.uid()
    and (club_id is null or public.is_club_member(club_id))
  );

drop policy if exists rides_update_captain on public.rides;
create policy rides_update_captain on public.rides
  for update to authenticated
  using (captain_id = auth.uid())
  with check (captain_id = auth.uid());

drop policy if exists rides_delete_captain on public.rides;
create policy rides_delete_captain on public.rides
  for delete to authenticated
  using (captain_id = auth.uid());

-- ---------------------------------------------------------------------
-- RIDE PARTICIPANTS (live radar telemetry)
-- ---------------------------------------------------------------------
alter table public.ride_participants enable row level security;

drop policy if exists participants_select on public.ride_participants;
create policy participants_select on public.ride_participants
  for select to authenticated
  using (public.can_view_ride(ride_id));

drop policy if exists participants_insert_self_or_captain on public.ride_participants;
create policy participants_insert_self_or_captain on public.ride_participants
  for insert to authenticated
  with check (
    public.can_view_ride(ride_id)
    and (user_id = auth.uid() or public.is_ride_captain(ride_id))
  );

drop policy if exists participants_update_self_or_captain on public.ride_participants;
create policy participants_update_self_or_captain on public.ride_participants
  for update to authenticated
  using (user_id = auth.uid() or public.is_ride_captain(ride_id))
  with check (user_id = auth.uid() or public.is_ride_captain(ride_id));

drop policy if exists participants_delete_self_or_captain on public.ride_participants;
create policy participants_delete_self_or_captain on public.ride_participants
  for delete to authenticated
  using (user_id = auth.uid() or public.is_ride_captain(ride_id));

-- ---------------------------------------------------------------------
-- RIDE EXPENSES (split the tank)
-- ---------------------------------------------------------------------
alter table public.ride_expenses enable row level security;

drop policy if exists expenses_select on public.ride_expenses;
create policy expenses_select on public.ride_expenses
  for select to authenticated
  using (public.can_view_ride(ride_id));

drop policy if exists expenses_insert_participant on public.ride_expenses;
create policy expenses_insert_participant on public.ride_expenses
  for insert to authenticated
  with check (
    paid_by_user_id = auth.uid()
    and (
      public.is_ride_participant(ride_id)
      or public.is_ride_captain(ride_id)
    )
  );

drop policy if exists expenses_update_payer_or_captain on public.ride_expenses;
create policy expenses_update_payer_or_captain on public.ride_expenses
  for update to authenticated
  using (
    paid_by_user_id = auth.uid()
    or public.is_ride_captain(ride_id)
  )
  with check (public.can_view_ride(ride_id));

drop policy if exists expenses_delete_payer_or_captain on public.ride_expenses;
create policy expenses_delete_payer_or_captain on public.ride_expenses
  for delete to authenticated
  using (
    paid_by_user_id = auth.uid()
    or public.is_ride_captain(ride_id)
  );

-- ---------------------------------------------------------------------
-- CHAT MESSAGES (ride packs + club lounges)
-- ---------------------------------------------------------------------
alter table public.chat_messages enable row level security;

drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages
  for select to authenticated
  using (
    (ride_id is not null and public.can_view_ride(ride_id))
    or (club_id is not null and public.is_club_member(club_id))
  );

drop policy if exists chat_insert_member on public.chat_messages;
create policy chat_insert_member on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (ride_id is not null and public.can_view_ride(ride_id))
      or (club_id is not null and public.is_club_member(club_id))
    )
  );

drop policy if exists chat_delete_sender on public.chat_messages;
create policy chat_delete_sender on public.chat_messages
  for delete to authenticated
  using (sender_id = auth.uid());

-- ---------------------------------------------------------------------
-- STORIES — authored by the rider, visible while unexpired
-- ---------------------------------------------------------------------
alter table public.stories enable row level security;

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (expires_at > now());

drop policy if exists stories_insert_self on public.stories;
create policy stories_insert_self on public.stories
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists stories_update_self on public.stories;
create policy stories_update_self on public.stories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RIDE PINGS — anyone who can see the pack can read, riders can drop
-- ---------------------------------------------------------------------
alter table public.ride_pings enable row level security;

drop policy if exists pings_select on public.ride_pings;
create policy pings_select on public.ride_pings
  for select to authenticated
  using (public.can_view_ride(ride_id));

drop policy if exists pings_insert_participant on public.ride_pings;
create policy pings_insert_participant on public.ride_pings
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_ride_participant(ride_id)
  );

-- ---------------------------------------------------------------------
-- RIDE LIKES
-- ---------------------------------------------------------------------
alter table public.ride_likes enable row level security;

drop policy if exists ride_likes_select on public.ride_likes;
create policy ride_likes_select on public.ride_likes
  for select to authenticated
  using (true);

drop policy if exists ride_likes_insert_self on public.ride_likes;
create policy ride_likes_insert_self on public.ride_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_ride(ride_id));

drop policy if exists ride_likes_delete_self on public.ride_likes;
create policy ride_likes_delete_self on public.ride_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- MEDIA ASSETS (R2 / storage pointer rows)
-- ---------------------------------------------------------------------
alter table public.media_assets enable row level security;

drop policy if exists media_select on public.media_assets;
create policy media_select on public.media_assets
  for select to authenticated
  using (owner_id = auth.uid() or (ride_id is not null and public.can_view_ride(ride_id)));

drop policy if exists media_insert_self on public.media_assets;
create policy media_insert_self on public.media_assets
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists media_delete_owner on public.media_assets;
create policy media_delete_owner on public.media_assets
  for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS — read your own entitlement only (writes via service role)
-- ---------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- SERVICE LOG — private digital garage history
-- ---------------------------------------------------------------------
alter table public.service_logs enable row level security;

drop policy if exists service_logs_select_self on public.service_logs;
create policy service_logs_select_self on public.service_logs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists service_logs_insert_self on public.service_logs;
create policy service_logs_insert_self on public.service_logs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists service_logs_update_self on public.service_logs;
create policy service_logs_update_self on public.service_logs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists service_logs_delete_self on public.service_logs;
create policy service_logs_delete_self on public.service_logs
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RPC EXECUTION GRANTS
-- ---------------------------------------------------------------------
-- Shared family-tracking snapshots are intentionally readable by anon:
-- the UUID token is the capability, and the payload contains no PII.
revoke all on function public.ride_share_snapshot(uuid) from public;
grant execute on function public.ride_share_snapshot(uuid) to anon, authenticated;

revoke all on function public.nearby_rides(double precision, double precision, double precision, integer) from public;
grant execute on function public.nearby_rides(double precision, double precision, double precision, integer) to authenticated;

revoke all on function public.send_ride_ping(uuid, text) from public;
grant execute on function public.send_ride_ping(uuid, text) to authenticated;

grant execute on function public.is_club_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_club_admin(uuid, uuid) to authenticated;
grant execute on function public.is_ride_participant(uuid, uuid) to authenticated;
grant execute on function public.is_ride_captain(uuid, uuid) to authenticated;
grant execute on function public.can_view_ride(uuid, uuid) to authenticated;
