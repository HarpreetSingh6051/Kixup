import { useMemo } from 'react'
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Gauge,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Route as RouteIcon,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import type { Participant, Ride } from '@/types'
import {
  Avatar,
  Button,
  Divider,
  EmptyState,
  Panel,
  Pill,
  Stat,
  Verified,
  LiveDot,
} from '@/components/ui'
import { RideArtwork, MiniRouteArt } from '@/components/RideArtwork'
import { LiveRadarMap } from '@/components/LiveRadarMap'
import { useRide, useExpenses, useClubs } from '@/lib/data'
import { clubMap, channels, participants as seedParticipants, profileMap } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { goBack, navigate } from '@/lib/router'
import {
  clockTime,
  copyToClipboard,
  cx,
  dayLabel,
  money,
  pingMeta,
  relativeTime,
} from '@/lib/format'
import { buildGpx, downloadFile } from '@/lib/gpx'
import { getAppUrl } from '@/lib/supabase'

export const buildRoster = (ride: Ride): Participant[] => {
  const seeded = seedParticipants.filter((participant) => participant.rideId === ride.id)
  if (seeded.length) return seeded
  return ride.participantIds.map((userId, index) => ({
    rideId: ride.id,
    userId,
    rsvpStatus: 'going' as const,
    formationRole:
      userId === ride.captainId
        ? 'Road Captain'
        : index === ride.participantIds.length - 1
          ? 'Tail Sweep'
          : 'Pack Member',
    currentSpeedKmh: 0,
    progress: 0,
    gapKm: 0,
    checkedIn: index < 4,
  }))
}

const roleTone: Record<Participant['formationRole'], { color: string; emoji: string }> = {
  'Road Captain': { color: 'text-crimson-300 border-crimson-500/30 bg-crimson-500/10', emoji: '👑' },
  'Tail Sweep': { color: 'text-amber-300 border-amber-400/30 bg-amber-400/10', emoji: '🛡️' },
  'Medic / Toolkit': { color: 'text-pack-400 border-pack-500/30 bg-pack-500/10', emoji: '🩹' },
  'Reel Creator': { color: 'text-violet-300 border-violet-400/30 bg-violet-400/10', emoji: '🎥' },
  'Pack Member': { color: 'text-white/60 border-white/10 bg-white/[0.04]', emoji: '🏍️' },
}

