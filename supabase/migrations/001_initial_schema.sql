-- =====================================================================
-- Ride & Roam (PackPulse) — 001 initial schema
-- PostgreSQL 15+ / Supabase, PostGIS enabled
-- Run with: supabase db push   (or paste into the SQL editor)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- 1. PROFILES & DIGITAL GARAGE
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  full_name text not null,
  avatar_url text,
  city text default 'Ludhiana, IN',
  country text default 'IN',
  primary_bike text default 'Harley-Davidson Fat Bob 114',
  bio text,
  is_pro boolean not null default false,
  total_km integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,24}$')
);

comment on table public.profiles is 'Rider identity, garage summary and PRO entitlement mirror.';

-- ---------------------------------------------------------------------
-- 2. RIDING CLUBS / GROUPS
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  handle text unique not null,
  description text,
  city text not null,
  region text not null default 'India' check (region in ('India', 'Global')),
  riding_style text not null default 'Cruisers & Touring',
  badge_emoji text not null default '🏍️',
  privacy text not null default 'public' check (privacy in ('public', 'invite_only')),
  verified boolean not null default false,
  accent text not null default '#F43F5E',
  member_count integer not null default 0,
  riding_now integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clubs_region_idx on public.clubs (region);
create index if not exists clubs_city_idx on public.clubs (city);
create index if not exists clubs_name_trgm_idx on public.clubs using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 3. CLUB MEMBERSHIPS (multi-club support)
-- ---------------------------------------------------------------------
create table if not exists public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'captain', 'member')),
  is_online boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_user_idx on public.club_members (user_id);

