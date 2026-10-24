# 🏍️ Ride & Roam (PackPulse) — Master Architecture & Claude Code Blueprint

> **How to use this file with Claude Code / OpenCode:**
> 1. Create a new empty folder on your computer: `mkdir packpulse && cd packpulse`
> 2. Save this entire document as **`CLAUDE.md`** (and/or **`AGENTS.md`**) inside that root folder.
> 3. Open your terminal, run `claude` (or `opencode`), and paste the **Master Kickoff Prompt** from **Section 1** below.

---

## 1. 🚀 MASTER KICKOFF PROMPT (Copy & Paste This Into Claude Code)

```text
Read CLAUDE.md thoroughly. We are building "Ride & Roam (PackPulse)"—a global motorcycle social network, club manager, live Sunday pack radar, AI expense splitter, and AI reel studio that runs from a single React + TypeScript codebase across Android, iOS, Web Browser, and Windows Desktop.

Follow the architecture, Neon Dark Social UI theme, database schema, and phased execution plan in CLAUDE.md strictly:
1. First, scaffold a clean cross-platform React + TypeScript workspace (Vite + Tailwind CSS + Capacitor for Android/iOS + Tauri/PWA config for Windows & Web, or Expo Router Universal if preferred—use Vite + React + Tailwind + Capacitor + Supabase for maximum web/mobile/desktop speed and zero build friction).
2. Set up the Supabase client config, environment variable templates (.env.example), and generate the `supabase/migrations/001_initial_schema.sql` file containing all tables, PostGIS extensions, and Row-Level Security (RLS) policies defined in CLAUDE.md.
3. Build the complete responsive Mobile-First & Wide-Desktop Social Shell with the floating glassmorphic bottom dock (`Feed`, `Clubs`, `+ Create`, `Chat`, `Garage/Profile`), Top Stories Bar, Contextual Ride Detail Page -> Live Ongoing Ride Map, AI Receipt OCR Service (using Google Gemini 2.5 Flash), and Pro Subscription Paywall Modal.
4. Ensure all interactive flows work end-to-end with a hybrid data layer (live Supabase queries with automatic fallback to rich seeded mock data when offline or before keys are added).

Start with Step 1 & Step 2, verify there are zero TypeScript or build errors, and then build the full UI and feature modules.
```

---

## 2. 🛠️ Unified React Tech Stack (1 Codebase → 4 Platforms)

Yes—you can use **React + TypeScript** for **100% of your platforms** so you never write code twice:

| Layer | Technology Choice | Why It Fits Your Goal (Fast, Scalable & Free to Start) |
| :--- | :--- | :--- |
| **Core UI Framework** | **React 19 + TypeScript + Vite** | Ultra-fast hot reload, huge ecosystem, works everywhere. |
| **Styling & Animations** | **Tailwind CSS + Lucide Icons + Framer Motion** | Replicates the exact Midnight Neon Instagram/Snapchat glassmorphic aesthetic (`#07070C` base, Crimson Rose `#F43F5E`, Cyber Cyan `#22D3EE`). |
| **Android & iOS Apps** | **Capacitor.js** (wraps your React app into native `.apk`/`.aab` & Xcode projects) | Lets you use standard React + Tailwind while accessing native **Background Geolocation**, Camera, Push Notifications, and Share Sheets. |
| **Web Browser (Global Link Sharing)** | **Progressive Web App (PWA) on Cloudflare Pages / Vercel** | Instant loading when a Road Captain shares a `packpulse.app/ride/123` invite link in a WhatsApp group. |
| **Windows Desktop App** | **PWA Desktop Install + Tauri v2 (Optional `.exe` wrapper)** | Turns your exact React web build into a lightweight native Windows `.exe` app using less than 40MB RAM. |
| **State & Data Fetching** | **TanStack Query (React Query) + Zustand** | Caches feed data, handles offline mountain zones, and syncs live state cleanly. |

---

## 3. 🗄️ 100% Free-Tier Database, Storage & Map Stack

To launch globally with **$0/month in fixed server costs** until you have thousands of active riders, use this battle-tested free stack:

### A. Primary Database, Auth & Real-Time GPS: **Supabase (Free Tier)**
* **Why Supabase?** It gives you a full **PostgreSQL** database with **PostGIS** (for calculating distances between riders and finding "Rides Near Me"), **Supabase Auth** (Google, Apple, Phone OTP), and **Supabase Realtime WebSockets** (for live pack chat and live GPS radar broadcasting) in one free account.
* **Free Tier Limits:** 500 MB database storage (holds ~500,000 ride records/messages), 50,000 monthly active users, and unlimited API requests.

