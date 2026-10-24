import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Crown,
  Gauge,
  Link2,
  Navigation,
  Radio,
  Share2,
  Siren,
  Users,
  Volume2,
} from 'lucide-react'
import type { PingType } from '@/types'
import {
  Avatar,
  Button,
  EmptyState,
  LiveDot,
  Panel,
  Pill,
  ProgressBar,
} from '@/components/ui'
import { LiveRadarMap } from '@/components/LiveRadarMap'
import { useRide } from '@/lib/data'
import { channels, currentUserId, participants as seedParticipants, profileMap, seedPings } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { useLiveRide } from '@/hooks/useLiveRide'
import { goBack, navigate } from '@/lib/router'
import { clockTime, copyToClipboard, cx, money, pingMeta, relativeTime, uid } from '@/lib/format'
import { getAppUrl } from '@/lib/supabase'

const pingButtons: Array<{
  type: PingType
  emoji: string
  label: string
  hint: string
  classes: string
}> = [
  {
    type: 'FUEL STOP',
    emoji: '⛽',
    label: 'FUEL STOP',
    hint: 'Next pump in 2 km',
    classes: 'border-amber-400/30 bg-amber-400/[0.08] hover:border-amber-300/60',
  },
  {
    type: 'CHAI BREAK',
    emoji: '☕',
    label: 'CHAI BREAK',
    hint: '20 min halt',
    classes: 'border-orange-400/30 bg-orange-400/[0.08] hover:border-orange-300/60',
  },
  {
    type: 'HAZARD',
    emoji: '🚨',
    label: 'HAZARD / STOP',
    hint: 'Gravel · police · crash',
    classes: 'border-rose-500/40 bg-rose-500/[0.1] hover:border-rose-400/70',
  },
  {
    type: 'ALL CLEAR',
    emoji: '⚡',
    label: 'ALL CLEAR',
    hint: 'Rolling again',
    classes: 'border-emerald-400/35 bg-emerald-400/[0.09] hover:border-emerald-300/70',
  },
]