export const RideDetailPage = ({ rideId }: { rideId: string }) => {
  const { ride, isLoading } = useRide(rideId)
  const { data: expenses } = useExpenses()
  const { data: clubs } = useClubs()
  const joinedRideIds = useAppStore((state) => state.joinedRideIds)
  const toggleJoin = useAppStore((state) => state.toggleJoinRide)
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const pushToast = useAppStore((state) => state.pushToast)

  const rideExpenses = useMemo(
    () => expenses.filter((expense) => expense.rideId === rideId),
    [expenses, rideId],
  )
  const roster = useMemo(() => (ride ? buildRoster(ride) : []), [ride])

  if (isLoading && !ride) {
    return (
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-[28px] bg-white/[0.05]" />
        <div className="h-32 animate-pulse rounded-3xl bg-white/[0.04]" />
      </div>
    )
  }

  if (!ride) {
    return (
      <EmptyState
        icon={<RouteIcon className="h-6 w-6" />}
        title="Ride not found"
        description="This route may have been removed, or the club made it invite-only."
        action={
          <Button size="sm" onClick={() => navigate('/feed')}>
            Back to feed
          </Button>
        }
      />
    )
  }

  const club = clubs.find((item) => item.id === ride.clubId) ?? clubMap[ride.clubId]
  const captain = profileMap[ride.captainId]
  const joined = joinedRideIds.includes(ride.id)
  const isLive = ride.status === 'ongoing'
  const isUpcoming = ride.status === 'upcoming'
  const goingCount = roster.length
  const totalSpend = rideExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const channel = channels.find((item) => item.rideId === ride.id)
  const shareUrl = `${getAppUrl()}/#/ride/${ride.id}`
  const familyUrl = `${getAppUrl()}/#/ride/${ride.id}/live?family=1`

  const share = async () => {
    const text = `${ride.title} — ${ride.routeSummary}. ${goingCount}/${ride.maxRiders} riders in. Join the pack on Ride & Roam: ${shareUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: ride.title, text, url: shareUrl })
        return
      } catch {
        /* fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    pushToast('WhatsApp invite opened', 'Share the meetup pin with your group.', 'success')
  }

  const handleJoin = () => {
    if (ride.status === 'completed') {
      pushToast('This ride has finished', 'Join the next Sunday run instead.', 'default')
      return
    }
    if (!joined && goingCount >= ride.maxRiders) {
      pushToast('Pack is full', 'Ask the Road Captain for a waitlist slot.', 'warn')
      return
    }
    toggleJoin(ride.id)
  }

  const downloadGpx = () => {
    if (!isPro) {
      openPaywall('Offline mountain GPX downloads are part of Road Captain PRO.')
      return
    }
    downloadFile(`${ride.id}-ride-and-roam.gpx`, buildGpx(ride))
    pushToast('GPX saved', `${ride.distanceKm} km route is ready for offline navigation.`, 'success')
  }

  const copyFamilyLink = async () => {
    if (!isPro) {
      openPaywall('Family tracking links are part of Road Captain PRO.')
      return
    }
    const ok = await copyToClipboard(familyUrl)
    pushToast(
      ok ? 'Family link copied' : 'Copy failed',
      ok ? 'Anyone with the link can watch the pack live in a browser.' : 'Copy the URL manually from the address bar.',
      ok ? 'success' : 'warn',
    )
  }

  const copyPin = async () => {
    const ok = await copyToClipboard(
      `${ride.meetupLabel} · https://maps.google.com/?q=${ride.meetupCoords.lat},${ride.meetupCoords.lng}`,
    )
    pushToast(ok ? 'Meetup pin copied' : 'Could not copy', ride.meetupLabel, ok ? 'success' : 'warn')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyPin}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:text-white"
          >
            <Copy className="h-3 w-3" /> Meetup pin
          </button>
          <button
            type="button"
            onClick={share}
            aria-label="Share ride"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <RideArtwork art={ride.art} className="h-[248px] w-full sm:h-[320px]" tint={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {isLive ? (
              <Pill tone="live" className="border-pack-400/40 bg-ink-950/70 backdrop-blur-md">
                <LiveDot /> Live now
              </Pill>
            ) : isUpcoming ? (
              <Pill tone="cyan" className="bg-ink-950/70 backdrop-blur-md">Upcoming</Pill>
            ) : (
              <Pill className="bg-ink-950/70 backdrop-blur-md">Completed</Pill>
            )}
            <Pill className="bg-ink-950/70 text-white/65 backdrop-blur-md">
              {ride.visibility === 'public' ? '🔓 Public ride' : '🔒 Club only'}
            </Pill>
          </div>
          <Pill className="bg-ink-950/70 text-white/60 backdrop-blur-md">{ride.difficulty}</Pill>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <button
            type="button"
            onClick={() => navigate('/clubs')}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70 transition hover:text-white"
          >
            <span className="text-sm">{club?.badgeEmoji ?? '🏍️'}</span>
            {club?.name}
            {club?.verified ? <Verified className="h-3.5 w-3.5" /> : null}
          </button>
          <h1 className="mt-1.5 max-w-2xl font-display text-[22px] font-bold leading-[1.12] tracking-tight text-white sm:text-3xl">
            {ride.title}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/50 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-crimson-400" />
              {ride.routeSummary}
            </span>
            <span className="text-white/20">•</span>
            <span>{ride.distanceLabel}</span>
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="space-y-4">
          <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5">
            <Stat
              label="Meetup"
              value={<span className="text-base">{clockTime(ride.startTime)}</span>}
              hint={dayLabel(ride.startTime)}
            />
            <Stat label="Distance" value={`${ride.distanceKm} km`} hint={ride.distanceLabel.replace(/^[\d.]+ km\s?/, '')} />
            <Stat
              label="Checked in"
              value={
                <span className="flex items-baseline gap-1">
                  {goingCount}
                  <span className="text-xs font-medium text-white/35">/{ride.maxRiders}</span>
                </span>
              }
              hint={isLive ? 'live pack' : 'RSVPs'}
            />
            <Stat
              label="Tank split"
              value={ride.splitEnabled ? money(Math.round(totalSpend / Math.max(1, goingCount))) : '—'}
              hint={ride.splitEnabled ? 'per rider' : 'not enabled'}
              accent={ride.splitEnabled ? 'text-pack-400' : 'text-white'}
            />
          </Panel>

          {/* Primary contextual CTA — the only gateway to the live map */}
          {isLive ? (
            <div className="relative overflow-hidden rounded-[26px] border border-pack-500/30 bg-gradient-to-br from-emerald-500/16 via-emerald-500/[0.06] to-ink-900 p-4 sm:p-5">
              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-pack-500/20 blur-3xl" />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-pack-400">
                    <LiveDot /> Pack is moving
                  </p>
                  <p className="mt-1.5 font-display text-base font-semibold text-white sm:text-lg">
                    {goingCount} riders on the route right now
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                    Live GPS radar, pack spread alerts and one-tap glove pings.
                  </p>
                </div>
                <Button
                  variant="success"
                  size="lg"
                  className="shrink-0"
                  icon={<Navigation className="h-4 w-4" />}
                  onClick={() => navigate(`/ride/${ride.id}/live`)}
                >
                  Go to Ongoing Live Ride Map
                </Button>
              </div>
            </div>
          ) : (
            <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  <Lock className="h-3 w-3" /> Live radar locked
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isUpcoming
                    ? 'The map unlocks when the Road Captain starts the ride'
                    : 'This ride has finished — radar replay is in the recap'}
                </p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {isUpcoming
                    ? `Starts ${dayLabel(ride.startTime)} at ${clockTime(ride.startTime)}`
                    : 'Ask the captain for the group-only replay link.'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CalendarPlus className="h-3.5 w-3.5" />}
                  onClick={() =>
                    pushToast(
                      'Reminder set',
                      `We will ping you 1 hour before ${dayLabel(ride.startTime)}.`,
                      'success',
                    )
                  }
                >
                  Remind me
                </Button>
                <Button size="sm" onClick={handleJoin} disabled={ride.status === 'completed'}>
                  {joined ? '✓ Going' : '+ Join ride'}
                </Button>
              </div>
            </Panel>
          )}

          {/* Route */}
          <Panel className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Route & waypoints</p>
                <h2 className="mt-1 font-display text-base font-semibold text-white">
                  {ride.routeSummary}
                </h2>
              </div>
              <MiniRouteArt seed={ride.art.seed} accent={club?.accent ?? '#F43F5E'} />
            </div>

            <div className="mt-4 space-y-0">
              {ride.waypoints.map((waypoint, index) => {
                const isLast = index === ride.waypoints.length - 1
                return (
                  <div key={`${waypoint.label}-${index}`} className="flex gap-3">
                    <div className="flex w-4 flex-col items-center">
                      <span
                        className={cx(
                          'mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2',
                          index === 0
                            ? 'border-crimson-400 bg-crimson-500/40'
                            : isLast
                              ? 'border-cyber-400 bg-cyber-400/30'
                              : 'border-white/25 bg-ink-800',
                        )}
                      />
                      {!isLast ? <span className="my-0.5 w-px flex-1 bg-white/10" /> : null}
                    </div>
                    <div className={cx('min-w-0 flex-1', !isLast && 'pb-4')}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-white/85">{waypoint.label}</p>
                        <span className="shrink-0 font-mono text-[10px] text-white/30">
                          {waypoint.km} km
                        </span>
                      </div>
                      {waypoint.note ? (
                        <p className="mt-0.5 text-[10px] text-white/35">{waypoint.note}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <Divider className="my-4" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] text-white/35">
                <ShieldCheck className="h-3.5 w-3.5 text-pack-400" />
                Marshalled ride · sweep keeps the slowest rider in sight
              </p>
              <Button
                size="xs"
                variant={isPro ? 'secondary' : 'ghost'}
                icon={isPro ? <Download className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5 text-amber-300" />}
                onClick={downloadGpx}
              >
                {isPro ? 'Offline GPX' : 'GPX (PRO)'}
              </Button>
            </div>
          </Panel>

          {/* Roster */}
          <Panel className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Pack formation</p>
                <h2 className="mt-1 font-display text-base font-semibold text-white">
                  Check-in roster
                </h2>
              </div>
              <Pill tone="cyan">{goingCount} / {ride.maxRiders}</Pill>
            </div>

            <div className="mt-3 space-y-1">
              {roster.map((participant) => {
                const profile = profileMap[participant.userId]
                if (!profile) return null
                const tone = roleTone[participant.formationRole]
                return (
                  <div
                    key={participant.userId}
                    className="flex items-center gap-3 rounded-2xl px-1.5 py-2 transition hover:bg-white/[0.03]"
                  >
                    <Avatar
                      name={profile.fullName}
                      accent={profile.accent}
                      size="sm"
                      live={isLive && participant.checkedIn}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-white">
                        {profile.fullName}
                        {participant.userId === ride.captainId ? (
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                        ) : null}
                        {participant.userId === 'u_arjun' ? (
                          <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-bold text-white/50">
                            YOU
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-white/35">{profile.primaryBike}</p>
                    </div>
                    {isLive && participant.currentSpeedKmh ? (
                      <span className="hidden shrink-0 items-center gap-1 font-mono text-[10px] text-cyber-300 sm:flex">
                        <Gauge className="h-3 w-3" />
                        {participant.currentSpeedKmh}
                      </span>
                    ) : null}
                    {participant.lastPingType ? (
                      <span
                        className={cx(
                          'shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px]',
                          pingMeta[participant.lastPingType].tone,
                        )}
                      >
                        {pingMeta[participant.lastPingType].emoji}{' '}
                        <span className="hidden sm:inline">
                          {pingMeta[participant.lastPingType].label}
                        </span>
                      </span>
                    ) : null}
                    <span
                      className={cx(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                        tone.color,
                      )}
                    >
                      <span className="mr-1">{tone.emoji}</span>
                      <span className="hidden sm:inline">{participant.formationRole}</span>
                    </span>
                    {participant.checkedIn ? (
                      <CheckCircle2 className="hidden h-3.5 w-3.5 shrink-0 text-pack-400 sm:block" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* About + spend */}
          <Panel className="p-4 sm:p-5">
            <p className="label">Road Captain's brief</p>
            <p className="mt-2 text-xs leading-relaxed text-white/55">{ride.description}</p>

            {ride.splitEnabled ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-pack-400">
                      <Sparkles className="h-3 w-3" /> AI tank split
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-white">
                      {money(totalSpend)}
                      <span className="ml-1.5 text-[10px] font-medium text-white/35">
                        / {money(Math.round(totalSpend / Math.max(1, goingCount)))} per rider
                      </span>
                    </p>
                  </div>
                  <Button size="xs" variant="secondary" onClick={() => navigate('/garage')}>
                    Open kitty
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {rideExpenses.slice(0, 3).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate text-white/45">{expense.title}</span>
                      <span className="shrink-0 font-mono text-white/60">{money(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <Panel className="p-4">
            <p className="label">Road Captain</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={captain.fullName} accent={captain.accent} size="lg" ring live={isLive} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {captain.fullName}
                  {captain.isPro ? <Crown className="h-3.5 w-3.5 text-amber-300" /> : null}
                </p>
                <p className="text-[10px] text-white/35">@{captain.handle}</p>
                <p className="mt-0.5 truncate text-[10px] text-white/45">{captain.primaryBike}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'rides', value: `${Math.round(captain.totalKm / 42)}` },
                { label: 'followers', value: `${(captain.followers / 1000).toFixed(1)}k` },
                { label: 'km', value: `${(captain.totalKm / 1000).toFixed(0)}k` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] py-2">
                  <p className="font-display text-xs font-bold text-white">{item.value}</p>
                  <p className="text-[8px] uppercase tracking-wider text-white/30">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="xs"
                full
                variant="secondary"
                icon={<MessageCircle className="h-3.5 w-3.5" />}
                onClick={() => navigate(channel ? `/chat/${channel.id}` : '/chat')}
              >
                Pack chat
              </Button>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => navigate('/garage')}
                className="shrink-0"
              >
                Profile
              </Button>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <LiveRadarMap
              ride={ride}
              riders={[]}
              variant="mini"
              className="h-[142px] rounded-none border-0"
            />
            <div className="p-4">
              <p className="label">Meetup point</p>
              <p className="mt-1.5 text-xs font-semibold leading-snug text-white">
                {ride.meetupLabel}
              </p>
              <p className="mt-1 text-[10px] text-white/35">
                {dayLabel(ride.startTime)} · {clockTime(ride.startTime)} · arrive 15 min early
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  full
                  icon={<ExternalLink className="h-3 w-3" />}
                  onClick={() =>
                    window.open(
                      `https://maps.google.com/?q=${ride.meetupCoords.lat},${ride.meetupCoords.lng}`,
                      '_blank',
                      'noopener',
                    )
                  }
                >
                  Open maps
                </Button>
                <Button size="xs" variant="ghost" onClick={copyPin} className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="label">Share the run</p>
            <div className="mt-3 space-y-2">
              <Button size="sm" variant="secondary" full icon={<Share2 className="h-3.5 w-3.5" />} onClick={share}>
                WhatsApp invite
              </Button>
              <button
                type="button"
                onClick={copyFamilyLink}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20"
              >
                <Link2 className="h-4 w-4 shrink-0 text-cyber-300" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                    Family tracking link
                    {!isPro ? <Crown className="h-3 w-3 text-amber-300" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/35">
                    Live web view · no app install
                  </span>
                </span>
              </button>
              <Button
                size="sm"
                full
                variant={joined ? 'secondary' : 'primary'}
                onClick={handleJoin}
                disabled={ride.status === 'completed'}
              >
                {ride.status === 'completed'
                  ? 'Ride completed'
                  : joined
                    ? '✓ You are in the pack'
                    : '+ Join this ride'}
              </Button>
            </div>
          </Panel>

          <Panel className="border-white/[0.06] p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <Users className="h-3.5 w-3.5" /> Who else is in
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {roster.slice(0, 8).map((participant) => {
                const profile = profileMap[participant.userId]
                if (!profile) return null
                return (
                  <div key={participant.userId} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] py-0.5 pl-0.5 pr-2">
                    <Avatar name={profile.fullName} accent={profile.accent} size="xs" />
                    <span className="text-[9px] font-medium text-white/50">
                      {profile.fullName.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
            {joined ? (
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-pack-400">
                <CheckCircle2 className="h-3 w-3" /> You are checked in
              </p>
            ) : null}
          </Panel>

          <p className="px-1 text-center text-[10px] leading-relaxed text-white/20">
            Ride {ride.status === 'ongoing' ? 'started' : 'starts'} {relativeTime(ride.startTime)} ·{' '}
            {ride.commentCount} comments in pack chat
          </p>
        </aside>
      </div>
    </div>
  )
}
