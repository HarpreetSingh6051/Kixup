import { useId, useMemo, type ReactNode } from 'react'
import type { ArtSeed } from '@/types'
import { cx, hashCode } from '@/lib/format'

const palettes: Record<
  ArtSeed['palette'],
  {
    sky: [string, string, string]
    sun: string
    ridgeFar: string
    ridgeMid: string
    ridgeNear: string
    road: string
    accent: string
    beam: string
  }
> = {
  sunset: {
    sky: ['#170711', '#5A1A33', '#F97362'],
    sun: '#FFE3A3',
    ridgeFar: '#3A1424',
    ridgeMid: '#230C18',
    ridgeNear: '#0D050C',
    road: '#150C14',
    accent: '#F43F5E',
    beam: '#FFD9A0',
  },
  alpine: {
    sky: ['#04121C', '#0B3A4C', '#1FB6C9'],
    sun: '#D9FBFF',
    ridgeFar: '#0C3341',
    ridgeMid: '#082029',
    ridgeNear: '#040C12',
    road: '#0A161D',
    accent: '#22D3EE',
    beam: '#B7F4FF',
  },
  coast: {
    sky: ['#04101B', '#0C2C4E', '#2E9BD6'],
    sun: '#FFE7B0',
    ridgeFar: '#123A57',
    ridgeMid: '#0A2133',
    ridgeNear: '#040B12',
    road: '#0B1620',
    accent: '#38BDF8',
    beam: '#FFE8B8',
  },
  desert: {
    sky: ['#190E05', '#5B2E08', '#E08A2B'],
    sun: '#FFE6B8',
    ridgeFar: '#5A3213',
    ridgeMid: '#331B0A',
    ridgeNear: '#120A05',
    road: '#1A120A',
    accent: '#FBBF24',
    beam: '#FFE3A8',
  },
  night: {
    sky: ['#04050D', '#161638', '#5B5BD6'],
    sun: '#C7D2FE',
    ridgeFar: '#1E1E4A',
    ridgeMid: '#11112B',
    ridgeNear: '#05050D',
    road: '#0A0A16',
    accent: '#818CF8',
    beam: '#DDE3FF',
  },
}

