import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgePercent,
  CalendarPlus,
  Compass,
  Crown,
  Flame,
  Globe2,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { StoriesBar } from '@/components/StoriesBar'
import { OngoingRideBanner } from '@/components/OngoingRideBanner'
import { RideCard, RideCardSkeleton } from '@/components/RideCard'
import { RideArtwork } from '@/components/RideArtwork'
import { LiveRadarMap } from '@/components/LiveRadarMap'
import {
  Button,
  EmptyState,
  LiveDot,
  Panel,
  Pill,
  ProgressBar,
  SectionHeading,
  Segmented,
  Verified,
} from '@/components/ui'
import { clubMap, currentUserId, participants as seedParticipants, profileMap } from '@/lib/mockData'
import { useClubs, useRides } from '@/lib/data'
import { useAppStore } from '@/store/useAppStore'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useLiveRide } from '@/hooks/useLiveRide'
import { navigate } from '@/lib/router'
import { cx, haversineKm, meetupLabel, relativeTime } from '@/lib/format'

export const FeedPage = () => {
  const { data: rides, isLoading } = useRides()
  const { data: clubs } = useClubs()
  const scope = useAppStore((state) => state.scope)
  const setScope = useAppStore((state) => state.setScope)
  const privacy = useAppStore((state) => state.privacy)
  const setPrivacy = useAppStore((state) => state.setPrivacy)
  const joinedClubIds = useAppStore((state) => state.joinedClubIds)
  const joinedRideIds = useAppStore((state) => state.joinedRideIds)
  const flags = useAppStore((state) => state.flags)
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const toggleJoinClub = useAppStore((state) => state.toggleJoinClub)
  const pushToast = useAppStore((state) => state.pushToast)

  const geo = useGeolocation()
  const [dismissedPromo, setDismissedPromo] = useState(false)

  const me = profileMap[currentUserId]
  const onlineRiders = clubs.reduce((total, club) => total + club.ridingNow, 0)

  const filtered = useMemo(() => {
    let list = [...rides]

    if (scope === 'global') {
      list = list.filter((ride) => ride.regionScope === 'Global')
    } else if (scope === 'near') {
      list = list.filter((ride) => {
        if (ride.regionScope !== 'Near Me') return false
        if (!geo.coords) return true
        return haversineKm(geo.coords, ride.meetupCoords) < 400
      })
    }

    if (privacy === 'public') list = list.filter((ride) => ride.visibility === 'public')
    if (privacy === 'groups') list = list.filter((ride) => joinedClubIds.includes(ride.clubId))

    const rank = { ongoing: 0, upcoming: 1, completed: 2 }
    return list.sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })
  }, [rides, scope, privacy, joinedClubIds, geo.coords])

  const liveRide = rides.find((ride) => ride.status === 'ongoing') ?? null

  const handleScope = (value: 'all' | 'near' | 'global') => {
    setScope(value)
    if (value === 'near') {
      geo.request()
      if (geo.status === 'denied') {
        pushToast(
          'Using your saved city',
          'Location was blocked — showing rides around Ludhiana instead.',
          'warn',
        )
      }
    }
  }

  return (
    <div className="space-y-6">
      <FeedHero
        name={me.fullName.split(' ')[0]}
        onlineRiders={onlineRiders}
        liveCount={rides.filter((ride) => ride.status === 'ongoing').length}
        clubCount={clubs.length}
      />

      <StoriesBar />

      <OngoingRideBanner />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-crimson-400" />
            <h2 className="font-display text-sm font-semibold tracking-tight text-white">
              Pack feed
            </h2>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/40">
              {filtered.length} rides
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              geo.request()
              pushToast('Feed refreshed', 'Nearby rides re-sorted by distance and start time.', 'success')
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-white/50 transition hover:text-white"
          >
            <RefreshCw className={cx('h-3 w-3', geo.status === 'locating' && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            options={[
              { value: 'all', label: 'All rides', icon: <Compass className="h-3.5 w-3.5" /> },
              {
                value: 'near',
                label: geo.status === 'locating' ? 'Locating…' : 'Near me',
                icon: <MapPin className="h-3.5 w-3.5" />,
              },
              { value: 'global', label: 'Global runs', icon: <Globe2 className="h-3.5 w-3.5" /> },
            ]}
            value={scope}
            onChange={handleScope}
            className="sm:max-w-[380px]"
          />

          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'public', label: '🔓 Public rides' },
                { value: 'groups', label: '🔒 My groups' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrivacy(option.value)}
                className={cx(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition',
                  privacy === option.value
                    ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300'
                    : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {geo.status === 'denied' ? (
          <p className="flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[10px] text-amber-200/70">
            <MapPin className="h-3 w-3" /> Location blocked — showing your saved city. Enable
            location for a true 400 km radius.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_326px]">
        <div className="space-y-4">
          {isLoading && !rides.length ? (
            <>
              <RideCardSkeleton />
              <RideCardSkeleton />
            </>
          ) : filtered.length ? (
            <>
              {filtered.map((ride, index) => (
                <div key={ride.id} className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.24) }}
                  >
                    <RideCard ride={ride} />
                  </motion.div>

                  {index === 1 && flags.sponsoredPitstops && !dismissedPromo ? (
                    <SponsoredPitstop onDismiss={() => setDismissedPromo(true)} />
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              icon={<Compass className="h-6 w-6" />}
              title="No rides in this filter yet"
              description="Widen your scope to All rides, or host a Sunday run and let the pack find you."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setScope('all')}>
                    Show all rides
                  </Button>
                  <Button size="sm" icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => navigate('/create')}>
                    Host a ride
                  </Button>
                </div>
              }
            />
          )}

          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 text-center">
            <p className="text-xs font-medium text-white/50">You’re all caught up with the pack</p>
            <p className="max-w-sm text-[11px] leading-relaxed text-white/30">
              Sunday rides drop every Thursday at 8pm. Follow your clubs to get the meetup pin
              first.
            </p>
            <Button variant="ghost" size="xs" onClick={() => navigate('/clubs')}>
              Browse clubs <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <aside className="hidden space-y-4 xl:block">
          {liveRide ? (
            <LiveRailCard
              rideId={liveRide.id}
              isPro={isPro}
              onUpsell={() => openPaywall('Pack-spread alerts are a Road Captain PRO feature.')}
            />
          ) : null}

          <Panel className="p-4">
            <SectionHeading
              eyebrow="Your week"
              title="Up next"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="text-[10px] font-semibold text-crimson-400 hover:text-crimson-300"
                >
                  Host
                </button>
              }
            />
            <div className="mt-3 space-y-1">
              {rides
                .filter((ride) => ride.status === 'upcoming')
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .slice(0, 3)
                .map((ride) => {
                  const club = clubMap[ride.clubId]
                  const joined = joinedRideIds.includes(ride.id)
                  return (
                    <button
                      key={ride.id}
                      type="button"
                      onClick={() => navigate(`/ride/${ride.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-2xl p-1.5 text-left transition hover:bg-white/[0.04]"
                    >
                      <RideArtwork
                        art={ride.art}
                        showBike={false}
                        showSpeedLines={false}
                        className="h-12 w-12 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-white">
                          {ride.title.split(':')[0]}
                        </p>
                        <p className="truncate text-[10px] text-white/35">
                          {meetupLabel(ride.startTime)} · {club?.city}
                        </p>
                      </div>
                      {joined ? (
                        <Pill tone="live" className="shrink-0 px-1.5 py-0.5 text-[8px]">
                          In
                        </Pill>
                      ) : (
                        <span className="shrink-0 text-[10px] text-white/25">
                          {relativeTime(ride.startTime)}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeading eyebrow="Multi-club" title="Clubs near you" />
            <div className="mt-3 space-y-2">
              {clubs
                .filter((club) => club.region === 'India')
                .slice(0, 3)
                .map((club) => {
                  const joined = joinedClubIds.includes(club.id)
                  return (
                    <div key={club.id} className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-base">
                        {club.badgeEmoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-white">
                          {club.name}
                          {club.verified ? <Verified className="h-3 w-3" /> : null}
                        </p>
                        <p className="text-[9px] text-white/35">
                          {club.memberCount} members · {club.ridingNow} riding
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleJoinClub(club.id)}
                        className={cx(
                          'shrink-0 rounded-lg border px-2 py-1 text-[9px] font-bold transition',
                          joined
                            ? 'border-white/10 bg-white/[0.04] text-white/40'
                            : 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300 hover:bg-crimson-500/20',
                        )}
                      >
                        {joined ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  )
                })}
            </div>
            <Button variant="ghost" size="xs" full className="mt-3" onClick={() => navigate('/clubs')}>
              See all {clubs.length} clubs
            </Button>
          </Panel>

          {!isPro ? (
            <button
              type="button"
              onClick={() => openPaywall('Run your Sunday pack like a pro.')}
              className="group relative w-full overflow-hidden rounded-[26px] border border-amber-400/25 bg-gradient-to-br from-amber-400/15 via-crimson-500/10 to-ink-900 p-4 text-left"
            >
              <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="relative flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  Road Captain PRO
                </span>
              </div>
              <p className="relative mt-2 font-display text-sm font-semibold leading-snug text-white">
                4K reels, offline GPX and live fall-behind alerts.
              </p>
              <p className="relative mt-1 text-[11px] leading-relaxed text-white/45">
                $4.99/mo or ₹199/mo · cancel anytime.
              </p>
              <span className="relative mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                Unlock PRO <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ) : (
            <Panel className="border-amber-400/20 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-300" />
                <p className="text-[11px] font-semibold text-amber-200">PRO active</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
                Family tracking, GPX downloads and 4K export are unlocked on this device.
              </p>
              <Button size="xs" variant="ghost" full className="mt-2" onClick={() => navigate('/garage')}>
                Open founder console
              </Button>
            </Panel>
          )}
        </aside>
      </div>

      <div className="flex justify-center pt-2 xl:hidden">
        <Button
          variant="secondary"
          size="sm"
          icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />}
          onClick={() => openPaywall()}
        >
          Explore Road Captain PRO
        </Button>
      </div>
    </div>
  )
}

const FeedHero = ({
  name,
  onlineRiders,
  liveCount,
  clubCount,
}: {
  name: string
  onlineRiders: number
  liveCount: number
  clubCount: number
}) => (
  <section className="relative overflow-hidden rounded-[28px] border border-white/10">
    <RideArtwork
      art={{ palette: 'sunset', seed: 8 }}
      className="absolute inset-0 h-full w-full"
      showBike
      tint={false}
    />
    <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
    <div className="relative p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <Pill tone="live" className="bg-ink-950/60 backdrop-blur">
          <LiveDot /> {liveCount} rides live now
        </Pill>
        <Pill className="hidden bg-ink-950/60 backdrop-blur sm:inline-flex">
          Sunday · 24 Oct
        </Pill>
      </div>
      <h1 className="mt-3 max-w-md font-display text-[26px] font-bold leading-[1.08] tracking-tight text-white sm:text-4xl">
        Morning, {name}.
        <br />
        <span className="bg-gradient-to-r from-crimson-400 via-rose-300 to-cyber-300 bg-clip-text text-transparent">
          Find your pack.
        </span>
      </h1>
      <p className="mt-2.5 max-w-sm text-xs leading-relaxed text-white/50 sm:text-sm">
        Sunday runs, club lounges and a live radar that keeps the sweep in sight. All in one
        place.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={<Navigation className="h-3.5 w-3.5" />}
          onClick={() => navigate('/feed')}
          className="bg-white text-ink-950 shadow-none hover:bg-white/90"
        >
          Rides near me
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<CalendarPlus className="h-3.5 w-3.5" />}
          onClick={() => navigate('/create')}
        >
          Host a Sunday ride
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-5 sm:gap-7">
        {[
          { value: `${onlineRiders}`, label: 'riders online', icon: Users },
          { value: `${clubCount}`, label: 'clubs', icon: Compass },
          { value: '6.2k', label: 'km this week', icon: MapPin },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <stat.icon className="h-3.5 w-3.5 text-white/30" />
            <div>
              <p className="font-display text-sm font-bold leading-none text-white">{stat.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/35">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

const LiveRailCard = ({
  rideId,
  isPro,
  onUpsell,
}: {
  rideId: string
  isPro: boolean
  onUpsell: () => void
}) => {
  const { data: rides } = useRides()
  const ride = rides.find((item) => item.id === rideId) ?? null
  const seed = useMemo(
    () => seedParticipants.filter((participant) => participant.rideId === rideId),
    [rideId],
  )
  const { riders, spreadKm, lead } = useLiveRide(ride, seed)

  if (!ride) return null

  return (
    <Panel className="overflow-hidden">
      <div className="relative">
        <LiveRadarMap ride={ride} riders={riders} variant="mini" className="h-[152px] rounded-none border-0" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Pill tone="live" className="bg-ink-950/80 backdrop-blur">
            <LiveDot /> Live radar
          </Pill>
          <Pill className="bg-ink-950/80 text-white/60 backdrop-blur">
            {riders.length} markers
          </Pill>
        </div>
      </div>
      <div className="p-4">
        <p className="truncate text-xs font-semibold text-white">{ride.title}</p>
        <p className="mt-0.5 truncate text-[10px] text-white/35">{ride.routeSummary}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Pack spread</p>
            <p className={cx('font-display text-sm font-bold', spreadKm > 2 ? 'text-rose-400' : 'text-pack-400')}>
              {spreadKm.toFixed(1)} km
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/35">Lead speed</p>
            <p className="font-display text-sm font-bold text-cyber-300">{lead?.speedKmh ?? 0} km/h</p>
          </div>
        </div>

        {spreadKm > 2 ? (
          <div className="mt-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-300">
              <Flame className="h-3 w-3" /> {isPro ? 'Sweep dropped · regroup' : 'Fall-behind detected'}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">
              Tail is {spreadKm.toFixed(1)} km behind the lead.
              {!isPro ? ' PRO sends the captain an instant alert.' : ''}
            </p>
            <ProgressBar value={Math.min(100, spreadKm * 8)} tone="crimson" className="mt-2" />
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <Button size="xs" full onClick={() => navigate(`/ride/${ride.id}/live`)}>
            Open radar
          </Button>
          {!isPro ? (
            <Button size="xs" variant="secondary" onClick={onUpsell} className="shrink-0">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}

const SponsoredPitstop = ({ onDismiss }: { onDismiss: () => void }) => (
  <div className="relative overflow-hidden rounded-[26px] border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.12] via-ink-900 to-ink-900 p-4">
    <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
    <div className="relative flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
        <BadgePercent className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Pack perk · partner
          </span>
          <span className="text-[9px] text-white/25">Sponsored</span>
        </div>
        <p className="mt-1 font-display text-sm font-semibold text-white">
          Highway King Dhaba — 15% off for 5+ riders
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
          Show your live pack radar at the counter on NH-44, Karnal. Free chai refills for the
          sweep.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200"
          onClick={() => useAppStore.getState().pushToast('Perk saved', 'Show the pack radar at the counter to claim 15% off.', 'success')}
        >
          Claim pack perk <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss sponsored pitstop"
        className="rounded-full p-1 text-white/25 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
)
