# AGENTS.md — working notes for Ride & Roam (PackPulse)

Read `CLAUDE.md` for the product blueprint and `README.md` for setup/deployment.
This file is the short version for anyone (human or agent) changing the code.

## Commands

```bash
npm install
npm run dev        # Vite, port 5173
npm run typecheck  # tsc --noEmit — must stay clean
npm run build      # typecheck + production build
```

There is no test runner yet. Verify changes with `npm run typecheck`, `npm run build`,
and a manual pass through `#/feed` → `#/ride/r_sunrise` → `#/ride/r_sunrise/live` →
`#/clubs` → `#/chat` → `#/create` → `#/garage`.

## Stack reality check

React 19 · Vite 8 · TypeScript 7 · Tailwind 3.4 · TanStack Query 5 · Zustand 5 ·
Supabase JS 2 · framer-motion 14 · lucide-react.

- TypeScript 7 **does not allow `baseUrl`**. The `@/*` alias comes from `paths` with
  relative targets in `tsconfig.json` plus the Vite `resolve.alias` in `vite.config.ts`.
- Style: no semicolons, single quotes, arrow-function components, `cx()` from
  `src/lib/format.ts` for conditional classes.
- Icons: `lucide-react` only. No icon fonts or raster UI assets (Tauri app icons are the
  only committed PNGs).

## Architecture rules

1. **Demo mode is sacred.** `src/lib/data.ts` must always fall back to `mockData.ts`
   when Supabase is missing or errors. Never add a code path that requires keys to render.
2. **One design system.** Compose from `src/components/ui.tsx` (Button, Modal, Sheet,
   Avatar, Segmented, Badge, Field, EmptyState, Stat…). Don't fork button styles.
3. **The live map lives inside a ride.** Do not add it to the bottom dock or a top-level
   route. Entry is `#/ride/:id/live` only.
4. **Hash routing.** Add routes in `src/lib/router.tsx` (`parse`, `RouteName`) and render
   them in `src/App.tsx`. `navigate()` / `ridePath()` / `liveRidePath()` are the helpers.
   New secondary pages should be `React.lazy`-loaded like the existing ones.
5. **State split.** Server-shaped data goes through TanStack Query hooks in `lib/data.ts`.
   Client/session state (PRO, joins, likes, flags, toasts, paywall) lives in
   `src/store/useAppStore.ts` and is persisted — be careful with migrations of that shape.
6. **PRO gating** is checked with `useAppStore().isPro` and opened via `openPaywall()`.
   Any new gated feature should still show a usable preview in demo mode.
7. **Offline-safe media.** Artwork is generated SVG (`RideArtwork.tsx`), exhaust audio is
   synthesized (`exhaustAudio.ts`). Prefer this over remote URLs in demo flows.

## Gotchas

- `useLiveRide` needs a **memoized** participant array from the caller (see `FeedPage`,
  `LiveRidePage`). Passing a fresh array each render resets simulation state in a loop.
- `AnimatePresence mode="wait"` keys pages by route + id; keep keys stable.
- The app intentionally renders without `VITE_*` keys. Don't add startup throws.
- `src-tauri/target` and `src-tauri/gen` are gitignored; icons in `src-tauri/icons`
  are committed.
- `.env` is gitignored and may contain local keys — never overwrite it.

## Supabase

Run migrations in this exact order (RLS depends on helper functions):

```text
001_initial_schema.sql
002_functions_triggers.sql   # is_club_member, can_view_ride, RPCs, triggers
003_rls_policies.sql         # policies + execute grants
004_storage.sql              # buckets + storage.objects policies
```

- `SECURITY DEFINER` helpers in `002` intentionally bypass RLS to avoid recursive
  policy lookups. If you add a policy, reuse them instead of joining membership tables.
- `ride_share_snapshot(uuid)` is granted to `anon` by design (UUID token = capability,
  payload excludes PII). Don't widen other RPC grants without thinking about it.
- Storage object paths must start with the owner's uuid: `{bucket}/{user_id}/…`.
- New realtime tables need `alter publication supabase_realtime add table …` and,
  for filtered updates, `replica identity full`.

## Where things live

| Need | File |
| --- | --- |
| Domain types | `src/types.ts` |
| Seed world | `src/lib/mockData.ts` |
| Query hooks / row mappers | `src/lib/data.ts` |
| Gemini prompts + fallbacks | `src/lib/gemini.ts` |
| Live simulation | `src/hooks/useLiveRide.ts` |
| Radar rendering | `src/components/LiveRadarMap.tsx` |
| Design primitives | `src/components/ui.tsx` |
| Paywall + pricing | `src/components/PaywallModal.tsx` |
| Entitlements/flags | `src/store/useAppStore.ts` |

## Definition of done

- `npm run typecheck` and `npm run build` pass.
- Demo mode still works with an empty `.env`.
- Mobile layout (375 px) and desktop (1280 px) both hold up; touch targets ≥ 44 px.
- New copy matches the voice: terse, rider-native, no corporate filler.
- Update `README.md` when you add a route, env var, script or platform step.
