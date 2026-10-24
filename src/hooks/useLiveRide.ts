import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LatLng, LiveRiderState, Participant, PingType, Ride } from '@/types'
import { haversineKm } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'

const DEMO_TIME_SCALE = 26
const TICK_MS = 2200

const nextProgress = (progress: number, speedKmh: number, distanceKm: number) => {
  const deltaKm = (speedKmh / 3600) * (TICK_MS / 1000) * DEMO_TIME_SCALE
  const next = progress + deltaKm / Math.max(distanceKm, 1)
  // Hold just short of the finish so the live ride never "ends" mid-demo.
  return next > 0.975 ? 0.968 + Math.random() * 0.006 : next
}

const jitterSpeed = (speed: number, role: Participant['formationRole']) => {
  const base = role === 'Road Captain' ? 82 : role === 'Tail Sweep' ? 68 : 75
  const drift = (Math.random() - 0.5) * 6
  return Math.round(Math.min(104, Math.max(48, speed * 0.7 + base * 0.3 + drift)))
}

/**
 * Live pack simulation. In `live` mode this is where you would subscribe to
 * `ride_participants` via Supabase Realtime (`postgres_changes` on last_coords)
 * and simply replace the ticker payload with the socket payload.
 */
export const useLiveRide = (ride: Ride | null, seedParticipants: Participant[]) => {
  const pings = useAppStore((state) => state.pings)
  const [participants, setParticipants] = useState<Participant[]>(seedParticipants)

  useEffect(() => {
    setParticipants(seedParticipants.map((p) => ({ ...p })))
  }, [seedParticipants])

  useEffect(() => {
    if (!ride || ride.status !== 'ongoing') return
    const timer = window.setInterval(() => {
      setParticipants((current) =>
        current.map((participant) => ({
          ...participant,
          progress: nextProgress(participant.progress, participant.currentSpeedKmh, ride.distanceKm),
          currentSpeedKmh: jitterSpeed(participant.currentSpeedKmh, participant.formationRole),
          lastPingType:
            pings.find((ping) => ping.userId === participant.userId)?.type ??
            participant.lastPingType,
        })),
      )
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [ride, pings])

  const riders = useMemo<LiveRiderState[]>(() => {
    if (!ride) return []
    const leadProgress = Math.max(...participants.map((p) => p.progress), 0)

    return participants
      .map((participant, index) => {
        const t = Math.min(1, Math.max(0, participant.progress))
        // Slight lateral offset so overlapping markers stay readable.
        const laneOffset = ((index % 3) - 1) * 0.0022
        const coords: LatLng = {
          lat:
            ride.meetupCoords.lat +
            (ride.destinationCoords.lat - ride.meetupCoords.lat) * t +
            laneOffset,
          lng:
            ride.meetupCoords.lng +
            (ride.destinationCoords.lng - ride.meetupCoords.lng) * t -
            laneOffset * 1.4,
        }
        return {
          userId: participant.userId,
          formationRole: participant.formationRole,
          progress: t,
          speedKmh: participant.currentSpeedKmh,
          gapKm: Math.max(0, (leadProgress - t) * ride.distanceKm),
          coords,
          lastPingType: participant.lastPingType,
          isLead: participant.progress === leadProgress,
        }
      })
      .sort((a, b) => b.progress - a.progress)
  }, [participants, ride])

  const lead = riders[0] ?? null
  const sweep = riders[riders.length - 1] ?? null
  const spreadKm = useMemo(() => {
    if (!lead || !sweep || riders.length < 2) return 0
    return haversineKm(lead.coords, sweep.coords) * 1.35
  }, [lead, sweep, riders.length])

  const broadcastPing = useCallback(
    (userId: string, type: PingType) => {
      setParticipants((current) =>
        current.map((participant) =>
          participant.userId === userId ? { ...participant, lastPingType: type } : participant,
        ),
      )
    },
    [],
  )

  return {
    riders,
    lead,
    sweep,
    spreadKm,
    /** PRO fall-behind alert threshold from the blueprint: 2.0 km */
    isSweepDropped: spreadKm > 2,
    broadcastPing,
  }
}
