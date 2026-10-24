import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ChatChannel, ChatMessage, Club, Expense, Ride } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  channels as mockChannels,
  clubs as mockClubs,
  expenses as mockExpenses,
  messages as mockMessages,
  rides as mockRides,
} from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ------------------------------------------------------------------ *
 * Row mappers — the Postgres schema is snake_case, the UI is camelCase.
 * ------------------------------------------------------------------ */

type DbRow = Record<string, unknown>

const str = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback
const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' ? value : Number(value ?? fallback) || fallback

const coordsOf = (value: unknown, fallback: { lat: number; lng: number }) => {
  if (value && typeof value === 'object') {
    const point = value as { coordinates?: [number, number] }
    if (Array.isArray(point.coordinates) && point.coordinates.length === 2) {
      return { lng: point.coordinates[0], lat: point.coordinates[1] }
    }
  }
  return fallback
}

export const mapRideRow = (row: DbRow): Ride => {
  const participants = Array.isArray(row.participants)
    ? (row.participants as DbRow[])
    : []
  const startTime = str(row.start_time, new Date().toISOString())
  const distanceKm = num(row.distance_km, 120)
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    captainId: str(row.captain_id),
    title: str(row.title, 'Untitled ride'),
    routeSummary: str(row.route_summary, 'Route to be confirmed'),
    description: str(row.description, ''),
    regionScope: row.region_scope === 'Global' ? 'Global' : 'Near Me',
    distanceLabel: str(row.distance_label, `${distanceKm} km`),
    distanceKm,
    startTime,
    meetupLabel: str(row.meetup_label, 'Meetup pinned in chat'),
    meetupCoords: coordsOf(row.meetup_coords, { lat: 30.901, lng: 75.8573 }),
    destinationCoords: coordsOf(row.destination_coords, { lat: 30.8983, lng: 76.9656 }),
    visibility: row.visibility === 'group_only' ? 'group_only' : 'public',
    status:
      row.status === 'ongoing' || row.status === 'completed' ? row.status : 'upcoming',
    maxRiders: num(row.max_riders, 20),
    splitEnabled: Boolean(row.split_enabled ?? true),
    likesCount: num(row.likes_count, 0),
    commentCount: num(row.comment_count, 0),
    hashtags: Array.isArray(row.hashtags) ? (row.hashtags as string[]) : [],
    waypoints: Array.isArray(row.waypoints) ? (row.waypoints as Ride['waypoints']) : [],
    participantIds: participants.map((p) => str(p.user_id)).filter(Boolean),
    art: { palette: 'alpine', seed: startTime.length },
    difficulty: 'Spirited',
  }
}

export const mapClubRow = (row: DbRow): Club => ({
  id: str(row.id),
  name: str(row.name, 'Untitled club'),
  handle: str(row.handle, 'club'),
  description: str(row.description, ''),
  city: str(row.city, 'Unknown'),
  region: row.region === 'Global' ? 'Global' : 'India',
  ridingStyle: str(row.riding_style, 'Cruisers & Touring'),
  badgeEmoji: str(row.badge_emoji, '🏍️'),
  privacy: row.privacy === 'invite_only' ? 'invite_only' : 'public',
  verified: Boolean(row.verified),
  memberCount: num(row.member_count, 0),
  ridingNow: num(row.riding_now, 0),
  accent: '#F43F5E',
  createdBy: str(row.created_by),
  memberIds: [],
  founded: '2024',
})

/* ------------------------------------------------------------------ *
 * Fetchers — each falls back to the seeded dataset on any failure.
 * ------------------------------------------------------------------ */

const fetchRides = async (): Promise<Ride[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(
          '*, participants:ride_participants(user_id, formation_role, rsvp_status)',
        )
        .order('start_time', { ascending: false })
      if (!error && data?.length) return (data as DbRow[]).map(mapRideRow)
    } catch {
      /* offline / misconfigured backend → seeded fallback */
    }
  }
  await sleep(220)
  return mockRides
}

const fetchClubs = async (): Promise<Club[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })
      if (!error && data?.length) return (data as DbRow[]).map(mapClubRow)
    } catch {
      /* fall through */
    }
  }
  await sleep(180)
  return mockClubs
}

const fetchExpenses = async (): Promise<Expense[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('ride_expenses')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data?.length) {
        return (data as DbRow[]).map((row) => ({
          id: str(row.id),
          rideId: str(row.ride_id),
          paidByUserId: str(row.paid_by_user_id),
          title: str(row.title, 'Ride expense'),
          amount: num(row.amount),
          currency: row.currency === 'USD' ? 'USD' : 'INR',
          perRiderShare: num(row.per_rider_share),
          splitCount: num(row.split_count, 1),
          lineItems: Array.isArray(row.line_items)
            ? (row.line_items as Expense['lineItems'])
            : [],
          createdAt: str(row.created_at, new Date().toISOString()),
        }))
      }
    } catch {
      /* fall through */
    }
  }
  await sleep(160)
  return mockExpenses
}

const fetchChannels = async (): Promise<ChatChannel[]> => {
  await sleep(120)
  return mockChannels
}

const fetchMessages = async (): Promise<ChatMessage[]> => {
  await sleep(120)
  return mockMessages
}

export const useRides = () => {
  const localRides = useAppStore((state) => state.localRides)
  const query = useQuery({ queryKey: ['rides'], queryFn: fetchRides, staleTime: 60_000 })
  const data = useMemo(() => [...localRides, ...(query.data ?? [])], [localRides, query.data])
  return { ...query, data }
}

export const useRide = (id: string | null) => {
  const ridesQuery = useRides()
  return {
    ...ridesQuery,
    ride: ridesQuery.data.find((ride) => ride.id === id) ?? null,
    isLoading: ridesQuery.isLoading,
  }
}

export const useClubs = () => {
  const localClubs = useAppStore((state) => state.localClubs)
  const query = useQuery({ queryKey: ['clubs'], queryFn: fetchClubs, staleTime: 60_000 })
  const data = useMemo(() => [...localClubs, ...(query.data ?? [])], [localClubs, query.data])
  return { ...query, data }
}

export const useExpenses = () => {
  const localExpenses = useAppStore((state) => state.expenses)
  const query = useQuery({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
    staleTime: 60_000,
  })
  const data = useMemo(
    () => [...localExpenses, ...(query.data ?? [])],
    [localExpenses, query.data],
  )
  return { ...query, data }
}

export const useChatChannels = () =>
  useQuery({ queryKey: ['channels'], queryFn: fetchChannels, staleTime: 60_000 })

export const useChatMessages = () => {
  const query = useQuery({ queryKey: ['messages'], queryFn: fetchMessages, staleTime: 60_000 })
  const sentMessages = useAppStore((state) => state.sentMessages)
  const data = useMemo(
    () => [...(query.data ?? []), ...sentMessages],
    [query.data, sentMessages],
  )
  return { ...query, data }
}
