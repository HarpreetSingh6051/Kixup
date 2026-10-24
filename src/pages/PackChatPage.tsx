import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Bike,
  CheckCheck,
  Crown,
  MapPin,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
  Radio,
  Search,
  Send,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import type { ChatChannel, ChatMessage } from '@/types'
import { Avatar, Button, EmptyState, Pill } from '@/components/ui'
import { useChatChannels, useChatMessages, useRides } from '@/lib/data'
import { clubMap, currentUserId, profileMap } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { chatPath, navigate } from '@/lib/router'
import { clockTime, relativeTime, uid, cx } from '@/lib/format'
import { playExhaustNote } from '@/lib/exhaustAudio'

const replies = [
  'Copy that — 2 km behind you, keep the pace.',
  'Fuel is at half, I will top up at the next pump.',
  'Sweep has the mirror fixed. Rolling again in 5.',
  'Chai stop confirmed. 20 minutes, no longer 😄',
  'Road is clear up front, watch the gravel after the bridge.',
]

type Filter = 'all' | 'ride' | 'club' | 'dm'

export const PackChatPage = ({ channelId }: { channelId?: string }) => {
  const { data: channelsData } = useChatChannels()
  const { data: messagesData } = useChatMessages()
  const { data: ridesData } = useRides()
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const pushToast = useAppStore((state) => state.pushToast)
  const addMessage = useAppStore((state) => state.addMessage)

  const [filter, setFilter] = useState<Filter>('all')
  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const [intercom, setIntercom] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [readChannels, setReadChannels] = useState<string[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const channels = channelsData ?? []
  const messages = messagesData ?? []
  const rides = ridesData ?? []

  const selected = useMemo(
    () => channels.find((channel) => channel.id === channelId) ?? channels[0] ?? null,
    [channels, channelId],
  )

  const filteredChannels = useMemo(() => {
    if (filter === 'all') return channels
    return channels.filter((channel) => channel.type === filter)
  }, [channels, filter])

  const thread = useMemo(
    () =>
      selected
        ? messages
            .filter((message) => message.channelId === selected.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [messages, selected],
  )

  const searchedThread = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return thread
    return thread.filter((message) => message.text.toLowerCase().includes(q))
  }, [thread, searchQuery])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [thread.length, selected?.id])

  const selectedRide = selected?.rideId ? rides.find((ride) => ride.id === selected.rideId) : null
  const selectedClub = selected?.clubId ? clubMap[selected.clubId] : null
  const selectedDm = selected?.type === 'dm' ? profileMap[selected.memberIds[0]] : null

  const openChannel = (channel: ChatChannel) => {
    setReadChannels((current) => (current.includes(channel.id) ? current : [...current, channel.id]))
    navigate(chatPath(channel.id))
  }

  const send = (text: string, kind: ChatMessage['kind'] = 'text', extra?: Partial<ChatMessage>) => {
    if (!selected) return
    const message: ChatMessage = {
      id: uid('msg'),
      channelId: selected.id,
      senderId: currentUserId,
      text,
      kind,
      createdAt: new Date().toISOString(),
      mine: true,
      ...extra,
    }
    addMessage(message)
    setDraft('')

    const responderId =
      selected.memberIds.find((id) => id !== currentUserId) ?? selected.memberIds[0]
    if (responderId) {
      window.setTimeout(() => {
        addMessage({
          id: uid('msg'),
          channelId: selected.id,
          senderId: responderId,
          text: replies[Math.floor(Math.random() * replies.length)],
          kind: 'text',
          createdAt: new Date().toISOString(),
        })
      }, 1600)
    }
  }

  const sendAudioNote = () => {
    if (!selected || recording) return
    setRecording(true)
    window.setTimeout(() => {
      setRecording(false)
      const db = 95 + Math.floor(Math.random() * 9)
      send(`V-Twin cold start · ${db} dB exhaust note`, 'audio', {
        audioDb: db,
        durationSec: 5,
      })
      pushToast('Exhaust note sent', `${db} dB clip delivered to ${selected.title}.`, 'success')
    }, 2400)
  }

  const playAudio = async (message: ChatMessage) => {
    if (useAppStore.getState().muted) {
      pushToast('Audio is muted', 'Unmute from the garage profile to hear exhaust notes.', 'warn')
      return
    }
    setPlayingId(message.id)
    await playExhaustNote(message.durationSec ?? 4, message.audioDb ?? 96)
    setPlayingId(null)
  }

  const toggleIntercom = () => {
    if (!isPro) {
      openPaywall('Live helmet intercom bridging is a Road Captain PRO feature.')
      return
    }
    setIntercom((value) => !value)
    pushToast(
      intercom ? 'Intercom closed' : 'Intercom bridge live',
      intercom
        ? 'Background voice channel ended for all riders.'
        : 'Cardo, Sena and AirPods riders joined the ride voice channel.',
      intercom ? 'default' : 'success',
    )
  }

  const unreadFor = (channel: ChatChannel) =>
    readChannels.includes(channel.id) || channel.id === selected?.id ? 0 : channel.unread

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Channel list */}
      <aside className={cx('space-y-3', channelId && 'hidden lg:block')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Pack comms</p>
            <h1 className="mt-1 font-display text-lg font-bold tracking-tight text-white">
              Lounges & chats
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clubs')}
            aria-label="Find a club lounge"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'ride', label: 'Rides' },
              { value: 'club', label: 'Clubs' },
              { value: 'dm', label: 'DMs' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cx(
                'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition',
                filter === option.value
                  ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300'
                  : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {filteredChannels.map((channel) => {
            const active = channel.id === selected?.id
            const unread = unreadFor(channel)
            const ride = channel.rideId ? rides.find((item) => item.id === channel.rideId) : null
            const club = channel.clubId ? clubMap[channel.clubId] : null
            const dm = channel.type === 'dm' ? profileMap[channel.memberIds[0]] : null
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => openChannel(channel)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left transition',
                  active
                    ? 'border-white/15 bg-white/[0.07]'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]',
                )}
              >
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-base"
                  style={{ background: `${channel.accent}1F` }}
                >
                  {channel.type === 'ride' ? (
                    <Bike className="h-4 w-4" style={{ color: channel.accent }} />
                  ) : channel.type === 'club' ? (
                    <span>{club?.badgeEmoji ?? '🏍️'}</span>
                  ) : (
                    <Avatar name={dm?.fullName ?? 'Rider'} accent={dm?.accent} size="sm" />
                  )}
                  {ride?.status === 'ongoing' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-pack-400" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold text-white">
                      {channel.title}
                    </span>
                    <span className="shrink-0 text-[9px] text-white/25">
                      {relativeTime(channel.lastActive)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[9.5px] text-white/35">{channel.subtitle}</span>
                    {unread > 0 ? (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-crimson-500 px-1 text-[8px] font-bold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-3 w-3" /> Helmet intercom
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/40">
            Bridge Cardo, Sena and AirPods into one voice channel on PRO.
          </p>
          <Button
            size="xs"
            variant="secondary"
            full
            className="mt-2"
            icon={<Phone className="h-3 w-3" />}
            onClick={toggleIntercom}
          >
            {intercom ? 'End voice channel' : 'Start intercom'}
          </Button>
        </div>
      </aside>

      {/* Thread */}
      <section className={cx('flex flex-col', !channelId && 'hidden lg:flex')}>
        {selected ? (
          <div className="card flex h-[calc(100dvh-190px)] min-h-[460px] flex-col overflow-hidden">
            <header className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-3 py-2.5 sm:px-4">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                aria-label="Back to channels"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-base"
                style={{ background: `${selected.accent}1F` }}
              >
                {selected.type === 'club' ? (
                  selectedClub?.badgeEmoji ?? '🏍️'
                ) : selected.type === 'dm' ? (
                  <Avatar name={selectedDm?.fullName ?? 'Rider'} accent={selectedDm?.accent} size="xs" />
                ) : (
                  <Bike className="h-4 w-4" style={{ color: selected.accent }} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-white">{selected.title}</p>
                  {selectedRide?.status === 'ongoing' ? (
                    <Pill tone="live" className="px-1.5 py-0 text-[8px]">
                      Live
                    </Pill>
                  ) : null}
                  {intercom ? (
                    <Pill tone="crimson" className="px-1.5 py-0 text-[8px]">
                      Voice on
                    </Pill>
                  ) : null}
                </div>
                <p className="truncate text-[9.5px] text-white/35">
                  {selected.type === 'ride'
                    ? `${selected.subtitle} · ${selectedRide?.routeSummary ?? 'pack channel'}`
                    : selected.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                aria-label="Search this conversation"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleIntercom}
                aria-label="Start helmet intercom"
                className={cx(
                  'flex h-8 items-center gap-1.5 rounded-full border px-2 text-[9px] font-semibold transition',
                  intercom
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white',
                )}
              >
                <Phone className="h-3 w-3" />
                <span className="hidden sm:inline">{intercom ? 'Live' : 'Intercom'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  pushToast('Channel options', 'Mute, add riders, or report a channel from here.', 'default')
                }
                aria-label="Channel options"
                className="hidden h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white sm:flex"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </header>

            <AnimatePresence>
              {searchOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden border-b border-white/[0.07] px-3 py-2"
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search messages…"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-8 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-crimson-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchOpen(false)
                      }}
                      aria-label="Close message search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/30 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
              <div className="mx-auto mb-2 w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[9px] text-white/30">
                {selected.type === 'ride'
                  ? 'End-to-end pack channel · positions shared only while riding'
                  : 'Club lounge · be excellent to each other'}
              </div>

              {searchedThread.map((message, index) => {
                const sender = profileMap[message.senderId]
                const mine = message.mine || message.senderId === currentUserId
                const previous = searchedThread[index - 1]
                const showSender = !previous || previous.senderId !== message.senderId

                if (message.kind === 'ping') {
                  return (
                    <div key={message.id} className="flex justify-center py-1">
                      <div className="flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5">
                        <span className="text-xs">📣</span>
                        <p className="text-[10px] font-semibold text-amber-200">
                          {sender?.fullName.split(' ')[0] ?? 'Rider'} broadcast{': '}
                          <span className="uppercase tracking-wide">{message.text}</span>
                        </p>
                        <span className="text-[9px] text-white/25">{clockTime(message.createdAt)}</span>
                      </div>
                    </div>
                  )
                }

                if (message.kind === 'pin') {
                  return (
                    <div key={message.id} className="flex justify-center py-1">
                      <div className="w-full max-w-sm rounded-2xl border border-cyber-400/25 bg-cyber-500/[0.06] p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyber-300">
                          <MapPin className="h-3 w-3" /> Meetup pin dropped
                        </p>
                        <p className="mt-1 text-[11px] text-white/60">{message.text}</p>
                        <p className="mt-1 text-[9px] text-white/25">
                          {sender?.fullName} · {clockTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={message.id}
                    className={cx('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
                  >
                    <div className="w-7 shrink-0">
                      {!mine && showSender ? (
                        <Avatar name={sender?.fullName ?? 'Rider'} accent={sender?.accent} size="xs" />
                      ) : null}
                    </div>

                    <div className={cx('max-w-[82%] sm:max-w-[74%]', mine ? 'items-end' : 'items-start')}>
                      {showSender && !mine ? (
                        <p className="mb-0.5 pl-1 text-[9px] font-semibold text-white/35">
                          {sender?.fullName ?? 'Rider'}
                          {sender?.isPro ? <Crown className="ml-1 inline h-2.5 w-2.5 text-amber-300" /> : null}
                        </p>
                      ) : null}

                      {message.kind === 'audio' ? (
                        <button
                          type="button"
                          onClick={() => playAudio(message)}
                          className={cx(
                            'flex w-[240px] items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left transition',
                            mine
                              ? 'border-crimson-500/30 bg-crimson-500/15 hover:bg-crimson-500/20'
                              : 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08]',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crimson-500 text-white">
                            <Volume2 className={cx('h-3.5 w-3.5', playingId === message.id && 'animate-pulse')} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex h-5 items-center gap-[2px]">
                              {Array.from({ length: 24 }).map((_, bar) => (
                                <span
                                  key={bar}
                                  className={cx(
                                    'w-[2px] rounded-full bg-white/40',
                                    playingId === message.id && 'animate-pulse',
                                  )}
                                  style={{
                                    height: `${3 + ((bar * 5 + (message.audioDb ?? 96)) % 15)}px`,
                                  }}
                                />
                              ))}
                            </span>
                            <span className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[8px] font-semibold text-white/45">
                                {message.audioDb} dB exhaust
                              </span>
                              <span className="font-mono text-[8px] text-white/30">
                                {message.durationSec ?? 4}s
                              </span>
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div
                          className={cx(
                            'rounded-2xl px-3 py-2 text-[11.5px] leading-relaxed',
                            mine
                              ? 'rounded-br-md border border-crimson-500/25 bg-crimson-500/18 text-white'
                              : 'rounded-bl-md border border-white/10 bg-white/[0.055] text-white/80',
                          )}
                        >
                          {message.text}
                        </div>
                      )}

                      <p
                        className={cx(
                          'mt-0.5 flex items-center gap-1 px-1 text-[8.5px] text-white/20',
                          mine ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {clockTime(message.createdAt)}
                        {mine ? <CheckCheck className="h-2.5 w-2.5 text-cyber-400/60" /> : null}
                      </p>
                    </div>
                  </div>
                )
              })}

              {!searchedThread.length ? (
                <div className="py-10 text-center">
                  <p className="text-xs font-medium text-white/50">No messages yet</p>
                  <p className="mt-1 text-[10px] text-white/25">
                    Say hello, drop a meetup pin, or send a 6-second exhaust note.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-white/[0.07] bg-ink-900/60 p-2.5 sm:p-3">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={sendAudioNote}
                  aria-label="Record exhaust note"
                  className={cx(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition',
                    recording
                      ? 'border-crimson-400/60 bg-crimson-500/20 text-crimson-300'
                      : 'border-white/10 bg-white/[0.05] text-white/55 hover:border-crimson-400/40 hover:text-crimson-300',
                  )}
                >
                  {recording ? (
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-crimson-500/20" />
                  ) : null}
                  <Mic className="h-4 w-4" />
                </button>

                <div className="flex min-h-11 flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-crimson-500/40">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && draft.trim()) send(draft.trim())
                    }}
                    placeholder={recording ? 'Recording exhaust note…' : 'Message the pack…'}
                    className="w-full bg-transparent py-2.5 text-[12px] text-white placeholder:text-white/25 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      send('📍 Meetup pin: Sunrise Dhaba, NH-44 · 05:30', 'pin')
                    }
                    aria-label="Drop meetup pin"
                    className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 transition hover:text-cyber-300 sm:flex"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  size="md"
                  onClick={() => draft.trim() && send(draft.trim())}
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="h-11 w-11 shrink-0 !px-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-1.5 flex items-center justify-between px-1">
                <p className="text-[8.5px] text-white/20">
                  Exhaust notes are end-to-end encrypted · max 8s
                </p>
                <button
                  type="button"
                  onClick={() =>
                    pushToast('Live location shared', 'The pack can see your marker for 15 minutes.', 'success')
                  }
                  className="flex items-center gap-1 text-[8.5px] font-semibold text-white/30 hover:text-cyber-300"
                >
                  <Radio className="h-2.5 w-2.5" /> Share live location
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Pick a channel"
            description="Your ride packs, club lounges and direct messages all live here."
          />
        )}
      </section>
    </div>
  )
}
