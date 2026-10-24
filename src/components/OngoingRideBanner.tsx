import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigation, Users, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useRides } from '@/lib/data'
import { navigate } from '@/lib/router'
import { cx, clockTime } from '@/lib/format'

/** Sticky emerald banner shown whenever a ride you joined is currently live. */
export const OngoingRideBanner = () => {
  const joinedRideIds = useAppStore((state) => state.joinedRideIds)
  const { data: rides } = useRides()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [, forceTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => forceTick((tick) => tick + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const liveRides = rides.filter(
    (ride) =>
      ride.status === 'ongoing' && joinedRideIds.includes(ride.id) && !dismissed.includes(ride.id),
  )
  const ride = liveRides[0]

  return (
    <AnimatePresence initial={false}>
      {ride ? (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="sticky top-[62px] z-30 sm:top-[68px]"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/ride/${ride.id}/live`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/ride/${ride.id}/live`)
              }
            }}
            className="group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-pack-500/30 bg-gradient-to-r from-emerald-500/18 via-emerald-500/10 to-transparent px-3.5 py-2.5 text-left backdrop-blur-xl"
          >
            <span className="absolute inset-0 -z-10 bg-ink-950/70" />
            <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-emerald-300 to-emerald-600" />
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pack-500/15">
              <span className="absolute h-full w-full animate-ping rounded-full bg-pack-500/25" />
              <Navigation className="relative h-4 w-4 text-pack-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pack-400">
                  Ride live
                </span>
                <span className="text-[9px] text-white/35">started {clockTime(ride.startTime)}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-white">
                <span className="truncate">{ride.title}</span>
              </span>
            </span>
            <span className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-white/70 sm:flex">
              <Users className="h-3 w-3" />
              {ride.participantIds.length} in
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-pack-500 px-2.5 py-1.5 text-[10px] font-bold text-ink-950 shadow-glow-pack">
              Live map
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                setDismissed((ids) => [...ids, ride.id])
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation()
                  setDismissed((ids) => [...ids, ride.id])
                }
              }}
              className={cx(
                'ml-0.5 rounded-full p-1 text-white/35 transition hover:bg-white/10 hover:text-white',
              )}
              aria-label="Dismiss live ride banner"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
