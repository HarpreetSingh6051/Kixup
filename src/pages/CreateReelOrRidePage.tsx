import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarClock,
  Check,
  Clapperboard,
  Copy,
  Crown,
  Download,
  Film,
  Gauge,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Mic2,
  Music4,
  Route as RouteIcon,
  Share2,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from 'lucide-react'
import type { ArtSeed, Ride, Visibility } from '@/types'
import {
  Button,
  Panel,
  Pill,
  ProgressBar,
  Segmented,
  Toggle,
} from '@/components/ui'
import { cx } from '@/lib/format'
import { RideArtwork } from '@/components/RideArtwork'
import { useClubs } from '@/lib/data'
import { currentUserId, reelClips } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { navigate } from '@/lib/router'
import { copyToClipboard, minutesFromNow, uid } from '@/lib/format'
import { suggestReelCaption } from '@/lib/gemini'

type Tab = 'reel' | 'ride'

const overlays: Array<{
  id: string
  name: string
  description: string
  icon: typeof Gauge
  palette: ArtSeed['palette']
}> = [
  {
    id: 'hud',
    name: 'V-Twin Speedometer HUD',
    description: 'Live speed, gear and RPM arc burned into the frame.',
    icon: Gauge,
    palette: 'sunset',
  },
  {
    id: 'gps',
    name: 'Minimal GPS Route Flyover',
    description: 'Animated route line with distance and elevation badges.',
    icon: RouteIcon,
    palette: 'alpine',
  },
  {
    id: 'raw',
    name: 'RAW Exhaust Boost',
    description: 'Waveform visualiser cut to the actual exhaust note.',
    icon: Mic2,
    palette: 'night',
  },
]

export const CreateReelOrRidePage = () => {
  const [tab, setTab] = useState<Tab>('reel')

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Rider studio
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
            Create
          </h1>
        </div>
        <Segmented
          options={[
            { value: 'reel', label: 'AI Reel Studio', icon: <Clapperboard className="h-3.5 w-3.5" /> },
            { value: 'ride', label: 'Host a ride', icon: <CalendarClock className="h-3.5 w-3.5" /> },
          ]}
          value={tab}
          onChange={setTab}
          className="w-full max-w-[300px]"
        />
      </div>

      {tab === 'reel' ? <ReelStudio /> : <HostRideForm />}
    </div>
  )
}

