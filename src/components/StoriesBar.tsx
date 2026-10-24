import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Headphones, MapPin, Pause, Plus, Volume2, X } from 'lucide-react'
import { Avatar, Button, IconButton, LiveDot } from '@/components/ui'
import { RideArtwork } from '@/components/RideArtwork'
import { profileMap, rideMap, stories as seedStories } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { cx, relativeTime } from '@/lib/format'
import { navigate } from '@/lib/router'
import { playExhaustNote } from '@/lib/exhaustAudio'
import type { Story } from '@/types'

export const StoriesBar = () => {
  const seenStoryIds = useAppStore((state) => state.seenStoryIds)
  const markStorySeen = useAppStore((state) => state.markStorySeen)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  const activeIndex = seedStories.findIndex((story) => story.id === activeId)
  const activeStory = activeIndex >= 0 ? seedStories[activeIndex] : null
  const activeRide = activeStory?.rideId ? rideMap[activeStory.rideId] : null

  useEffect(() => {
    if (!activeStory) return
    setProgress(0)
    setPaused(false)
    markStorySeen(activeStory.id)
  }, [activeStory, markStorySeen])

  useEffect(() => {
    if (!activeStory || paused) return
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) return 100
        return value + 1.6
      })
    }, 90)
    return () => window.clearInterval(timer)
  }, [activeStory, paused])

  useEffect(() => {
    if (progress < 100) return
    if (activeIndex < seedStories.length - 1) {
      setActiveId(seedStories[activeIndex + 1].id)
    } else {
      setActiveId(null)
    }
  }, [progress, activeIndex])

  const openStory = (story: Story) => {
    setActiveId(story.id)
    setProgress(0)
  }

  return (
    <section aria-label="Live rider stories" className="relative">
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <LiveDot />
          <h2 className="font-display text-sm font-semibold tracking-tight text-white">
            Live rider stories
          </h2>
          <span className="hidden text-[10px] text-white/30 sm:inline">· 6s exhaust notes</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="flex items-center gap-1 text-[11px] font-semibold text-white/45 transition hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add yours
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/[0.03] text-white/40 transition group-hover:border-crimson-400/50 group-hover:text-crimson-300">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-medium text-white/45">Your story</span>
        </button>

        {seedStories.map((story) => {
          const profile = profileMap[story.userId]
          if (!profile) return null
          const seen = story.seen || seenStoryIds.includes(story.id)
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => openStory(story)}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 drag-none"
            >
              <span
                className={cx(
                  'relative rounded-full p-[2px] transition-transform group-hover:scale-[1.03]',
                  seen ? 'bg-white/15' : 'bg-[conic-gradient(from_140deg,#F43F5E,#FBBF24,#22D3EE,#A78BFA,#F43F5E)]',
                )}
              >
                <span className="block rounded-full bg-ink-950 p-[2.5px]">
                  <Avatar name={profile.fullName} accent={story.accent} size="lg" />
                </span>
                {story.live ? (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-ink-950 bg-pack-500 px-1.5 py-[1px] text-[7px] font-bold uppercase tracking-wider text-ink-950">
                    Live
                  </span>
                ) : story.audioDb > 0 ? (
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-ink-950 bg-ink-800 px-1.5 py-[1px] text-[7px] font-bold text-white/70">
                    <Volume2 className="h-2 w-2" />
                    {story.audioDb} dB
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium text-white/55 group-hover:text-white/80">
                {profile.fullName.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {activeStory ? (
          <StoryViewer
            key={activeStory.id}
            story={activeStory}
            progress={progress}
            paused={paused}
            setPaused={setPaused}
            hasNext={activeIndex < seedStories.length - 1}
            hasPrev={activeIndex > 0}
            onNext={() =>
              activeIndex < seedStories.length - 1 && setActiveId(seedStories[activeIndex + 1].id)
            }
            onPrev={() => activeIndex > 0 && setActiveId(seedStories[activeIndex - 1].id)}
            onClose={() => setActiveId(null)}
            fallbackArt={activeRide?.art}
            storyIndex={activeIndex}
          />
        ) : null}
      </AnimatePresence>
    </section>
  )
}

const StoryViewer = ({
  story,
  progress,
  paused,
  setPaused,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onClose,
  fallbackArt,
  storyIndex,
}: {
  story: Story
  progress: number
  paused: boolean
  setPaused: (value: boolean) => void
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  fallbackArt?: { palette: 'sunset' | 'alpine' | 'coast' | 'desert' | 'night'; seed: number }
  storyIndex: number
}) => {
  const profile = profileMap[story.userId]
  const muted = useAppStore((state) => state.muted)
  const [playing, setPlaying] = useState(false)
  const art = useMemo(
    () => fallbackArt ?? { palette: 'night' as const, seed: storyIndex * 7 + 3 },
    [fallbackArt, storyIndex],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onNext()
      if (event.key === 'ArrowLeft') onPrev()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused(!paused)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev, paused, setPaused])

  const play = async () => {
    if (muted) return
    setPlaying(true)
    await playExhaustNote(4.2, story.audioDb || 92)
    setPlaying(false)
  }

  if (!profile) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/95 p-0 backdrop-blur-xl sm:p-6"
    >
      <button type="button" aria-label="Close story" className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.96, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        className="relative z-10 flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-ink-900 sm:h-[86vh] sm:rounded-[32px] sm:border sm:border-white/10"
      >
        <RideArtwork art={art} className="absolute inset-0 h-full w-full opacity-90" showBike={false} tint={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-transparent to-ink-950/95" />

        <div className="relative z-10 px-4 pt-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 8 }).map((_, index) => (
              <span
                key={index}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <span
                  className="block h-full rounded-full bg-white transition-[width] duration-100"
                  style={{
                    width:
                      index < storyIndex
                        ? '100%'
                        : index === storyIndex
                          ? `${Math.min(100, progress)}%`
                          : '0%',
                  }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar name={profile.fullName} accent={story.accent} size="sm" ring />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{profile.fullName}</p>
              <p className="truncate text-[10px] text-white/50">
                {story.label} · {relativeTime(story.postedAt)}
              </p>
            </div>
            <IconButton label="Close story" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="relative z-10 mt-auto px-5 pb-6">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
            <MapPin className="h-3 w-3 text-crimson-400" />
            {story.label} · {profile.city}
          </span>
          <h3 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-white drop-shadow">
            {story.headline}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/55">
            <span className="truncate">{profile.primaryBike}</span>
          </p>

          <div className="mt-5 flex items-center gap-2.5">
            {story.audioDb > 0 ? (
              <button
                type="button"
                onClick={play}
                disabled={muted}
                className="flex flex-1 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-3.5 py-3 text-left backdrop-blur-xl transition hover:bg-white/[0.12] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-500 text-white">
                  {playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-white">
                    {playing ? 'Playing exhaust note…' : `Exhaust note · ${story.audioDb} dB`}
                  </span>
                  <span className="mt-1.5 flex h-3 items-end gap-[2px]">
                    {Array.from({ length: 26 }).map((_, index) => (
                      <span
                        key={index}
                        className={cx(
                          'w-[2px] rounded-full bg-crimson-400/70',
                          playing && 'animate-pulse',
                        )}
                        style={{
                          height: `${4 + ((index * 7 + story.audioDb) % 12)}px`,
                          animationDelay: `${index * 40}ms`,
                        }}
                      />
                    ))}
                  </span>
                </span>
              </button>
            ) : null}
            <div className="flex gap-2">
              <IconButton label="Previous story" onClick={onPrev} disabled={!hasPrev}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={paused ? 'Resume story' : 'Pause story'}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <ChevronRight className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </IconButton>
            </div>
          </div>

          {story.rideId ? (
            <Button
              variant="secondary"
              size="sm"
              full
              className="mt-2.5"
              icon={<MapPin className="h-3.5 w-3.5" />}
              onClick={() => {
                onClose()
                navigate(`/ride/${story.rideId}`)
              }}
            >
              View this ride
            </Button>
          ) : null}

          {!hasNext ? (
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-white/30">
              <Headphones className="h-3 w-3" /> End of today’s pack stories
            </p>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
