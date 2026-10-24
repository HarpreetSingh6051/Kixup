import { useId, useMemo } from 'react'
import type { LiveRiderState, Ride } from '@/types'
import { profileMap } from '@/lib/mockData'
import { cx, initials } from '@/lib/format'

interface Props {
  ride: Ride
  riders: LiveRiderState[]
  variant?: 'mini' | 'full'
  className?: string
  dimmed?: boolean
}

/**
 * Dark-neon pack radar. Renders as vector (no tiles, no network) and follows
 * the lead rider with a zoomed pack window so 9 markers stay readable.
 */
export const LiveRadarMap = ({ ride, riders, variant = 'full', className, dimmed }: Props) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const isMini = variant === 'mini'

  const leadProgress = riders.length ? Math.max(...riders.map((r) => r.progress)) : 0.6
  const windowStart = Math.max(0, leadProgress - 0.048)
  const windowSpan = 0.062

  const toDisplay = (progress: number) =>
    Math.min(1.02, Math.max(-0.02, (progress - windowStart) / windowSpan))

  const pointFor = (t: number) => ({
    x: 70 + t * 660,
    y: 404 - t * 292 + Math.sin(t * Math.PI * 2.15) * 26,
  })

  const routePath = useMemo(() => {
    return Array.from({ length: 65 }, (_, index) => {
      const point = pointFor(index / 64)
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    }).join(' ')
  }, [])

  const startPoint = pointFor(0)
  const endPoint = pointFor(1)

  const visibleWaypoints = ride.waypoints
    .map((waypoint) => {
      const t = Math.min(1, waypoint.km / Math.max(1, ride.distanceKm))
      return { ...waypoint, t, displayT: toDisplay(t) }
    })
    .filter((waypoint) => waypoint.displayT >= -0.02 && waypoint.displayT <= 1.02)

  const packSpread =
    riders.length > 1 && riders[0] && riders[riders.length - 1]
      ? riders[0].gapKm === 0
        ? riders[riders.length - 1].gapKm
        : Math.max(...riders.map((r) => r.gapKm))
      : 0

  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-[26px] border border-white/10 bg-ink-950',
        className,
      )}
    >
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        className={cx('h-full w-full', dimmed && 'opacity-80')}
        role="img"
        aria-label={`Live pack radar for ${ride.title}`}
      >
        <defs>
          <radialGradient id={`radar-bg-${uid}`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#0E2230" />
            <stop offset="55%" stopColor="#0A121B" />
            <stop offset="100%" stopColor="#05070C" />
          </radialGradient>
          <linearGradient id={`route-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#22D3EE" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.95" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id={`grid-${uid}`} width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="#22D3EE" strokeOpacity="0.055" strokeWidth="1" />
          </pattern>
          <radialGradient id={`vignette-${uid}`} cx="50%" cy="50%" r="65%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#radar-bg-${uid})`} />
        <rect width="800" height="500" fill={`url(#grid-${uid})`} />

        {/* Stylised terrain / forest blocks */}
        <g opacity="0.5">
          <path d="M-20 380 Q120 300 220 356 T470 330 T840 400 L840 520 L-20 520 Z" fill="#0B2A24" />
          <path d="M-20 300 Q90 236 196 288 T430 262 T840 320 L840 420 L-20 420 Z" fill="#0A1F1C" opacity="0.8" />
          <path
            d="M540 40 Q650 10 720 70 T830 120 L830 250 Q700 210 620 240 T520 210 Z"
            fill="#0B2233"
            opacity="0.7"
          />
        </g>

        {/* Water hint */}
        <path
          d="M-20 120 Q160 150 260 110 T520 130 T840 90 L840 20 L-20 20 Z"
          fill="#0A1A2A"
          opacity="0.7"
        />

        {/* Route */}
        <path
          d={routePath}
          fill="none"
          stroke="#0B1219"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d={routePath}
          fill="none"
          stroke={`url(#route-${uid})`}
          strokeWidth="4"
          strokeLinecap="round"
          filter={`url(#glow-${uid})`}
        />
        <path
          d={routePath}
          fill="none"
          stroke="#E6FEFF"
          strokeOpacity="0.45"
          strokeWidth="1.4"
          strokeDasharray="2 16"
        />

        {/* Meetup start */}
        <g>
          <circle cx={startPoint.x} cy={startPoint.y} r="9" fill="#07070C" stroke="#F43F5E" strokeWidth="2.5" />
          <circle cx={startPoint.x} cy={startPoint.y} r="3.5" fill="#F43F5E" />
          {!isMini ? (
            <text x={startPoint.x - 6} y={startPoint.y + 30} fill="#ffffff" opacity="0.45" fontSize="11" fontFamily="ui-monospace, monospace">
              START
            </text>
          ) : null}
        </g>

        {/* Destination */}
        <g>
          <circle cx={endPoint.x} cy={endPoint.y} r="9" fill="#07070C" stroke="#22D3EE" strokeWidth="2.5" />
          <circle cx={endPoint.x} cy={endPoint.y} r="3.5" fill="#22D3EE" />
          {!isMini ? (
            <text x={endPoint.x - 32} y={endPoint.y - 18} fill="#ffffff" opacity="0.45" fontSize="11" fontFamily="ui-monospace, monospace">
              FINISH
            </text>
          ) : null}
        </g>

        {/* Waypoint labels */}
        {!isMini
          ? visibleWaypoints.map((waypoint) => {
              const point = pointFor(waypoint.displayT)
              return (
                <g key={waypoint.label}>
                  <circle cx={point.x} cy={point.y} r="4.5" fill="#0B1219" stroke="#FBBF24" strokeWidth="1.6" />
                  <line x1={point.x} y1={point.y - 8} x2={point.x} y2={point.y - 20} stroke="#FBBF24" strokeOpacity="0.3" />
                  <text
                    x={point.x + 8}
                    y={point.y - 12}
                    fill="#FDE68A"
                    opacity="0.75"
                    fontSize="10.5"
                    fontFamily="ui-monospace, monospace"
                  >
                    {waypoint.label}
                  </text>
                </g>
              )
            })
          : null}

        {/* Rider markers */}
        {riders.map((rider, index) => {
          const point = pointFor(toDisplay(rider.progress))
          const profile = profileMap[rider.userId]
          const accent = profile?.accent ?? '#22D3EE'
          const dropped = rider.gapKm > 2 && !rider.isLead
          const radius = isMini ? 9 : 15

          return (
            <g key={rider.userId} transform={`translate(${point.x} ${point.y})`}>
              {rider.isLead ? (
                <circle r={radius + 10} fill={accent} opacity="0.12" className="animate-ping-slow" />
              ) : null}
              <circle
                r={radius + 4}
                fill="#07070C"
                stroke={dropped ? '#FB7185' : accent}
                strokeOpacity={dropped ? 0.9 : 0.55}
                strokeWidth="2"
              />
              <circle r={radius} fill={accent} opacity="0.92" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#08080F"
                fontSize={isMini ? 7.5 : 10.5}
                fontWeight="700"
                fontFamily="Inter, sans-serif"
              >
                {initials(profile?.fullName ?? 'Rider')}
              </text>

              {rider.isLead ? (
                <g transform={`translate(0 ${-radius - 20})`}>
                  <rect x="-32" y="-14" width="64" height="20" rx="8" fill="#07070C" stroke={accent} strokeOpacity="0.5" />
                  <text textAnchor="middle" y="0" fill={accent} fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">
                    LEAD · {rider.speedKmh}
                  </text>
                </g>
              ) : null}

              {dropped ? (
                <g transform={`translate(0 ${radius + 19})`}>
                  <rect x="-24" y="-9" width="48" height="16" rx="7" fill="#2A0A12" stroke="#FB7185" strokeOpacity="0.6" />
                  <text textAnchor="middle" y="2.5" fill="#FDA4AF" fontSize="8" fontWeight="700" fontFamily="ui-monospace, monospace">
                    -{rider.gapKm.toFixed(1)} km
                  </text>
                </g>
              ) : !isMini && index !== 0 ? (
                <text
                  y={radius + 18}
                  textAnchor="middle"
                  fill="#F4F4F8"
                  opacity="0.4"
                  fontSize="8.5"
                  fontFamily="ui-monospace, monospace"
                >
                  {rider.speedKmh}
                </text>
              ) : null}
            </g>
          )
        })}

        <rect width="800" height="500" fill={`url(#vignette-${uid})`} />

        {/* Map furniture */}
        {!isMini ? (
          <>
            <g transform="translate(736 66)" opacity="0.6">
              <circle r="20" fill="#07070C" fillOpacity="0.6" stroke="#ffffff" strokeOpacity="0.15" />
              <path d="M0 -13 L5 3 L0 0 L-5 3 Z" fill="#F43F5E" />
              <text y="15" textAnchor="middle" fill="#ffffff" fillOpacity="0.5" fontSize="7" fontFamily="ui-monospace, monospace">
                N
              </text>
            </g>
            <g transform="translate(28 468)">
              <line x1="0" y1="0" x2="64" y2="0" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
              <line x1="64" y1="-4" x2="64" y2="4" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
              <text x="70" y="3" fill="#ffffff" fillOpacity="0.35" fontSize="9" fontFamily="ui-monospace, monospace">
                {Math.max(2, Math.round(windowSpan * ride.distanceKm))} KM
              </text>
            </g>
            <g transform="translate(28 34)">
              <rect x="0" y="0" width="196" height="26" rx="13" fill="#07070C" fillOpacity="0.65" stroke="#ffffff" strokeOpacity="0.1" />
              <circle cx="16" cy="13" r="3.5" fill="#34D399" className="animate-pulse" />
              <text x="28" y="17" fill="#ffffff" fillOpacity="0.7" fontSize="9.5" fontFamily="ui-monospace, monospace">
                PACK VIEW · {packSpread.toFixed(1)} KM SPREAD
              </text>
            </g>
          </>
        ) : null}
      </svg>

      {/* Scanline sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.05),transparent_28%)]" />
    </div>
  )
}
