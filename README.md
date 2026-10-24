# 🏍️ Ride & Roam — PackPulse

A cross-platform motorcycle social network: find your pack, run club rides with a live
formation radar, split the tank with AI receipt scanning, and cut ride reels — from one
React + TypeScript codebase (Web, Android, iOS, Windows).

Built from the blueprint in [`CLAUDE.md`](./CLAUDE.md).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

No environment variables are required. With no keys the app runs in **demo mode** on a
rich seeded dataset (13 riders, 8 clubs, 8 rides, live telemetry, chat, expenses, garage).

```bash
cp .env.example .env # optional: connect Supabase + Gemini
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 (LAN host enabled) |
| `npm run build` | Typecheck (`tsc --noEmit`) then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run cap:sync` | Copy `dist/` into the Capacitor native projects |
| `npm run cap:android` | Add the Android project |
| `npm run cap:ios` | Add the iOS project |
| `npm run tauri:dev` | Run the Tauri v2 desktop shell (needs Rust) |
| `npm run tauri:build` | Build the Windows/macOS/Linux desktop bundle |

---

## What is implemented

### Feed (`#/feed`)
- Sticky **live ride banner** for any ongoing ride you joined.
- Glowing **stories rail** with a full-screen story viewer, 6-second exhaust-note
  previews, live badges and rider metadata.
- **Dual filters**: location scope (All rides / Near me with geolocation / Global runs)
  and privacy scope (All / Public / My groups).
- Ride cards with club header, verified badge, visibility pill, captain bike, distance,
  meetup time, hashtags, joined-rider avatars, RSVP toggle, like counter, share sheet and
  a `Ride details & map` CTA.
- Sponsored highway pitstop card and PRO upsell rail.

### Ride detail (`#/ride/:id`)
- Route summary, captain card, meetup/destination waypoints, difficulty and distance.
- Pack **formation roster** (Road Captain, Tail Sweep, Medic/Toolkit, Reel Creator,
  Pack Member) with check-in state.
- Split-the-tank preview, captain/meetup/share rails, GPX download (PRO).
- The **only** entry point to the live map, per the blueprint UX rule.

### Live radar (`#/ride/:id/live`)
- Custom vector neon radar (`LiveRadarMap`) with avatar/speed markers, pack spread and
  live sweep distance — no tile server, works offline.
- **Fall-behind alert** when the sweep is more than 2 km behind the lead (PRO).
- Four glove-sized pings: ⛽ Fuel stop, ☕ Chai break, 🚨 Hazard, ⚡ All clear.
- Ping feed, rider list, **family tracking link** (`?family=1` read-only mode).
- Captain controls to reorder the formation and a live `riding now` readout.

### Clubs (`#/clubs`)
- Search + region/style/verified filters, member and `riding now` counts.
- Join/leave multiple clubs, create-club modal (name, handle, city, privacy).
- Club detail drawer with upcoming rides and member previews.

### Pack chat (`#/chat/:channelId?`)
- Ride pack chats, club lounges and DMs in one channel list.
- Text, meetup pins, system messages and **exhaust voice notes** with synthesized
  WebAudio revs + dB readout.
- Intercom-bridge upsell (PRO), simulated replies so the flow feels alive.

### Create (`#/create`)
- **Reel Studio**: pick media-vault clips, choose a telemetry HUD overlay, scrub the
  timeline, export gated by plan (720p watermark vs 4K watermark-free), AI caption.
- **Host a ride**: full form that creates a real local ride visible in the feed.

### Garage / Profile (`#/garage`)
- Rider profile, PRO badge, bike showcase, km, clubs, followers.
- **Split ride bills**: pack spend, per-rider share, AI receipt scan (Gemini or demo),
  manual expense add, settle-up state.
- **Digital garage**: tyre pressure, service countdowns, service log, AI mechanic chat.
- **Founder console**: runtime feature flags, env/service status, unit economics and a
  demo-data reset.