### B. Photo, Exhaust Audio & Reel Video Storage: **Cloudflare R2 (Free Tier)**
* **Why Cloudflare R2 instead of AWS S3 or Firebase Storage?** When 20 riders upload Sunday ride photos, exhaust audio clips, and 4K videos, AWS S3 charges expensive "egress bandwidth fees" every time someone views them. **Cloudflare R2 has $0 egress fees forever** and gives you **10 GB/month free storage**.

### C. Interactive Dark Maps & Routing: **MapLibre GL JS + OpenFreeMap + OSRM**
* **Why not Google Maps JS API?** Google Maps gets expensive fast once thousands of riders open the live radar. **MapLibre GL JS** paired with **OpenFreeMap** vector tiles and **OSRM (Open Source Routing Machine)** gives you smooth 60fps custom dark-mode neon maps and highway routes for **$0**.

### D. AI Brain: **Google Gemini API (`gemini-2.5-flash`)**
* **Why Gemini 2.5 Flash?** Generous free tier in Google AI Studio, native multimodal vision (reads crumpled dhaba/cafe receipts and fuel slips in 1.5 seconds), and ultra-low token cost when you scale.

### E. Global + India Subscription Payments (Zero Monthly Fee):
* **Global Users ($4.99/mo):** **Lemon Squeezy** or **Paddle** (Merchant of Record—handles US/EU/UK taxes automatically; only takes ~5% + 50¢ when you make a sale).
* **Indian Users (₹199/mo):** **Razorpay Subscriptions** (Supports UPI AutoPay on Google Pay, PhonePe, Paytm).

---

## 4. 📱 Complete Feature Specification (What Claude Code Must Build)

### Module 1: Top Live Rider Stories & Global/Local Ride Feed (`Feed` Dock Tab)
* **Ongoing Ride Active Banner:** Sticky emerald pulse banner at the top of the feed whenever a user's joined ride is currently live. Tapping it opens the **Ride Detail Page**.
* **Horizontal Rider Stories Bar:** Instagram/Snapchat-style glowing gradient rings showing live rider updates, bike model, location, and 6-second **Exhaust Audio Note** previews.
* **Dual Feed Filters:**
  1. **Location Scope:** `🌐 All Rides` | `📍 Near Me (Geolocation radius)` | `✈️ Global Runs`
  2. **Privacy Scope:** `All` | `🔓 Public Rides` (open to any rider) | `🔒 My Groups` (visible only to members of that specific club)
* **Social Ride Cards:** Shows Club Header, Verified Badge, Public vs. Club-Only pill, Route Title, Captain's Bike, Distance, Meetup Time, Route Hashtags, Joined Rider Avatars (`14/20 Riders In`), `+ Join Ride` RSVP toggle, Like counter, Comment link, WhatsApp Invite share button, and **`Ride Details & Map`** button.

### Module 2: Contextual Ride Detail Page & Live Ongoing Snap-Map
* **CRITICAL UX RULE:** The Live Map **must not** clutter the bottom navigation bar. It is accessed **only** inside a Ride's Detail Page via the prominent **`Go to Ongoing Live Ride Map`** CTA button (or from the active ride chat header).
* **Ride Detail View:** Displays full route summary, Road Captain profile, Pack Formation & Check-In Roster (`Road Captain`, `Sweep / Tail Gunner`, `Medic / Toolkit`, `Reel Creator`), and an **Offline Mountain GPX Download (PRO)** trigger.
* **Ongoing Live Ride Radar (Snap-Map View):**
  * Custom dark neon map showing live moving markers for checked-in riders with their avatar, bike icon, and current speed (`84 km/h`).
  * **Pack Spread / Fall-Behind Alert (PRO):** Automatically highlights in red and alerts the Road Captain if the Sweep rider falls more than `2.0 km` behind the lead rider.
  * **Web Family Tracking Link:** 1-tap copyable URL so family members can watch the ride safely in a web browser without installing the app.
  * **4 Giant Glove-Friendly 1-Tap Pings:** `⛽ FUEL STOP`, `☕ CHAI BREAK`, `🚨 HAZARD / STOP`, `⚡ ALL CLEAR`—broadcasts instantly to all riders in the pack.

### Module 3: Multi-Club Directory & Group Manager (`Clubs` Dock Tab)
* **Multi-Club Membership:** Users can join multiple local and international clubs (`Punjab Harley Owners`, `Himalayan ADV`, `SoCal Canyon Carvers`, etc.).
* **Club Discovery & Filters:** Search by city, bike style (Cruisers, ADV, Track), or filter by `🇮🇳 India` vs `🌍 Global`.
* **Real-Time Online Indicator:** Each club card displays total members and a live green badge (`● 34 Riding Now`).
* **Create Riding Group Modal:** Any user can launch a new club with a custom name, handle, base city, and privacy (`Public Club` vs `Invite-Only Pack`).