-- ---------------------------------------------------------------------
-- 4. RIDES (public global or private group-only)
-- ---------------------------------------------------------------------
create table if not exists public.rides (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs (id) on delete cascade,
  captain_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  route_summary text not null,
  description text,
  region_scope text not null default 'Near Me' check (region_scope in ('Near Me', 'Global')),
  distance_label text not null default '180 km Roundtrip',
  distance_km numeric(7, 1) not null default 180,
  start_time timestamptz not null,
  meetup_label text,
  meetup_coords geography(point, 4326),
  destination_coords geography(point, 4326),
  visibility text not null default 'public' check (visibility in ('public', 'group_only')),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  max_riders integer not null default 20 check (max_riders between 2 and 200),
  split_enabled boolean not null default true,
  likes_count integer not null default 0,
  comment_count integer not null default 0,
  difficulty text not null default 'Spirited' check (difficulty in ('Chill', 'Spirited', 'Hardcore')),
  hashtags text[] not null default '{}',
  waypoints jsonb not null default '[]'::jsonb,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rides_club_idx on public.rides (club_id);
create index if not exists rides_captain_idx on public.rides (captain_id);
create index if not exists rides_start_idx on public.rides (start_time);
create index if not exists rides_status_idx on public.rides (status);
create index if not exists rides_meetup_gist_idx on public.rides using gist (meetup_coords);
create index if not exists rides_hashtags_idx on public.rides using gin (hashtags);

-- ---------------------------------------------------------------------
-- 5. RIDE PARTICIPANTS + FORMATION ROLES + LIVE RADAR TELEMETRY
-- ---------------------------------------------------------------------
create table if not exists public.ride_participants (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rsvp_status text not null default 'going' check (rsvp_status in ('going', 'maybe', 'out')),
  formation_role text not null default 'Pack Member'
    check (formation_role in ('Road Captain', 'Tail Sweep', 'Medic / Toolkit', 'Reel Creator', 'Pack Member')),
  checked_in boolean not null default false,
  last_coords geography(point, 4326),
  current_speed_kmh integer not null default 0,
  last_ping_type text
    check (last_ping_type in ('FUEL STOP', 'CHAI BREAK', 'HAZARD', 'ALL CLEAR')),
  updated_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

create index if not exists ride_participants_user_idx on public.ride_participants (user_id);
create index if not exists ride_participants_coords_gist_idx
  on public.ride_participants using gist (last_coords);

-- ---------------------------------------------------------------------
-- 6. SPLIT-THE-TANK RIDE EXPENSES (AI OCR supported)
-- ---------------------------------------------------------------------
create table if not exists public.ride_expenses (
  id uuid primary key default uuid_generate_v4(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  paid_by_user_id uuid references public.profiles (id) on delete set null,
  title text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  per_rider_share numeric(10, 2) not null default 0,
  split_count integer not null default 1 check (split_count > 0),
  line_items jsonb not null default '[]'::jsonb,
  receipt_image_url text,
  ai_source text check (ai_source in ('gemini', 'manual', 'demo')),
  created_at timestamptz not null default now()
);

create index if not exists ride_expenses_ride_idx on public.ride_expenses (ride_id);

-- ---------------------------------------------------------------------
-- 7. PACK CHAT & EXHAUST VOICE NOTES
-- ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs (id) on delete cascade,
  ride_id uuid references public.rides (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  message_text text not null,
  kind text not null default 'text' check (kind in ('text', 'audio', 'ping', 'pin', 'system')),
  is_exhaust_audio boolean not null default false,
  audio_url text,
  audio_db integer,
  duration_sec integer,
  created_at timestamptz not null default now(),
  constraint chat_messages_target check (club_id is not null or ride_id is not null)
);

create index if not exists chat_messages_ride_idx on public.chat_messages (ride_id, created_at desc);
create index if not exists chat_messages_club_idx on public.chat_messages (club_id, created_at desc);

-- ---------------------------------------------------------------------
-- 8. LIVE STORIES
-- ---------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ride_id uuid references public.rides (id) on delete set null,
  label text not null default 'LIVE',
  headline text not null,
  media_url text,
  audio_url text,
  audio_db integer,
  is_live boolean not null default false,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);

create index if not exists stories_user_idx on public.stories (user_id, created_at desc);
create index if not exists stories_expiry_idx on public.stories (expires_at);

-- ---------------------------------------------------------------------
-- 9. ONE-TAP PACK PINGS (fuel / chai / hazard / all clear)
-- ---------------------------------------------------------------------
create table if not exists public.ride_pings (
  id uuid primary key default uuid_generate_v4(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ping_type text not null check (ping_type in ('FUEL STOP', 'CHAI BREAK', 'HAZARD', 'ALL CLEAR')),
  created_at timestamptz not null default now()
);

create index if not exists ride_pings_ride_idx on public.ride_pings (ride_id, created_at desc);

-- ---------------------------------------------------------------------
-- 10. RIDE LIKES (feeds rides.likes_count via trigger)
-- ---------------------------------------------------------------------
create table if not exists public.ride_likes (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

-- ---------------------------------------------------------------------
-- 11. MEDIA VAULT (R2 object references: photos, reels, exhaust notes)
-- ---------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default uuid_generate_v4(),
  ride_id uuid references public.rides (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('photo', 'video', 'audio', 'receipt')),
  duration_sec integer,
  palette text,
  created_at timestamptz not null default now()
);

create index if not exists media_assets_ride_idx on public.media_assets (ride_id);

-- ---------------------------------------------------------------------
-- 12. SUBSCRIPTIONS (Razorpay / Lemon Squeezy mirror, service-role writes)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'lemonsqueezy', 'paddle', 'apple', 'google')),
  provider_customer_id text,
  provider_subscription_id text unique,
  plan text not null default 'pro_monthly',
  currency text not null default 'INR',
  amount numeric(10, 2),
  status text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- ---------------------------------------------------------------------
-- 13. SERVICE LOG (digital garage history + AI mechanic context)
-- ---------------------------------------------------------------------
create table if not exists public.service_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bike_model text not null,
  service_type text not null,
  odometer_km integer,
  notes text,
  cost numeric(10, 2),
  performed_at timestamptz not null default now()
);

create index if not exists service_logs_user_idx on public.service_logs (user_id, performed_at desc);
