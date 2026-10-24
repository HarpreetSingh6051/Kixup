-- =====================================================================
-- Ride & Roam (PackPulse) — 004 storage buckets & policies
-- Run AFTER 001_initial_schema.sql. Buckets are optional when media is
-- served from Cloudflare R2 — keep them for local/demo uploads.
--
-- Object layout convention (folder prefix = owner uuid):
--   ride-media/{user_id}/{ride_id}/{file}
--   exhaust-notes/{user_id}/{file}
--   receipts/{user_id}/{file}
--   avatars/{user_id}/{file}
-- =====================================================================

-- ---------------------------------------------------------------------
-- BUCKETS
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ride-media',    'ride-media',    true,  52428800,
    array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']),
  ('exhaust-notes', 'exhaust-notes', false, 10485760,
    array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/webm','audio/ogg']),
  ('receipts',      'receipts',      false, 10485760,
    array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('avatars',       'avatars',       true,  5242880,
    array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RIDE MEDIA — world-readable showcase, owner-only writes
-- ---------------------------------------------------------------------
drop policy if exists ride_media_read on storage.objects;
create policy ride_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ride-media');

drop policy if exists ride_media_insert on storage.objects;
create policy ride_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ride-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists ride_media_update on storage.objects;
create policy ride_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ride-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'ride-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists ride_media_delete on storage.objects;
create policy ride_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ride-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- EXHAUST NOTES — pack members can listen, owner writes
-- ---------------------------------------------------------------------
drop policy if exists exhaust_notes_read on storage.objects;
create policy exhaust_notes_read on storage.objects
  for select to authenticated
  using (bucket_id = 'exhaust-notes');

drop policy if exists exhaust_notes_insert on storage.objects;
create policy exhaust_notes_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exhaust-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists exhaust_notes_delete on storage.objects;
create policy exhaust_notes_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exhaust-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- RECEIPTS — private, owner only (used by the AI split-the-tank scan)
-- ---------------------------------------------------------------------
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- AVATARS — public read, owner write
-- ---------------------------------------------------------------------
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