### Module 4: Pack Chat, Club Lounges & Exhaust Audio Notes (`Chat` Dock Tab)
* **3 Channel Types:** Active Ride Pack Chats, Club Lounges, and 1-on-1 Direct Messages.
* **1-Tap Exhaust Voice Note:** Dedicated microphone button allowing riders to record/send high-decibel exhaust cold-start or rev clips (`🔊 98 dB V-Twin Exhaust Note`) alongside standard text and meetup pins.
* **Live Helmet Intercom Bridge Upsell (PRO):** Header button to launch background WebRTC voice chat across Cardo, Sena, and AirPods users.

### Module 5: AI Reel Studio & Ride Host (`+` Center Dock Button)
* **Mode A — AI Social Reel Studio (PRO Conversion Driver):**
  * Select clips/photos from the shared Sunday Ride Media Vault.
  * Choose telemetry overlay style (`V-Twin Speedometer HUD`, `Minimal GPS Route Flyover`, `RAW Exhaust Boost`).
  * Free tier exports 720p with a `"Ride & Roam"` watermark; **Road Captain PRO** unlocks 4K watermark-free export for Instagram Reels & YouTube Shorts.
* **Mode B — Host a Sunday Ride Form:**
  * Create a new ride with Title, Meetup Point, Route Distance, Date/Time, Club Association, and Visibility (`Public Ride` vs `Group-Only`).

### Module 6: Rider Garage, AI Split-the-Tank Kitty & Pro Monetization (`Garage` Dock Tab)
* **Rider Social Profile:** Avatar, handle, Road Captain badge, primary motorcycle showcase, total logged km, active clubs count, and follower stats.
* **Sub-Tab 1: `💸 Split Ride Bills` (AI Receipt OCR):**
  * Shows total Sunday pack spend and exact per-rider share.
  * **`+ AI Scan Bill` Button:** Uses **Gemini 2.5 Flash Vision** to scan a photo of a highway dhaba/cafe bill or fuel receipt, extracting vendor name, line items, total, and automatically dividing by checked-in riders.
* **Sub-Tab 2: `🔧 Digital Garage & AI Mechanic`:**
  * Tracks tyre pressure recommendations, next oil/chain service countdown, and lets the rider ask Gemini mechanical questions specific to their motorcycle model.
* **Sub-Tab 3: `👑 Founder Monetization & Feature Flags`:**
  * Runtime switches to test **Road Captain PRO ($4.99/mo / ₹199/mo)** paywall triggers and non-intrusive **Sponsored Highway Pitstop / Gear Partner perks**.

---

## 5. 🗃️ Complete PostgreSQL + PostGIS Schema (`supabase/migrations/001_initial_schema.sql`)

Have Claude Code create this exact migration file for Supabase:

```sql
-- Enable UUID and PostGIS extensions for location-based ride discovery
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. PROFILES & DIGITAL GARAGE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  city TEXT DEFAULT 'Ludhiana, IN',
  country TEXT DEFAULT 'IN',
  primary_bike TEXT DEFAULT 'Harley-Davidson Fat Bob 114',
  is_pro BOOLEAN DEFAULT FALSE,
  total_km INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RIDING CLUBS / GROUPS
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  region TEXT DEFAULT 'India', -- 'India' | 'Global'
  riding_style TEXT DEFAULT 'Cruisers & Touring',
  badge_emoji TEXT DEFAULT '🏍️',
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'invite_only')),
  verified BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLUB MEMBERSHIPS (Multi-Club Support)
CREATE TABLE club_members (
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'captain', 'member')),
  is_online BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);

-- 4. RIDES (Public Global or Private Group-Only)
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  route_summary TEXT NOT NULL, -- e.g. 'Ludhiana -> Kasauli (NH-44)'
  region_scope TEXT DEFAULT 'Near Me', -- 'Near Me' | 'Global'
  distance_label TEXT DEFAULT '180 km Roundtrip',
  start_time TIMESTAMPTZ NOT NULL,
  meetup_coords GEOGRAPHY(POINT, 4326),
  destination_coords GEOGRAPHY(POINT, 4326),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'group_only')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  max_riders INTEGER DEFAULT 20,
  split_enabled BOOLEAN DEFAULT TRUE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RIDE PARTICIPANTS & FORMATION ROLES + LIVE RADAR TELEMETRY
CREATE TABLE ride_participants (
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rsvp_status TEXT DEFAULT 'going' CHECK (rsvp_status IN ('going', 'maybe', 'out')),
  formation_role TEXT DEFAULT 'Pack Member', -- 'Road Captain', 'Tail Sweep', 'Medic / Toolkit', 'Reel Creator'
  last_coords GEOGRAPHY(POINT, 4326),
  current_speed_kmh INTEGER DEFAULT 0,
  last_ping_type TEXT, -- 'FUEL STOP', 'CHAI BREAK', 'HAZARD', 'ALL CLEAR'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ride_id, user_id)
);

-- 6. SPLIT-THE-TANK RIDE EXPENSES (AI OCR Supported)
CREATE TABLE ride_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  paid_by_user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  per_rider_share NUMERIC(10, 2) NOT NULL,
  line_items JSONB DEFAULT '[]'::jsonb,
  receipt_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PACK CHAT & EXHAUST VOICE NOTES
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  is_exhaust_audio BOOLEAN DEFAULT FALSE,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. 🤖 Gemini 2.5 Flash Service Prompts (For Claude Code to Implement)

Have Claude Code create `src/services/geminiService.ts` using `@google/genai` with this structured JSON receipt parser:

```typescript
// Prompt for Gemini 2.5 Flash Receipt Scanner (Split-the-Tank)
export const RECEIPT_OCR_SYSTEM_PROMPT = `
You are the PackPulse AI Expense Splitter for motorcycle group rides.
Analyze the uploaded restaurant, highway dhaba, cafe, or fuel station receipt image.
Return ONLY valid JSON matching this exact schema:
{
  "title": "Store or Cafe Name + Brief Type (e.g., Haveli Highway Breakfast)",
  "amount": 2400,
  "currency": "₹",
  "items": ["10x Amritsari Kulcha", "5x Masala Chai"]
}
`;
```

---

## 7. 📂 Recommended Folder Structure for Claude Code

```text
packpulse/
├── CLAUDE.md                        # This master blueprint file
├── package.json                     # React, Vite, Tailwind, Lucide, Supabase, Capacitor
├── capacitor.config.ts              # iOS & Android native build config
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # PostgreSQL + PostGIS tables
└── src/
    ├── App.tsx                      # Main Social App Shell + Bottom Dock Router
    ├── lib/
    │   ├── supabase.ts              # Supabase client + fallback mock state
    │   └── gemini.ts                # Gemini 2.5 Flash Receipt OCR & Garage AI
    ├── components/
    │   ├── StoriesBar.tsx           # Top horizontal glowing biker stories
    │   ├── BottomDock.tsx           # Floating Instagram/Snapchat glass dock
    │   ├── PaywallModal.tsx         # High-conversion Road Captain PRO modal
    │   └── RideCard.tsx             # Feed Ride Card (Public vs Group-Only)
    └── pages/
        ├── FeedPage.tsx             # Stories + Ongoing Ride Banner + Filtered Feed
        ├── RideDetailAndMap.tsx     # Ride Details -> "Go to Ongoing Live Map"
        ├── ClubsDirectoryPage.tsx   # Multi-club search, online count, create club
        ├── PackChatPage.tsx         # Ride chat, club lounge & exhaust audio notes
        ├── CreateReelOrRidePage.tsx # AI 4K Reel Studio + Host Ride form
        └── GarageAndProfilePage.tsx # Rider Profile, Split Kitty & AI Mechanic
```
---

## 8. ✅ Implementation status in this repository (added after the build)

This blueprint is fully implemented in `E:\projects\packpulse`. Read `AGENTS.md` for
the working conventions, and `README.md` for setup and deployment.

Key deltas from the original spec (all deliberate, all documented):

- **Data layer**: `src/lib/data.ts` runs Supabase queries when `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` are set, and silently falls back to the seeded dataset in
  `src/lib/mockData.ts` otherwise. Demo mode is the default so the app runs with no keys.
- **Migrations**: `001_initial_schema.sql` → `002_functions_triggers.sql` →
  `003_rls_policies.sql` → `004_storage.sql` (order matters: RLS calls the helpers in 002).
- **Maps**: `LiveRadarMap.tsx` renders a custom vector neon radar in SVG instead of
  MapLibre/OpenFreeMap. This keeps the live pack view offline-safe and dependency-free;
  `nearby_rides()` (PostGIS) is still the production geo-query path.
- **AI**: `src/lib/gemini.ts` calls the Gemini REST API directly (`fetch`) rather than
  `@google/genai`, and returns deterministic demo receipts/answers when no key is present.
- **Media**: ride artwork is generated SVG (`RideArtwork.tsx`); exhaust notes are
  synthesized with WebAudio (`exhaustAudio.ts`). No binary assets are required to run.
- **Routing**: a small hash router (`src/lib/router.tsx`) instead of react-router, so
  Capacitor file:// and static hosting work without rewrites.
- **Auth**: demo mode uses a fixed rider (`u_arjun`). Wire Supabase Auth before production.
- **Payments**: the paywall is a UI/entitlement demo (`useAppStore`); Razorpay /
  Lemon Squeezy webhooks still need a server (Supabase Edge Function recommended).