---

## Architecture

```text
packpulse/
├── CLAUDE.md                     # original blueprint + implementation notes
├── AGENTS.md                     # conventions for AI/code agents
├── capacitor.config.ts           # Android/iOS wrapper (appId app.packpulse.rideandrom)
├── src-tauri/                    # Tauri v2 desktop shell + generated icons
├── supabase/migrations/
│   ├── 001_initial_schema.sql    # 13 tables, PostGIS, indexes, constraints
│   ├── 002_functions_triggers.sql# helpers, triggers, RPCs, realtime publication
│   ├── 003_rls_policies.sql      # row-level security for every table
│   └── 004_storage.sql           # buckets + folder-scoped storage policies
├── public/                       # manifest, icon, offline service worker
└── src/
    ├── App.tsx                   # shell, lazy routes, footer status, hosts
    ├── types.ts                  # domain model
    ├── lib/
    │   ├── supabase.ts           # client + dataMode (live | demo)
    │   ├── data.ts               # query hooks, Supabase → mock fallback
    │   ├── mockData.ts           # seeded demo world
    │   ├── gemini.ts             # receipt OCR, mechanic, captions + fallbacks
    │   ├── gpx.ts                # GPX builder / download
    │   ├── exhaustAudio.ts       # WebAudio exhaust synthesizer
    │   ├── router.tsx            # hash router (Capacitor/file:// friendly)
    │   └── format.ts             # currency, dates, distance, initials
    ├── store/useAppStore.ts      # Zustand + persistence (PRO, joins, likes, flags)
    ├── hooks/                    # geolocation + live ride simulation
    ├── components/               # design system, dock, stories, radar, paywall…
    └── pages/                    # Feed, Ride detail, Live, Clubs, Chat, Create, Garage
```

### Data layer

`src/lib/supabase.ts` exposes `dataMode`:

- `live` — both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present.
- `demo` — otherwise; every hook in `src/lib/data.ts` resolves the seeded dataset.

Hooks still attempt Supabase first when configured and fall back to mock data on error,
so the UI never shows a dead state. Writes (joins, likes, messages, expenses, pings)
are optimistic and persisted client-side via Zustand.

### Design system

- Base `#07070C`, Crimson Rose `#F43F5E`, Cyber Cyan `#22D3EE`, pack emerald accents.
- Glassmorphic panels, hairline borders, Space Grotesk display / Inter body /
  JetBrains Mono telemetry, floating bottom dock, mobile-first up to a 6xl desktop grid.
- All primitives live in `src/components/ui.tsx`; Tailwind tokens in `tailwind.config.js`.

### Routing

Hash-based: `#/feed`, `#/ride/:id`, `#/ride/:id/live`, `#/clubs`, `#/chat/:channelId?`,
`#/create`, `#/garage`. Secondary pages are `React.lazy` code-split.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) and enable PostGIS
   (Database → Extensions) if your plan requires it explicitly.
2. Run the migrations **in order** in the SQL editor, or with the CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   | File | Contents |
   | --- | --- |
   | `001_initial_schema.sql` | profiles, clubs, club_members, rides, ride_participants, ride_expenses, chat_messages, stories, ride_pings, ride_likes, media_assets, subscriptions, service_logs |
   | `002_functions_triggers.sql` | `is_club_member`, `can_view_ride`, `is_ride_participant`, `is_ride_captain`, counters, formation guard, `nearby_rides`, `ride_share_snapshot`, `send_ride_ping`, realtime publication |
   | `003_rls_policies.sql` | RLS on all tables + RPC grants (anon may call `ride_share_snapshot`) |
   | `004_storage.sql` | `ride-media`, `exhaust-notes`, `receipts`, `avatars` buckets + policies |