export const RideArtwork = ({
  art,
  className,
  children,
  showBike = true,
  showSpeedLines = true,
  tint = true,
}: {
  art: ArtSeed
  className?: string
  children?: ReactNode
  showBike?: boolean
  showSpeedLines?: boolean
  tint?: boolean
}) => {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const palette = palettes[art.palette] ?? palettes.alpine
  const seed = art.seed || 1

  const { stars, farRidge, midRidge, nearRidge, dashes } = useMemo(() => {
    const rand = (index: number) => {
      const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
      return value - Math.floor(value)
    }
    const buildRidge = (baseY: number, amplitude: number, count: number) => {
      const points: Array<[number, number]> = [[0, baseY]]
      for (let i = 1; i <= count; i += 1) {
        const x = (640 / count) * i
        const y = baseY - amplitude * (0.35 + rand(i + baseY) * 0.85)
        points.push([x, y])
      }
      points.push([640, baseY])
      return points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
    }

    return {
      stars: Array.from({ length: 34 }, (_, index) => ({
        x: rand(index + 1) * 640,
        y: rand(index + 90) * 180,
        r: 0.5 + rand(index + 40) * 1.1,
        opacity: 0.2 + rand(index + 60) * 0.6,
      })),
      farRidge: buildRidge(232, 76, 8),
      midRidge: buildRidge(272, 58, 10),
      nearRidge: buildRidge(310, 38, 6),
      dashes: Array.from({ length: 7 }, (_, index) => {
        const t = index / 7
        const y = 322 - t * 74
        const width = 2 + t * 10
        return { y, width, height: 3 + t * 9 }
      }),
    }
  }, [seed])

  return (
    <div className={cx('relative overflow-hidden', className)}>
      <svg
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.sky[0]} />
            <stop offset="58%" stopColor={palette.sky[1]} />
            <stop offset="100%" stopColor={palette.sky[2]} />
          </linearGradient>
          <radialGradient id={`sun-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.sun} stopOpacity="0.95" />
            <stop offset="55%" stopColor={palette.sun} stopOpacity="0.25" />
            <stop offset="100%" stopColor={palette.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`road-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.road} stopOpacity="0.2" />
            <stop offset="100%" stopColor={palette.road} />
          </linearGradient>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.beam} stopOpacity="0.55" />
            <stop offset="100%" stopColor={palette.beam} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07070C" stopOpacity="0" />
            <stop offset="100%" stopColor="#07070C" stopOpacity="0.92" />
          </linearGradient>
          <filter id={`blur-${uid}`}>
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id={`grain-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.16" />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect width="640" height="360" fill={`url(#sky-${uid})`} />

        {art.palette === 'night'
          ? stars.map((star, index) => (
              <circle
                key={index}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill="#E0E7FF"
                opacity={star.opacity}
              />
            ))
          : null}

        <circle cx="466" cy="126" r="108" fill={`url(#sun-${uid})`} />
        <circle cx="466" cy="126" r="40" fill={palette.sun} opacity="0.92" />

        <g opacity="0.5">
          <ellipse cx="200" cy="168" rx="96" ry="8" fill={palette.sun} opacity="0.18" />
          <ellipse cx="360" cy="196" rx="130" ry="6" fill={palette.sun} opacity="0.13" />
        </g>

        <path d={`M0 360 L ${farRidge} L 640 360 Z`} fill={palette.ridgeFar} opacity="0.85" />
        <path d={`M0 360 L ${midRidge} L 640 360 Z`} fill={palette.ridgeMid} />
        <path d={`M0 360 L ${nearRidge} L 640 360 Z`} fill={palette.ridgeNear} />

        {/* Headlight haze on the tarmac */}
        <ellipse
          cx="330"
          cy="300"
          rx="210"
          ry="44"
          fill={palette.accent}
          opacity="0.1"
          filter={`url(#blur-${uid})`}
        />

        {/* Road */}
        <path d="M282 360 L358 360 L336 272 L326 272 Z" fill={`url(#road-${uid})`} />
        <path d="M282 360 L358 360 L336 272 L326 272 Z" fill="none" stroke={palette.accent} strokeOpacity="0.16" />
        <g fill={palette.sun} opacity="0.5">
          {dashes.map((dash, index) => (
            <rect
              key={index}
              x={331 - dash.width / 2}
              y={dash.y}
              width={dash.width}
              height={dash.height}
              rx={1.5}
              opacity={0.15 + (index / dashes.length) * 0.55}
            />
          ))}
        </g>

        {/* Guardrail */}
        <g opacity="0.35">
          <path d="M258 334 L318 282" stroke={palette.sun} strokeWidth="1.2" />
          {[0, 1, 2, 3, 4].map((index) => (
            <circle
              key={index}
              cx={262 + index * 13}
              cy={330 - index * 11}
              r="1.8"
              fill={palette.accent}
            />
          ))}
          <path d="M382 334 L344 282" stroke={palette.sun} strokeWidth="1.2" />
        </g>

        {showSpeedLines ? (
          <g opacity="0.4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <rect
                key={index}
                x={40 + ((seed * 37 + index * 53) % 240)}
                y={214 + index * 21}
                width={40 + (index % 3) * 46}
                height="1.4"
                rx="1"
                fill={palette.accent}
                opacity={0.18 + (index % 4) * 0.1}
              />
            ))}
          </g>
        ) : null}

        {showBike ? (
          <g transform="translate(432 296) scale(0.94)">
            <ellipse cx="30" cy="30" rx="52" ry="7" fill="#000" opacity="0.55" />
            <path d="M86 4 L188 -22 L188 34 Z" fill={`url(#beam-${uid})`} />
            <g stroke="#05050A" strokeWidth="7" fill="none" strokeLinecap="round">
              <circle cx="2" cy="8" r="21" />
              <circle cx="66" cy="8" r="21" />
              <path d="M2 8 L20 -18 L46 -18 L60 2 M20 -18 H44" />
              <path d="M46 -18 Q54 -34 64 -30 L72 -12" strokeWidth="6" />
            </g>
            <g fill="#05050A">
              <path d="M22 -20 L46 -24 L56 -12 L30 -10 Z" />
              <rect x="58" y="-26" width="16" height="12" rx="4" />
              <circle cx="72" cy="-32" r="7" />
            </g>
            <circle cx="2" cy="8" r="21" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
            <circle cx="66" cy="8" r="21" stroke={palette.accent} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
            <circle cx="82" cy="-6" r="3.4" fill={palette.beam} />
            <circle cx="82" cy="-6" r="12" fill={palette.beam} opacity="0.18" filter={`url(#blur-${uid})`} />
          </g>
        ) : null}

        <rect width="640" height="360" filter={`url(#grain-${uid})`} opacity="0.5" />
        {tint ? <rect y="200" width="640" height="160" fill={`url(#fade-${uid})`} /> : null}
      </svg>
      {children}
    </div>
  )
}

export const MiniRouteArt = ({ seed = 1, accent = '#F43F5E' }: { seed?: number; accent?: string }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const points = useMemo(() => {
    const rand = (index: number) => {
      const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
      return value - Math.floor(value)
    }
    return Array.from({ length: 7 }, (_, index) => ({
      x: 6 + index * 24,
      y: 26 + (rand(index) - 0.5) * 26,
    }))
  }, [seed])
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
  const hash = hashCode(String(seed))

  return (
    <svg viewBox="0 0 160 56" className="h-full w-full">
      <defs>
        <linearGradient id={`mini-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#mini-${id})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={points[0].x} cy={points[0].y} r="3" fill={accent} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="#F4F4F8" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="7" fill="none" stroke={accent} strokeOpacity="0.5" />
      <text x="4" y="52" fill="#ffffff" opacity="0.35" fontSize="7" fontFamily="monospace">
        {(hash % 900) + 60} KM · GPX
      </text>
    </svg>
  )
}
