import { Heart, MapPin, MessageCircle, Navigation, Share2, Users } from 'lucide-react'
import type { Ride } from '@/types'
import { clubMap, profileMap } from '@/lib/mockData'
import { useClubs } from '@/lib/data'
import { useAppStore } from '@/store/useAppStore'
import { navigate } from '@/lib/router'
import { cx, meetupLabel } from '@/lib/format'
import { getAppUrl } from '@/lib/supabase'
import { RideArtwork } from '@/components/RideArtwork'
import { AvatarStack, Button, Pill, Verified } from '@/components/ui'

export const RideCard = ({ ride }: { ride: Ride }) => {
  const { data: clubs } = useClubs()
  const liked = useAppStore((state) => state.likedRideIds.includes(ride.id))
  const joined = useAppStore((state) => state.joinedRideIds.includes(ride.id))
  const toggleLike = useAppStore((state) => state.toggleLikeRide)
  const toggleJoin = useAppStore((state) => state.toggleJoinRide)
  const pushToast = useAppStore((state) => state.pushToast)

  const club = clubs.find((item) => item.id === ride.clubId) ?? clubMap[ride.clubId]
  const captain = profileMap[ride.captainId]
  const riders = ride.participantIds
    .map((id) => profileMap[id])
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
  const goingCount = riders.length
  const shareUrl = `${getAppUrl()}/#/ride/${ride.id}`

  const share = async () => {
    const text = `${ride.title} — ${ride.routeSummary}. ${goingCount}/${ride.maxRiders} riders in. Join the pack on Ride & Roam: ${shareUrl}`
    if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: ride.title, text, url: shareUrl })
        return
      } catch {
        /* fall through to WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    pushToast('WhatsApp invite opened', 'The pack link is ready to paste into any group.', 'success')
  }

  return (
    <article className="group card card-hover overflow-hidden">
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate(`/ride/${ride.id}`)}
          className="block w-full text-left"
          aria-label={`Open ${ride.title}`}
        >
          <RideArtwork art={ride.art} className="h-[168px] w-full sm:h-[200px]" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {ride.status === 'ongoing' ? (
              <Pill tone="live" className="border-pack-400/40 bg-ink-950/70 backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pack-400" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pack-400" />
                </span>
                Live now
              </Pill>
            ) : ride.status === 'upcoming' ? (
              <Pill tone="cyan" className="bg-ink-950/70 backdrop-blur-md">
                Upcoming
              </Pill>
            ) : (
              <Pill className="bg-ink-950/70 text-white/60 backdrop-blur-md">Completed</Pill>
            )}
            <Pill
              className={cx(
                'bg-ink-950/70 backdrop-blur-md',
                ride.visibility === 'public' ? 'text-white/70' : 'text-amber-200',
              )}
            >
              {ride.visibility === 'public' ? '🔓 Public' : '🔒 Club only'}
            </Pill>
            <Pill className="border-white/10 bg-ink-950/70 text-white/55 backdrop-blur-md">
              {ride.difficulty}
            </Pill>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink-950/95 via-ink-950/40 to-transparent p-3.5 pt-10">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{club?.badgeEmoji ?? '🏍️'}</span>
              <span className="truncate text-[11px] font-semibold text-white/85">
                {club?.name ?? 'Independent pack'}
              </span>
              {club?.verified ? <Verified className="h-3.5 w-3.5" /> : null}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-white/45">
              Road Captain {captain?.fullName ?? 'TBA'} · {captain?.primaryBike ?? ''}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/10 bg-ink-950/60 px-2.5 py-1 text-right backdrop-blur-md">
            <p className="font-display text-xs font-bold leading-none text-white">
              {ride.distanceKm} km
            </p>
            <p className="mt-0.5 text-[8px] uppercase tracking-wider text-white/40">
              {ride.status === 'ongoing' ? 'live route' : 'route'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <button type="button" onClick={() => navigate(`/ride/${ride.id}`)} className="block w-full text-left">
          <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight text-white transition group-hover:text-crimson-100 sm:text-base">
            {ride.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11px] text-white/45">{ride.routeSummary}</p>
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson-400" />
            {meetupLabel(ride.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-white/35" />
            <span className="max-w-[190px] truncate">{ride.meetupLabel}</span>
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ride.hashtags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] font-medium text-cyber-300/70">
              {tag}
            </span>
          ))}
        </div>

        <div className="my-3.5 h-px w-full bg-white/[0.07]" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AvatarStack people={riders} max={3} size="xs" />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-white/80">
                <Users className="h-3 w-3 text-white/35" />
                {goingCount + (joined && !ride.participantIds.includes('u_arjun') ? 1 : 0)}/
                {ride.maxRiders} riders in
              </p>
              <p className="truncate text-[9px] uppercase tracking-wider text-white/30">
                {ride.splitEnabled ? 'Tank split on' : 'Own fuel'}
              </p>
            </div>
          </div>

          {ride.status === 'ongoing' && joined ? (
            <Button
              size="xs"
              variant="success"
              icon={<Navigation className="h-3 w-3" />}
              onClick={() => navigate(`/ride/${ride.id}/live`)}
            >
              Live map
            </Button>
          ) : (
            <Button
              size="xs"
              variant={joined ? 'secondary' : 'primary'}
              onClick={() => toggleJoin(ride.id)}
              className="shrink-0"
            >
              {joined ? '✓ Going' : '+ Join ride'}
            </Button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => toggleLike(ride.id)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] transition',
                liked ? 'text-crimson-400' : 'text-white/45 hover:text-white',
              )}
            >
              <Heart className={cx('h-3.5 w-3.5', liked && 'fill-crimson-400')} />
              {ride.likesCount + (liked ? 1 : 0)}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/ride/${ride.id}`)}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] text-white/45 transition hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {ride.commentCount}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] text-white/45 transition hover:text-pack-400"
              aria-label="Share to WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>

          <Button
            size="xs"
            variant="ghost"
            trailingIcon={<Navigation className="h-3 w-3" />}
            onClick={() => navigate(`/ride/${ride.id}`)}
            className="px-2 text-crimson-300 hover:text-crimson-200"
          >
            Ride details & map
          </Button>
        </div>
      </div>
    </article>
  )
}

export const RideCardSkeleton = () => (
  <div className="card overflow-hidden">
    <div className="h-[168px] w-full animate-pulse bg-white/[0.05] sm:h-[200px]" />
    <div className="space-y-3 p-4 sm:p-5">
      <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
      <div className="h-9 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  </div>
)