const ReelStudio = () => {
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const pushToast = useAppStore((state) => state.pushToast)

  const [selectedClips, setSelectedClips] = useState<string[]>(['rc1', 'rc2', 'rc4', 'rc6'])
  const [overlayId, setOverlayId] = useState('hud')
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p')
  const [watermark, setWatermark] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [exported, setExported] = useState(false)

  const overlay = overlays.find((item) => item.id === overlayId) ?? overlays[0]
  const clips = reelClips.filter((clip) => selectedClips.includes(clip.id))
  const previewClip = clips[0] ?? reelClips[0]
  const totalDuration = clips.reduce((sum, clip) => sum + clip.durationSec, 0)
  const locked4k = resolution === '4k' && !isPro
  const lockedWatermark = !watermark && !isPro

  const toggleClip = (id: string) => {
    setSelectedClips((current) =>
      current.includes(id) ? current.filter((clipId) => clipId !== id) : [...current, id],
    )
  }

  const generateCaption = async () => {
    setCaptionLoading(true)
    const text = await suggestReelCaption('Sunday Sunrise Run: Ludhiana → Kasauli', overlay.name)
    setCaption(text)
    setCaptionLoading(false)
    pushToast('Caption drafted', 'Gemini wrote a caption from your ride telemetry.', 'success')
  }

  const exportReel = () => {
    if (locked4k) {
      openPaywall('4K watermark-free export is a Road Captain PRO feature.')
      return
    }
    if (lockedWatermark) {
      openPaywall('Removing the Ride & Roam watermark is a PRO export option.')
      return
    }
    setExporting(true)
    setProgress(0)
    setExported(false)
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer)
          setExporting(false)
          setExported(true)
          pushToast(
            'Reel exported',
            `${resolution.toUpperCase()} · ${totalDuration}s · ready to share to Instagram Reels.`,
            'success',
          )
          return 100
        }
        return value + 8
      })
    }, 160)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        {/* Phone-style preview */}
        <Panel className="overflow-hidden p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-crimson-400" />
              <p className="text-xs font-semibold text-white">Live preview</p>
              <Pill tone={isPro ? 'amber' : 'neutral'} className="px-2 py-0.5 text-[8px]">
                {isPro ? 'PRO' : 'Free tier'}
              </Pill>
            </div>
            <span className="font-mono text-[10px] text-white/30">
              {clips.length} clips · {totalDuration}s
            </span>
          </div>

          <div className="relative mx-auto aspect-[9/13] w-full max-w-[300px] overflow-hidden rounded-[26px] border border-white/15 bg-ink-950 shadow-2xl">
            <RideArtwork
              art={{ palette: previewClip.palette, seed: previewClip.seed }}
              className="absolute inset-0 h-full w-full"
              tint={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-transparent to-ink-950/85" />

            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-ink-950/60 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/70 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Reel preview
              </span>
              <span className="rounded-full bg-ink-950/60 px-2 py-1 font-mono text-[8px] text-white/50 backdrop-blur">
                {resolution.toUpperCase()}
              </span>
            </div>

            {overlay.id === 'hud' ? (
              <div className="absolute inset-x-4 top-12">
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-[54px] font-bold leading-none text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.7)]">
                    84
                  </span>
                  <span className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                    km/h
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-crimson-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                    GEAR 4
                  </span>
                  <span className="font-mono text-[8px] text-white/60">3,180 RPM</span>
                </div>
                <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyber-400 to-crimson-500" />
                </div>
              </div>
            ) : null}

            {overlay.id === 'gps' ? (
              <div className="absolute inset-x-4 top-12">
                <div className="rounded-2xl border border-white/15 bg-ink-950/55 p-3 backdrop-blur-md">
                  <p className="text-[8px] uppercase tracking-wider text-cyber-300">Route flyover</p>
                  <p className="mt-1 text-[11px] font-semibold text-white">Ludhiana → Kasauli</p>
                  <svg viewBox="0 0 160 40" className="mt-2 h-8 w-full">
                    <path
                      d="M2 34 C 40 30, 48 8, 84 14 S 132 30, 158 6"
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="2" cy="34" r="3" fill="#F43F5E" />
                    <circle cx="158" cy="6" r="3" fill="#F4F4F8" />
                  </svg>
                  <p className="mt-1 font-mono text-[8px] text-white/45">186 KM · 4H 10M · NH-44</p>
                </div>
              </div>
            ) : null}

            {overlay.id === 'raw' ? (
              <div className="absolute inset-x-4 top-12">
                <div className="flex h-16 items-end justify-center gap-[3px] rounded-2xl border border-white/10 bg-ink-950/40 px-3 py-2 backdrop-blur">
                  {Array.from({ length: 34 }).map((_, index) => (
                    <motion.span
                      key={index}
                      animate={{ height: [`${8 + ((index * 13) % 34)}px`, `${14 + ((index * 29) % 40)}px`, `${8 + ((index * 17) % 28)}px`] }}
                      transition={{ duration: 0.9 + (index % 5) * 0.15, repeat: Infinity, repeatType: 'reverse' }}
                      className="w-[3px] rounded-full bg-gradient-to-t from-crimson-500 to-amber-300"
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-center font-mono text-[8px] uppercase tracking-widest text-amber-300">
                  98 dB · V-twin cold start
                </p>
              </div>
            ) : null}

            <div className="absolute inset-x-3 bottom-3">
              <p className="font-display text-sm font-bold leading-tight text-white drop-shadow">
                Sunday sunrise run
              </p>
              <p className="mt-0.5 text-[8px] text-white/55">with the Punjab Harley pack</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[8px] text-white/60">
                  <MapPin className="h-2.5 w-2.5" /> Kasauli ridge
                </span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} className="h-3 w-[3px] rounded-full bg-white/40" />
                  ))}
                </div>
              </div>
            </div>

            {watermark ? (
              <div className="absolute inset-x-0 top-1/2 flex justify-center">
                <span className="rounded-full border border-white/15 bg-ink-950/40 px-3 py-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/45 backdrop-blur-sm">
                  RIDE &amp; ROAM
                </span>
              </div>
            ) : null}

            <div className="absolute inset-x-3 bottom-14 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span className="text-[8px] text-white/40">{overlay.name.split(' ')[0]} overlay</span>
              </div>
              <Music4 className="h-3 w-3 text-white/30" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[10px] text-white/30">
              Tip: keep the lead rider in frame for the first 2 seconds.
            </p>
            <Button
              size="xs"
              variant="ghost"
              icon={<Download className="h-3 w-3" />}
              onClick={() => pushToast('Preview saved', 'Full export is available below.', 'default')}
            >
              Save
            </Button>
          </div>
        </Panel>

        {/* Media vault */}
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Shared media vault</p>
              <h2 className="mt-1 font-display text-base font-semibold text-white">
                Pick your clips
              </h2>
            </div>
            <span className="text-[10px] text-white/30">12 uploaded today</span>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {reelClips.map((clip) => {
              const selected = selectedClips.includes(clip.id)
              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => toggleClip(clip.id)}
                  className={cx(
                    'relative w-[104px] shrink-0 overflow-hidden rounded-2xl border text-left transition',
                    selected
                      ? 'border-crimson-500/60 ring-2 ring-crimson-500/20'
                      : 'border-white/10 opacity-70 hover:opacity-100',
                  )}
                >
                  <RideArtwork
                    art={{ palette: clip.palette, seed: clip.seed }}
                    className="h-[74px] w-full"
                    showBike={false}
                    showSpeedLines={false}
                    tint={false}
                  />
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/30 bg-ink-950/70">
                    {selected ? <Check className="h-2.5 w-2.5 text-pack-400" strokeWidth={3} /> : null}
                  </span>
                  <span className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded bg-ink-950/70 px-1 py-0.5 text-[7px] text-white/70">
                    {clip.kind === 'audio' ? (
                      <Music4 className="h-2 w-2" />
                    ) : clip.kind === 'photo' ? (
                      <ImageIcon className="h-2 w-2" />
                    ) : (
                      <Film className="h-2 w-2" />
                    )}
                    {clip.durationSec}s
                  </span>
                  <p className="truncate px-1.5 py-1 text-[9px] font-medium text-white/60">
                    {clip.label}
                  </p>
                </button>
              )
            })}
          </div>
        </Panel>

        {/* Overlay style */}
        <Panel className="p-4">
          <p className="label">Telemetry overlay</p>
          <h2 className="mt-1 font-display text-base font-semibold text-white">Choose a style</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {overlays.map((item) => {
              const selected = overlayId === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOverlayId(item.id)}
                  className={cx(
                    'rounded-2xl border p-3 text-left transition',
                    selected
                      ? 'border-crimson-500/45 bg-crimson-500/[0.08]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                  )}
                >
                  <Icon className={cx('h-4 w-4', selected ? 'text-crimson-300' : 'text-white/40')} />
                  <p className="mt-2 text-[11px] font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-white/35">
                    {item.description}
                  </p>
                </button>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Export panel */}
      <div className="min-w-0 space-y-4">
        <Panel className="p-4">
          <p className="label">Export settings</p>
          <h2 className="mt-1 font-display text-base font-semibold text-white">
            Reel & Shorts
          </h2>

          <div className="mt-3 space-y-1.5">
            {(
              [
                { value: '720p', label: '720p · free', locked: false },
                { value: '1080p', label: '1080p · free', locked: false },
                { value: '4k', label: '4K UHD · PRO', locked: !isPro },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.locked) {
                    openPaywall('4K exports are unlocked with Road Captain PRO.')
                    return
                  }
                  setResolution(option.value)
                }}
                className={cx(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[11px] transition',
                  resolution === option.value
                    ? 'border-crimson-500/40 bg-crimson-500/[0.08] text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20',
                )}
              >
                <span className="flex items-center gap-2">
                  {option.locked ? <Lock className="h-3 w-3 text-amber-300" /> : null}
                  {option.label}
                </span>
                {resolution === option.value ? <Check className="h-3.5 w-3.5 text-crimson-400" /> : null}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <Toggle
              label="Ride & Roam watermark"
              description={
                isPro
                  ? 'Turn this off for clean 4K exports.'
                  : 'Watermark removal requires PRO.'
              }
              checked={watermark}
              onChange={(value) => {
                if (!value && !isPro) {
                  openPaywall('Watermark-free reels are a PRO export option.')
                  return
                }
                setWatermark(value)
              }}
            />
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/60">
              <Share2 className="h-3 w-3" /> Share targets
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Instagram Reels', 'YouTube Shorts', 'WhatsApp Status'].map((target) => (
                <span key={target} className="chip px-2 py-0.5 text-[9px]">
                  {target}
                </span>
              ))}
            </div>
          </div>

          <Button
            full
            size="lg"
            className="mt-3"
            loading={exporting}
            icon={exporting ? undefined : <Zap className="h-4 w-4" />}
            onClick={exportReel}
          >
            {exporting ? `Rendering ${progress}%` : `Export ${resolution.toUpperCase()} reel`}
          </Button>

          {exporting ? <ProgressBar value={progress} tone="crimson" className="mt-2.5" /> : null}

          {exportProgressCopy(exported, resolution)}

          <p className="mt-2 text-center text-[9px] leading-relaxed text-white/25">
            Rendering happens on-device in the browser. Production offloads 4K to a worker queue.
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <Wand2 className="h-3.5 w-3.5 text-cyber-300" /> AI caption
            </p>
            <button
              type="button"
              onClick={generateCaption}
              disabled={captionLoading}
              className="text-[10px] font-semibold text-cyber-300 hover:text-cyber-200 disabled:opacity-50"
            >
              {captionLoading ? 'Drafting…' : caption ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          <div className="mt-2.5 min-h-[74px] rounded-2xl border border-white/10 bg-ink-950/50 p-3">
            {captionLoading ? (
              <div className="flex items-center gap-2 py-3 text-[10px] text-white/35">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemini is writing from ride telemetry…
              </div>
            ) : caption ? (
              <p className="text-[11px] leading-relaxed text-white/70">{caption}</p>
            ) : (
              <p className="py-3 text-[10px] leading-relaxed text-white/25">
                Generate a caption from your route, telemetry overlay and pack name.
              </p>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              size="xs"
              variant="secondary"
              full
              icon={<Copy className="h-3 w-3" />}
              disabled={!caption}
              onClick={async () => {
                const ok = await copyToClipboard(caption)
                pushToast(ok ? 'Caption copied' : 'Copy failed', caption, ok ? 'success' : 'warn')
              }}
            >
              Copy caption
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => pushToast('Draft saved', 'Caption saved to this ride’s media vault.', 'success')}
              icon={<Sparkles className="h-3 w-3" />}
            >
              Save
            </Button>
          </div>
        </Panel>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-3 w-3" /> PRO conversion driver
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/45">
            Free riders export 720p with a watermark. PRO unlocks 4K, no watermark, and the
            telemetry pack.
          </p>
          {!isPro ? (
            <Button
              size="xs"
              variant="secondary"
              full
              className="mt-2"
              onClick={() => openPaywall('Unlock 4K, watermark-free reels.')}
            >
              Go PRO from ₹199/mo
            </Button>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-pack-400">
              <Check className="h-3 w-3" /> 4K unlocked on this device
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const exportProgressCopy = (exported: boolean, resolution: string) => {
  if (!exported) return null
  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-pack-500/25 bg-pack-500/[0.07] px-2.5 py-2">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pack-400" />
      <p className="text-[10px] leading-relaxed text-white/55">
        <span className="font-semibold text-white">{resolution.toUpperCase()} reel ready.</span> Saved
        to your media vault — share it from the reel preview.
      </p>
    </div>
  )
}

const HostRideForm = () => {
  const { data: clubs } = useClubs()
  const joinedClubIds = useAppStore((state) => state.joinedClubIds)
  const addLocalRide = useAppStore((state) => state.addLocalRide)
  const pushToast = useAppStore((state) => state.pushToast)

  const defaultStart = useMemo(() => {
    const date = new Date(minutesFromNow(60 * 28))
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T05:30`
  }, [])

  const [title, setTitle] = useState('')
  const [route, setRoute] = useState('')
  const [meetup, setMeetup] = useState('')
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState('160')
  const [startTime, setStartTime] = useState(defaultStart)
  const [clubId, setClubId] = useState(joinedClubIds[0] ?? clubs[0]?.id ?? '')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [maxRiders, setMaxRiders] = useState('20')
  const [splitEnabled, setSplitEnabled] = useState(true)
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Ride['difficulty']>('Spirited')
  const [createdId, setCreatedId] = useState<string | null>(null)

  const ready = title.trim().length > 3 && route.trim().length > 3 && meetup.trim().length > 2

  const submit = () => {
    if (!ready) {
      pushToast('A few details missing', 'Add a title, route and meetup point to publish.', 'warn')
      return
    }
    const km = Math.max(10, Number(distance) || 120)
    const id = uid('ride')
    const club = clubs.find((item) => item.id === clubId)
    const ride: Ride = {
      id,
      clubId: clubId || clubs[0]?.id || 'c_phog',
      captainId: currentUserId,
      title: title.trim(),
      routeSummary: route.trim(),
      description:
        description.trim() ||
        `Pack run hosted by ${club?.name ?? 'an independent pack'}. Full tank before meetup, arrive 15 minutes early, no one gets dropped.`,
      regionScope: club?.region === 'Global' ? 'Global' : 'Near Me',
      distanceLabel: `${km} km`,
      distanceKm: km,
      startTime: new Date(startTime).toISOString(),
      meetupLabel: meetup.trim(),
      meetupCoords: { lat: 30.901 + Math.random() * 0.08, lng: 75.8573 + Math.random() * 0.1 },
      destinationCoords: { lat: 30.8983 + Math.random() * 0.5, lng: 76.9656 + Math.random() * 0.4 },
      visibility,
      status: 'upcoming',
      maxRiders: Math.max(2, Number(maxRiders) || 20),
      splitEnabled,
      likesCount: 0,
      commentCount: 0,
      hashtags: [
        '#NewRide',
        '#RideAndRoam',
        club ? `#${club.handle}` : '#PackRun',
        destination.trim() ? `#${destination.trim().replace(/\s+/g, '')}` : '#SundayRun',
      ],
      waypoints: [
        { label: meetup.trim(), note: 'Meetup · arrive 15 min early', km: 0 },
        { label: destination.trim() || 'Destination', note: 'Breakfast stop', km: Math.round(km * 0.6) },
        { label: 'Route end', note: 'Regroup & ride home', km },
      ],
      participantIds: [currentUserId],
      art: {
        palette: (['sunset', 'alpine', 'coast', 'desert', 'night'] as const)[Math.floor(Math.random() * 5)],
        seed: Math.floor(Math.random() * 90) + 1,
      },
      difficulty,
    }
    addLocalRide(ride)
    setCreatedId(id)
    pushToast('Ride published', 'Your pack can RSVP now. Share the invite link.', 'success')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Panel className="p-4 sm:p-5">
          <p className="label">Host a Sunday ride</p>
          <h2 className="mt-1 font-display text-base font-semibold text-white">
            Set the meetup, the pack does the rest
          </h2>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="label mb-1.5 block" htmlFor="ride-title">
                Ride title
              </label>
              <input
                id="ride-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sunday Sunrise Run: Ludhiana → Kasauli"
                className="field"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {['Sunrise run', 'Dhaba crawl', 'Coastal loop', 'Night ride'].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setTitle(idea === 'Sunrise run' ? 'Sunday Sunrise Run: Ludhiana → Kasauli' : `${idea} with the pack`)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-white/40 hover:text-white/70"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-route">
                  Route summary
                </label>
                <input
                  id="ride-route"
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                  placeholder="Ludhiana → Kasauli via NH-44"
                  className="field"
                />
              </div>
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-distance">
                  Distance (km)
                </label>
                <input
                  id="ride-distance"
                  type="number"
                  min={10}
                  max={2000}
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-meetup">
                  Meetup point
                </label>
                <input
                  id="ride-meetup"
                  value={meetup}
                  onChange={(event) => setMeetup(event.target.value)}
                  placeholder="Sunrise Dhaba, NH-44"
                  className="field"
                />
              </div>
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-destination">
                  Destination
                </label>
                <input
                  id="ride-destination"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Kasauli Ridge"
                  className="field"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-time">
                  Date & time
                </label>
                <input
                  id="ride-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-club">
                  Club
                </label>
                <select
                  id="ride-club"
                  value={clubId}
                  onChange={(event) => setClubId(event.target.value)}
                  className="field appearance-none"
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id} className="bg-ink-900">
                      {club.badgeEmoji} {club.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="label mb-1.5">Visibility</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { value: 'public', label: '🔓 Public', hint: 'Anyone' },
                      { value: 'group_only', label: '🔒 Group only', hint: 'Members' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cx(
                        'rounded-xl border px-2 py-2 text-left transition',
                        visibility === option.value
                          ? 'border-cyber-400/40 bg-cyber-400/[0.08]'
                          : 'border-white/10 bg-white/[0.02]',
                      )}
                    >
                      <span className="block text-[10px] font-semibold text-white">{option.label}</span>
                      <span className="block text-[9px] text-white/30">{option.hint} can join</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label mb-1.5 block" htmlFor="ride-max">
                  Max riders
                </label>
                <input
                  id="ride-max"
                  type="number"
                  min={2}
                  max={200}
                  value={maxRiders}
                  onChange={(event) => setMaxRiders(event.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="ride-description">
                Captain's brief
              </label>
              <textarea
                id="ride-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Full tank before meetup. Sweep stays behind the slowest rider. No one gets dropped."
                className="field resize-none"
              />
            </div>

            <div>
              <p className="label mb-1.5">Pace</p>
              <div className="flex gap-1.5">
                {(['Chill', 'Spirited', 'Hardcore'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDifficulty(option)}
                    className={cx(
                      'flex-1 rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition',
                      difficulty === option
                        ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300'
                        : 'border-white/10 bg-white/[0.02] text-white/40',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <Toggle
                label="AI tank split enabled"
                description="Riders can scan receipts and split fuel, dhaba bills and tolls automatically."
                checked={splitEnabled}
                onChange={setSplitEnabled}
              />
            </div>

            <Button
              full
              size="lg"
              onClick={submit}
              icon={<CalendarClock className="h-4 w-4" />}
              disabled={!ready}
            >
              Publish ride to the pack
            </Button>
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <Panel className="overflow-hidden">
          <RideArtwork
            art={{ palette: 'sunset', seed: 17 }}
            className="h-[150px] w-full"
            showBike
          />
          <div className="p-4">
            <p className="label">Live preview</p>
            <h3 className="mt-1.5 font-display text-sm font-semibold leading-snug text-white">
              {title || 'Your ride title appears here'}
            </h3>
            <p className="mt-1 text-[11px] text-white/40">
              {route || 'Route summary'} · {distance || '0'} km
            </p>
            <div className="mt-3 space-y-1.5 text-[10px] text-white/40">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-crimson-400" /> {meetup || 'Meetup point'}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3 text-cyber-300" />
                {startTime ? new Date(startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Date & time'}
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-white/30" /> {maxRiders} rider cap · {visibility === 'public' ? 'public' : 'group only'}
              </p>
            </div>
          </div>
        </Panel>

        {createdId ? (
          <Panel className="border-pack-500/25 bg-pack-500/[0.05] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-pack-400">
              <Check className="h-4 w-4" /> Ride published
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              Your pack can RSVP now. Open the briefing to share the WhatsApp invite.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button size="xs" full onClick={() => navigate(`/ride/${createdId}`)}>
                Open briefing
              </Button>
              <Button size="xs" variant="secondary" onClick={() => setCreatedId(null)}>
                New
              </Button>
            </div>
          </Panel>
        ) : null}

        <Panel className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Sparkles className="h-3.5 w-3.5 text-cyber-300" /> Captain checklist
          </p>
          <div className="mt-2.5 space-y-2 text-[10px] leading-relaxed text-white/45">
            {[
              'Full tank and tyre pressures checked before roll-out.',
              'Sweep and medic assigned in the roster after publishing.',
              'Share the GPX with riders on PRO before the mountain leg.',
              'Drop the meetup pin in the pack chat 12 hours before.',
            ].map((item) => (
              <p key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-pack-400" /> {item}
              </p>
            ))}
          </div>
        </Panel>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40">
            <Crown className="h-3 w-3 text-amber-300" /> Multi-club hosting
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
            You can host under any club you belong to. Group-only rides never appear in the public
            feed.
          </p>
        </div>
      </div>
    </div>
  )
}
