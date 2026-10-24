import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Bike,
  CalendarClock,
  Crown,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Avatar, IconButton, Logo, Modal, Pill } from '@/components/ui'
import { profileMap, currentUserId } from '@/lib/mockData'
import { useClubs, useRides } from '@/lib/data'
import { useAppStore } from '@/store/useAppStore'
import { navigate, type RouteName } from '@/lib/router'
import { cx, relativeTime } from '@/lib/format'

const notifications = [
  {
    id: 'n1',
    icon: CalendarClock,
    tone: 'text-cyber-300',
    title: 'Sunday Sunrise Run is live',
    body: 'Arjun started the ride 2h ago · 9 riders checked in.',
    at: new Date(Date.now() - 12 * 60_000).toISOString(),
    unread: true,
  },
  {
    id: 'n2',
    icon: Users,
    tone: 'text-crimson-400',
    title: 'Kabir joined your pack',
    body: 'He is sweeping for Zoya on the Dharampur climb.',
    at: new Date(Date.now() - 42 * 60_000).toISOString(),
    unread: true,
  },
  {
    id: 'n3',
    icon: Sparkles,
    tone: 'text-amber-300',
    title: 'Your reel is ready to cut',
    body: '12 clips from today are in the shared media vault.',
    at: new Date(Date.now() - 96 * 60_000).toISOString(),
    unread: false,
  },
]

export const TopBar = ({ active }: { active: RouteName }) => {
  const isPro = useAppStore((state) => state.isPro)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const { data: rides } = useRides()
  const { data: clubs } = useClubs()
  const me = profileMap[currentUserId]

  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [unread, setUnread] = useState(notifications.filter((n) => n.unread).length)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (value: string) => !q || value.toLowerCase().includes(q)
    return {
      rides: rides.filter((ride) => match(`${ride.title} ${ride.routeSummary} ${ride.hashtags.join(' ')}`)).slice(0, 4),
      clubs: clubs.filter((club) => match(`${club.name} ${club.city} ${club.ridingStyle}`)).slice(0, 3),
      riders: Object.values(profileMap)
        .filter((profile) => match(`${profile.fullName} ${profile.handle} ${profile.primaryBike}`))
        .slice(0, 3),
    }
  }, [query, rides, clubs])

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const openResult = (path: string) => {
    closeSearch()
    navigate(path)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[62px] max-w-6xl items-center gap-3 px-4 sm:h-[68px] sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="shrink-0 rounded-xl transition hover:opacity-85"
            aria-label="Ride & Roam home"
          >
            <Logo />
          </button>

          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white md:flex"
          >
            <MapPin className="h-3.5 w-3.5 text-crimson-400" />
            Ludhiana, IN
            <span className="ml-0.5 h-1 w-1 rounded-full bg-white/25" />
            <span className="text-white/40">Near Me</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs text-white/35 transition hover:border-white/20 hover:text-white/60 sm:flex sm:w-56 lg:w-72"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search rides, clubs, riders</span>
            <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] text-white/30">
              ⌘K
            </kbd>
          </button>

          <IconButton
            label="Search"
            onClick={() => setSearchOpen(true)}
            className="h-9 w-9 sm:hidden"
          >
            <Search className="h-4 w-4" />
          </IconButton>

          <button
            type="button"
            onClick={() => (isPro ? navigate('/garage') : openPaywall('Go PRO for 4K reels and live pack alerts.'))}
            className={cx(
              'flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition sm:px-3',
              isPro
                ? 'border-amber-400/30 bg-gradient-to-r from-amber-400/20 to-orange-500/10 text-amber-300 hover:border-amber-300/50'
                : 'border-white/15 bg-white/[0.06] text-white/70 hover:border-crimson-400/50 hover:text-white',
            )}
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isPro ? 'PRO' : 'Go PRO'}</span>
          </button>

          <div className="relative">
            <IconButton
              label="Notifications"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="h-9 w-9"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-crimson-400 ring-2 ring-ink-950" />
              ) : null}
            </IconButton>

            {notificationsOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-[308px] overflow-hidden rounded-3xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-2xl sm:w-[340px]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Pack activity
                    </p>
                    <button
                      type="button"
                      onClick={() => setUnread(0)}
                      className="text-[10px] font-semibold text-crimson-400 hover:text-crimson-300"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2">
                    {notifications.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false)
                            if (item.id === 'n1') navigate('/ride/r_sunrise/live')
                            if (item.id === 'n3') navigate('/create')
                          }}
                          className="flex w-full items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.05]"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                            <Icon className={cx('h-4 w-4', item.tone)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-white">
                                {item.title}
                              </span>
                              {item.unread && unread > 0 ? (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-crimson-400" />
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-white/45">
                              {item.body}
                            </span>
                            <span className="mt-1 block text-[10px] text-white/25">
                              {relativeTime(item.at)}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => navigate('/garage')}
            aria-label="Open your garage"
            className="relative rounded-full transition hover:opacity-90"
          >
            <Avatar name={me.fullName} accent={me.accent} size="sm" ring />
            {active === 'garage' ? (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-pack-400" />
            ) : null}
          </button>
        </div>
      </header>

      <Modal
        open={searchOpen}
        onClose={closeSearch}
        title="Search the pack"
        subtitle="Find a ride, a club or a rider. Press ⌘K anywhere."
        size="md"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kasauli, Himalayan ADV, simranrides…"
            className="field pl-11 pr-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-5 space-y-5 pb-2">
          {results.rides.length ? (
            <div>
              <p className="label mb-2">Rides</p>
              <div className="space-y-1">
                {results.rides.map((ride) => (
                  <button
                    key={ride.id}
                    type="button"
                    onClick={() => openResult(`/ride/${ride.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-crimson-400">
                      <Bike className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {ride.title}
                      </span>
                      <span className="block truncate text-[11px] text-white/40">
                        {ride.routeSummary} · {ride.distanceLabel}
                      </span>
                    </span>
                    {ride.status === 'ongoing' ? <Pill tone="live">Live</Pill> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.clubs.length ? (
            <div>
              <p className="label mb-2">Clubs</p>
              <div className="space-y-1">
                {results.clubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => openResult('/clubs')}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-base">
                      {club.badgeEmoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {club.name}
                      </span>
                      <span className="block truncate text-[11px] text-white/40">
                        {club.city} · {club.memberCount} members
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.riders.length ? (
            <div>
              <p className="label mb-2">Riders</p>
              <div className="space-y-1">
                {results.riders.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => openResult('/garage')}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
                  >
                    <Avatar name={profile.fullName} accent={profile.accent} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {profile.fullName}
                        <span className="ml-1.5 text-[10px] font-normal text-white/35">
                          @{profile.handle}
                        </span>
                      </span>
                      <span className="block truncate text-[11px] text-white/40">
                        {profile.primaryBike}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!results.rides.length && !results.clubs.length && !results.riders.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
              <p className="text-sm font-medium text-white">No matches for “{query}”</p>
              <p className="mt-1 text-xs text-white/40">
                Try a city, a bike model, or a hashtag like #NH44.
              </p>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