export const LiveRidePage = ({
  rideId,
  familyView = false,
}: {
  rideId: string
  familyView?: boolean
}) => {
  const { ride, isLoading } = useRide(rideId)
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const pushToast = useAppStore((state) => state.pushToast)
  const addPing = useAppStore((state) => state.addPing)
  const addMessage = useAppStore((state) => state.addMessage)
  const pings = useAppStore((state) => state.pings)
  const [followLead, setFollowLead] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const seed = useMemo(
    () => seedParticipants.filter((participant) => participant.rideId === rideId),
    [rideId],
  )
  const { riders, spreadKm, lead, sweep, isSweepDropped, broadcastPing } = useLiveRide(ride, seed)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const me = profileMap[currentUserId]
  const rideChannel = channels.find((channel) => channel.rideId === rideId)
  const familyUrl = `${getAppUrl()}/#/ride/${rideId}/live?family=1`

  if (isLoading && !ride) {
    return <div className="h-80 animate-pulse rounded-[28px] bg-white/[0.05]" />
  }

  if (!ride) {
    return (
      <EmptyState
        icon={<Navigation className="h-6 w-6" />}
        title="Radar unavailable"
        description="This live ride has ended or the club made the radar group-only."
        action={
          <Button size="sm" onClick={() => navigate('/feed')}>
            Back to feed
          </Button>
        }
      />
    )
  }

  const elapsedMin = Math.max(
    1,
    Math.round((now - new Date(ride.startTime).getTime()) / 60_000),
  )
  const coveredKm = Math.round((lead?.progress ?? 0) * ride.distanceKm)
  const avgSpeed = Math.round(
    riders.length ? riders.reduce((sum, rider) => sum + rider.speedKmh, 0) / riders.length : 0,
  )
  const livePings = [...seedPings, ...pings]
    .filter((ping) => ping.rideId === rideId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const sendPing = (type: PingType) => {
    addPing({
      id: uid('ping'),
      rideId,
      userId: currentUserId,
      type,
      createdAt: new Date().toISOString(),
    })
    broadcastPing(currentUserId, type)
    if (rideChannel) {
      addMessage({
        id: uid('msg'),
        channelId: rideChannel.id,
        senderId: currentUserId,
        text: type,
        kind: 'ping',
        createdAt: new Date().toISOString(),
        mine: true,
      })
    }
    if (navigator.vibrate) navigator.vibrate(type === 'HAZARD' ? [40, 60, 40] : 30)
    pushToast(
      `${pingMeta[type].emoji} ${pingMeta[type].label} broadcast`,
      `${riders.length} riders in the pack were pinged instantly.`,
      type === 'HAZARD' ? 'danger' : type === 'ALL CLEAR' ? 'success' : 'default',
    )
  }

  const copyFamily = async () => {
    if (!isPro) {
      openPaywall('Family tracking links are part of Road Captain PRO.')
      return
    }
    const ok = await copyToClipboard(familyUrl)
    pushToast(
      ok ? 'Family link copied' : 'Copy failed',
      ok ? 'Send it to family — they can watch in any browser.' : familyUrl,
      ok ? 'success' : 'warn',
    )
  }

  const regroup = () => {
    if (rideChannel) {
      addMessage({
        id: uid('msg'),
        channelId: rideChannel.id,
        senderId: currentUserId,
        text: 'REGROUP: lead group slowing to 55 km/h. Sweep, acknowledge when you see the pack.',
        kind: 'text',
        createdAt: new Date().toISOString(),
        mine: true,
      })
    }
    sendPing('ALL CLEAR')
    pushToast('Regroup broadcast sent', 'Lead is slowing. Sweep has 90 seconds to catch up.', 'success')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Ride details
        </button>
        <div className="flex items-center gap-2">
          <Pill tone="live" className="bg-ink-950/60">
            <LiveDot /> {riders.length} riders
          </Pill>
          <button
            type="button"
            onClick={copyFamily}
            aria-label="Copy family tracking link"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          {ride.title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-pack-400" /> {ride.routeSummary}
          </span>
          <span className="text-white/15">•</span>
          <span>Started {clockTime(ride.startTime)}</span>
          <span className="text-white/15">•</span>
          <span>{coveredKm} of {ride.distanceKm} km covered</span>
        </p>
      </div>

      <div className="relative">
        <LiveRadarMap
          ride={ride}
          riders={riders}
          variant="full"
          className="h-[46vh] min-h-[330px] w-full sm:h-[420px] lg:h-[500px]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
          <div className="pointer-events-auto flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-ink-950/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-rose-300 backdrop-blur">
              <Radio className="h-3 w-3 animate-pulse" /> Live gps radar
            </span>
            {familyView ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyber-400/30 bg-ink-950/80 px-2.5 py-1 text-[9px] font-semibold text-cyber-300 backdrop-blur">
                Family view · read only
              </span>
            ) : null}
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setFollowLead((value) => !value)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold backdrop-blur transition',
                followLead
                  ? 'border-cyber-400/40 bg-ink-950/80 text-cyber-300'
                  : 'border-white/15 bg-ink-950/80 text-white/50',
              )}
            >
              <Gauge className="h-3 w-3" /> Follow lead {followLead ? 'on' : 'off'}
            </button>
            <span className="rounded-full border border-white/10 bg-ink-950/80 px-2 py-1 font-mono text-[9px] text-white/45 backdrop-blur">
              updated 2s ago
            </span>
          </div>
        </div>

        {isSweepDropped ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-ink-950/90 px-3 py-2.5 backdrop-blur-xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                <Siren className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
                  {isPro ? 'Sweep fall-behind alert' : 'Fall-behind detected · PRO alert'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/60">
                  {sweep ? profileMap[sweep.userId]?.fullName : 'Tail sweep'} is{' '}
                  {spreadKm.toFixed(1)} km behind the lead.
                </p>
              </div>
              {isPro ? (
                <Button size="xs" variant="danger" className="shrink-0" onClick={regroup}>
                  Regroup
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="secondary"
                  className="shrink-0"
                  icon={<Crown className="h-3 w-3 text-amber-300" />}
                  onClick={() => openPaywall('Instant fall-behind alerts keep the sweep safe.')}
                >
                  PRO
                </Button>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Pack spread', value: `${spreadKm.toFixed(1)} km`, tone: spreadKm > 2 ? 'text-rose-400' : 'text-pack-400' },
          { label: 'Lead speed', value: `${lead?.speedKmh ?? 0} km/h`, tone: 'text-cyber-300' },
          { label: 'Pack average', value: `${avgSpeed} km/h`, tone: 'text-white' },
          { label: 'Ride time', value: `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`, tone: 'text-white' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{item.label}</p>
            <p className={cx('mt-1 font-display text-base font-bold', item.tone)}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {!familyView ? (
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">One-tap glove pings</p>
                  <h2 className="mt-1 font-display text-base font-semibold text-white">
                    Broadcast to the whole pack
                  </h2>
                </div>
                <span className="hidden items-center gap-1.5 text-[10px] text-white/30 sm:flex">
                  <Volume2 className="h-3.5 w-3.5" /> haptic + sound
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {pingButtons.map((button) => (
                  <motion.button
                    key={button.type}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => sendPing(button.type)}
                    className={cx(
                      'flex h-[86px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center transition',
                      button.classes,
                    )}
                  >
                    <span className="text-xl leading-none">{button.emoji}</span>
                    <span className="text-[10px] font-bold tracking-wide text-white">{button.label}</span>
                    <span className="hidden text-[9px] text-white/35 sm:block">{button.hint}</span>
                  </motion.button>
                ))}
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/30">
                <CheckCircle2 className="h-3 w-3 text-pack-400" /> Sent from {me.fullName} · Road
                Captain · broadcasts to {riders.length} riders
              </p>
            </Panel>
          ) : (
            <Panel className="border-cyber-400/20 bg-cyber-500/[0.04] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-cyber-300">
                <Link2 className="h-4 w-4" /> Family tracking view
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                You are watching a read-only live view shared by the Road Captain. Pack chat, pings
                and expense tools are hidden on this link.
              </p>
            </Panel>
          )}

          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Live activity</p>
                <h2 className="mt-1 font-display text-base font-semibold text-white">
                  Pack pings
                </h2>
              </div>
              <Pill tone="live">{livePings.length} recent</Pill>
            </div>

            <div className="mt-3 space-y-2.5">
              {livePings.length ? (
                livePings.map((ping) => {
                  const profile = profileMap[ping.userId]
                  const meta = pingMeta[ping.type]
                  return (
                    <div key={ping.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm">
                        {meta.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-snug">
                          <span className="font-semibold text-white">
                            {profile?.fullName ?? 'Rider'}
                          </span>{' '}
                          <span className={meta.tone}>{meta.label.toLowerCase()}</span>
                        </p>
                        <p className="mt-0.5 text-[9px] text-white/25">
                          {relativeTime(ping.createdAt)} · {ride.distanceKm} km route
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="py-4 text-center text-[11px] text-white/30">
                  No pings yet. Tap a glove button to broadcast.
                </p>
              )}
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Tank kitty</p>
                <h2 className="mt-1 font-display text-base font-semibold text-white">
                  Split running total
                </h2>
              </div>
              <Button size="xs" variant="secondary" onClick={() => navigate('/garage')}>
                Open
              </Button>
            </div>
            <div className="mt-3 flex items-end justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <p className="font-display text-xl font-bold text-white">
                  {money(7890)}
                  <span className="ml-1.5 text-[10px] font-medium text-white/35">spent today</span>
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  {money(Math.round(7890 / Math.max(1, riders.length)))} per rider ·{' '}
                  {riders.length} checked in
                </p>
              </div>
              <ProgressBar value={64} tone="cyan" className="w-24" />
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Users className="h-3.5 w-3.5" /> Pack on the radar
              </p>
              <span className="font-mono text-[9px] text-white/25">{riders.length} live</span>
            </div>
            <div className="mt-2.5 space-y-0.5">
              {riders.map((rider) => {
                const profile = profileMap[rider.userId]
                if (!profile) return null
                const dropped = rider.gapKm > 2 && !rider.isLead
                return (
                  <div
                    key={rider.userId}
                    className={cx(
                      'flex items-center gap-2 rounded-xl px-1.5 py-1.5',
                      dropped && 'bg-rose-500/[0.06]',
                    )}
                  >
                    <Avatar
                      name={profile.fullName}
                      accent={profile.accent}
                      size="sm"
                      live
                      ring={rider.isLead}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-white">
                        {profile.fullName.split(' ')[0]}
                        {rider.isLead ? (
                          <span className="ml-1 rounded bg-cyber-400/15 px-1 text-[8px] font-bold text-cyber-300">
                            LEAD
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[9px] text-white/30">{rider.formationRole}</p>
                    </div>
                    <div className="text-right">
                      <p className={cx('font-mono text-[10px] font-semibold', dropped ? 'text-rose-400' : 'text-white/70')}>
                        {dropped ? `-${rider.gapKm.toFixed(1)} km` : `${rider.speedKmh}`}
                      </p>
                      <p className="text-[8px] text-white/25">{dropped ? 'behind' : 'km/h'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="label">Family tracking link</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Send this to family. It opens in any browser with no install and auto-expires when
              the ride ends.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-950/60 px-2.5 py-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-cyber-300" />
              <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-white/35">
                {familyUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="xs"
                full
                variant={isPro ? 'secondary' : 'ghost'}
                onClick={copyFamily}
                icon={isPro ? undefined : <Crown className="h-3 w-3 text-amber-300" />}
              >
                Copy link
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="shrink-0"
                onClick={() =>
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Watch our ride live: ${familyUrl}`)}`, '_blank', 'noopener')
                }
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Panel>

          {!familyView ? (
            <Panel className="p-4">
              <p className="label">Captain controls</p>
              <div className="mt-2.5 space-y-2">
                <Button
                  size="sm"
                  full
                  variant="secondary"
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
                  onClick={regroup}
                >
                  Broadcast regroup
                </Button>
                <Button
                  size="sm"
                  full
                  variant="secondary"
                  icon={<Navigation className="h-3.5 w-3.5" />}
                  onClick={() => navigate(`/ride/${ride.id}`)}
                >
                  Ride briefing & roster
                </Button>
                <Button
                  size="sm"
                  full
                  variant="ghost"
                  onClick={() => navigate('/chat')}
                  trailingIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Open pack chat
                </Button>
              </div>
            </Panel>
          ) : null}

          <p className="px-1 text-center text-[10px] leading-relaxed text-white/20">
            GPS positions are simulated in demo mode. Wire Supabase Realtime on
            <span className="font-mono"> ride_participants </span>
            to go live.
          </p>
        </aside>
      </div>
    </div>
  )
}