3. Copy the project URL and anon key into `.env`:

   ```bash
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. The migration creates a profile automatically for every new `auth.users` row.
   Wire your preferred auth providers in Supabase, then replace the demo rider in
   `src/lib/data.ts` (`currentUserId`).

### Storage layout

Objects are scoped by owner uuid as the first folder:

```text
ride-media/{user_id}/{ride_id}/file.jpg
exhaust-notes/{user_id}/note.webm
receipts/{user_id}/bill.jpg
avatars/{user_id}/avatar.png
```

`ride-media` and `avatars` are public buckets; receipts and exhaust notes are private
and owner-scoped. If you serve media from Cloudflare R2 instead, set
`VITE_R2_PUBLIC_BASE_URL` and keep `media_assets.storage_path` as the object key.

---

## AI (Gemini 2.5 Flash)

`src/lib/gemini.ts` calls the REST API directly — no SDK dependency:

- `scanReceipt(imageBase64)` → `{ title, amount, currency, items[] }`
- `askMechanic(question, bike, serviceLogs)` → short, model-specific answer
- `generateReelCaption(ride, clips)` → caption + hashtags

Set `VITE_GEMINI_API_KEY` to go live. Without it, every call returns a deterministic
demo response, so the paywall/OCR/mechanic flows remain fully demoable. The API key is
exposed to the browser — for production, proxy Gemini through a Supabase Edge Function.

---

## Platform builds

### Web / PWA
`npm run build` emits `dist/` with `manifest.webmanifest` and an offline service worker
(`public/sw.js`, registered in production only). Deploy to Cloudflare Pages, Vercel or
Netlify. No SPA rewrite is needed because routing is hash-based.

### Android / iOS (Capacitor)
```bash
npm run build
npm run cap:android   # or cap:ios
npm run cap:sync
npx cap open android  # or ios
```
Add `@capacitor/geolocation`, `@capacitor/camera` and `@capacitor/push-notifications`
for background tracking, receipt capture and ride alerts.

### Windows desktop (Tauri v2)
```bash
npm run tauri:dev     # requires Rust + WebView2
npm run tauri:build   # .msi/.exe in src-tauri/target/release/bundle
```
The shell lives in `src-tauri/` with a locked-down CSP. Icons are pre-generated; to
re-generate from the brand SVG run `npx @tauri-apps/cli icon public/icon.svg`.

---

## Monetization model

| Plan | Price | Unlocks |
| --- | --- | --- |
| Free | ₹0 | Feed, clubs, chat, 720p watermarked reels, basic radar |
| Road Captain PRO (India) | ₹199/mo · ₹1,499/yr | GPX export, 4K reels, fall-behind alerts, family link, intercom bridge |
| Road Captain PRO (Global) | $4.99/mo · $39/yr | Same, billed via Lemon Squeezy/Paddle |

The paywall, entitlements and feature flags are client-side in `useAppStore` for the
demo. Production needs server-verified entitlements: Razorpay (UPI AutoPay) for India,
Lemon Squeezy/Paddle globally, mirrored into `subscriptions` by a webhook Edge Function,
with `profiles.is_pro` updated server-side.

---

## Known limitations / next steps

- **Demo auth**: a fixed rider (`u_arjun`) is used until Supabase Auth is wired.
- **Radar**: the SVG radar is a deterministic simulation; swap in MapLibre GL +
  OpenFreeMap + OSRM and Supabase Realtime for production GPS (the schema, RPCs and
  realtime publication are ready).
- **Payments**: UI only; no checkout session or webhook handler yet.
- **Push notifications**: not wired (Capacitor plugin + FCM/APNs pending).
- **Media**: generated SVG artwork and synthesized audio keep the demo asset-free;
  replace with R2 uploads for real rides.
- **Bundle**: the main entry is ~546 kB raw / ~171 kB gzip with secondary pages
  code-split; further trimming is possible by replacing framer-motion where it is not
  essential. The production service worker precaches the built assets, so a reload works
  fully offline (verified).

---

## License

Private prototype built for the PackPulse blueprint. Add a license before publishing.
