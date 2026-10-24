import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  Compass,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { Club, ClubPrivacy, Region } from '@/types'
import {
  Button,
  EmptyState,
  Modal,
  Pill,
  SectionHeading,
  Toggle,
  Verified,
} from '@/components/ui'
import { AvatarStack } from '@/components/ui'
import { useClubs } from '@/lib/data'
import { channels, currentUserId, profileMap } from '@/lib/mockData'
import { useAppStore } from '@/store/useAppStore'
import { navigate } from '@/lib/router'
import { cx, uid } from '@/lib/format'

const styles = [
  'All styles',
  'Cruisers & Touring',
  'ADV & Off-road',
  'Sport & Canyon',
  'Cafe Racers',
  'Classics',
  'Touring',
  'Desert ADV',
]

const badges = ['🏍️', '🦅', '🏔️', '🌊', '☕', '🐪', '🏜️', '🎯', '🔥', '⚡']

export const ClubsDirectoryPage = () => {
  const { data: clubs } = useClubs()
  const joinedClubIds = useAppStore((state) => state.joinedClubIds)
  const toggleJoinClub = useAppStore((state) => state.toggleJoinClub)
  const addLocalClub = useAppStore((state) => state.addLocalClub)
  const pushToast = useAppStore((state) => state.pushToast)

  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<'all' | Region>('all')
  const [style, setStyle] = useState('All styles')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clubs
      .filter((club) => {
        if (region !== 'all' && club.region !== region) return false
        if (style !== 'All styles' && club.ridingStyle !== style) return false
        if (!q) return true
        return `${club.name} ${club.handle} ${club.city} ${club.ridingStyle} ${club.description}`
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => b.memberCount - a.memberCount)
  }, [clubs, query, region, style])

  const myClubs = clubs.filter((club) => joinedClubIds.includes(club.id))
  const totalRiding = clubs.reduce((sum, club) => sum + club.ridingNow, 0)

  const handleJoin = (club: Club) => {
    if (club.privacy === 'invite_only' && !joinedClubIds.includes(club.id)) {
      pushToast('Invite requested', `${club.name} captains will review your request.`, 'success')
      return
    }
    toggleJoinClub(club.id)
  }

  const openLounge = (club: Club) => {
    const channel =
      channels.find((item) => item.clubId === club.id) ??
      channels.find((item) => item.type === 'club')
    navigate(channel ? `/chat/${channel.id}` : '/chat')
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-cyber-500/12 via-ink-900 to-crimson-500/10 p-5 sm:p-6">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cyber-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label flex items-center gap-1.5">
              <Compass className="h-3 w-3" /> Multi-club directory
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Find your people.
            </h1>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/45">
              Join as many packs as you ride with — Sunday cruisers, Himalayan ADV, canyon carvers
              and late-night cafe racers.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="font-display text-xl font-bold text-white">{clubs.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-white/35">clubs</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-xl font-bold text-pack-400">{totalRiding}</p>
              <p className="text-[9px] uppercase tracking-wider text-white/35">riding now</p>
            </div>
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
              className="ml-1"
            >
              Create club
            </Button>
          </div>
        </div>
      </section>

      {myClubs.length ? (
        <div>
          <SectionHeading eyebrow="Your memberships" title="My clubs" />
          <div className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
            {myClubs.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => openLounge(club)}
                className="flex min-w-[190px] items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left transition hover:border-white/20"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ background: `${club.accent}20`, border: `1px solid ${club.accent}35` }}
                >
                  {club.badgeEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white">{club.name}</p>
                  <p className="text-[9px] text-white/35">
                    {club.ridingNow} riding · open lounge
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by city, bike style or club name…"
            className="field pl-11 pr-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear club search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            {(
              [
                { value: 'all', label: 'All regions' },
                { value: 'India', label: '🇮🇳 India' },
                { value: 'Global', label: '🌍 Global' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRegion(option.value)}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-[10px] font-semibold transition',
                  region === option.value
                    ? 'border-cyber-400/40 bg-cyber-400/10 text-cyber-300'
                    : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {styles.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStyle(option)}
                className={cx(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition',
                  style === option
                    ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300'
                    : 'border-white/10 bg-white/[0.02] text-white/35 hover:text-white/60',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((club, index) => {
            const joined = joinedClubIds.includes(club.id)
            return (
              <motion.article
                key={club.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2) }}
                className="group card card-hover overflow-hidden"
              >
                <ClubBanner club={club} joined={joined} />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-white">
                        <span className="truncate">{club.name}</span>
                        {club.verified ? <Verified className="h-3.5 w-3.5" /> : null}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/35">
                        <MapPin className="h-2.5 w-2.5" /> {club.city} · {club.region}
                        <span className="text-white/15">•</span> est. {club.founded}
                      </p>
                    </div>
                    <Pill
                      tone={club.privacy === 'public' ? 'cyan' : 'amber'}
                      className="shrink-0 px-2 py-0.5 text-[8px]"
                    >
                      {club.privacy === 'public' ? 'Public' : 'Invite only'}
                    </Pill>
                  </div>

                  <p className="mt-2 line-clamp-2 min-h-[32px] text-[11px] leading-relaxed text-white/40">
                    {club.description}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="chip px-2 py-0.5 text-[9px]">{club.ridingStyle}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-pack-500/25 bg-pack-500/10 px-2 py-0.5 text-[9px] font-semibold text-pack-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-pack-400" />
                      {club.ridingNow} riding now
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2">
                      <AvatarStack
                        people={club.memberIds
                          .map((id) => profileMap[id])
                          .filter(Boolean)
                          .map((profile) => ({
                            id: profile.id,
                            fullName: profile.fullName,
                            accent: profile.accent,
                          }))}
                        max={3}
                        size="xs"
                      />
                      <div>
                        <p className="flex items-center gap-1 text-[10px] font-semibold text-white/70">
                          <Users className="h-2.5 w-2.5" /> {club.memberCount.toLocaleString()}
                        </p>
                        <p className="text-[8px] uppercase tracking-wider text-white/25">members</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {joined ? (
                        <>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => openLounge(club)}
                            icon={<MessageCircle className="h-3 w-3" />}
                          >
                            Lounge
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => toggleJoinClub(club.id)}
                            className="px-2 text-white/40"
                          >
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          onClick={() => handleJoin(club)}
                          icon={
                            club.privacy === 'public' ? (
                              <UserPlus className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )
                          }
                        >
                          {club.privacy === 'public' ? 'Join club' : 'Request invite'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="No clubs match that search"
          description="Try another city or bike style — or launch your own club and invite the pack."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>
              Create a club
            </Button>
          }
        />
      )}

      <CreateClubModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(club) => {
          addLocalClub(club)
          toggleJoinClub(club.id)
          setCreateOpen(false)
          pushToast('Club launched', `${club.name} is live. Invite your pack from the club lounge.`, 'success')
        }}
      />
    </div>
  )
}

const ClubBanner = ({ club, joined }: { club: Club; joined: boolean }) => (
  <div className="relative h-[104px] overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(120% 120% at 18% 0%, ${club.accent}55, transparent 60%), radial-gradient(120% 120% at 92% 20%, ${club.accent}25, transparent 55%), linear-gradient(160deg, #12121D, #08080F)`,
      }}
    />
    <svg className="absolute inset-0 h-full w-full opacity-[0.14]" preserveAspectRatio="none" viewBox="0 0 300 100">
      {[0, 1, 2, 3, 4].map((line) => (
        <path
          key={line}
          d={`M-20 ${28 + line * 18} Q 80 ${8 + line * 20} 160 ${34 + line * 16} T 320 ${20 + line * 18}`}
          fill="none"
          stroke="#fff"
          strokeWidth="1"
        />
      ))}
    </svg>
    <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />

    <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 text-2xl backdrop-blur-sm"
        style={{ background: `${club.accent}22` }}
      >
        {club.badgeEmoji}
      </span>
      <div className="flex items-center gap-1.5">
        {joined ? (
          <span className="rounded-full border border-pack-400/30 bg-ink-950/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-pack-400 backdrop-blur">
            Member
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-ink-950/60 px-2 py-0.5 text-[8px] font-semibold text-white/50 backdrop-blur">
          @{club.handle}
        </span>
      </div>
    </div>
  </div>
)

const CreateClubModal = ({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (club: Club) => void
}) => {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState<Region>('India')
  const [style, setStyle] = useState('Cruisers & Touring')
  const [privacy, setPrivacy] = useState<ClubPrivacy>('public')
  const [badge, setBadge] = useState('🏍️')
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!name.trim() || !city.trim()) return
    const slug = (handle.trim() || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 20)
    onCreate({
      id: uid('club'),
      name: name.trim(),
      handle: slug,
      description:
        description.trim() ||
        `A new ${style.toLowerCase()} pack based in ${city.trim()}. Ride captain: ${profileMap[currentUserId].fullName}.`,
      city: city.trim(),
      region,
      ridingStyle: style,
      badgeEmoji: badge,
      privacy,
      verified: false,
      memberCount: 1,
      ridingNow: 0,
      accent: '#22D3EE',
      createdBy: currentUserId,
      memberIds: [currentUserId],
      founded: String(new Date().getFullYear()),
    })
    setName('')
    setHandle('')
    setCity('')
    setDescription('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Launch a riding club"
      subtitle="Any rider can start a pack. You become the first Road Captain and control the invite list."
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={onClose}>
            Cancel
          </Button>
          <Button full onClick={submit} disabled={!name.trim() || !city.trim()} icon={<ShieldCheck className="h-4 w-4" />}>
            Create club
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div>
          <label className="label mb-1.5 block" htmlFor="club-name">
            Club name
          </label>
          <input
            id="club-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Punjab Harley Owners"
            className="field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-1.5 block" htmlFor="club-handle">
              Handle
            </label>
            <input
              id="club-handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="phog"
              className="field"
            />
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor="club-city">
              Base city
            </label>
            <input
              id="club-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ludhiana"
              className="field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label mb-1.5">Region</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['India', 'Global'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRegion(option)}
                  className={cx(
                    'rounded-xl border px-2 py-2 text-[11px] font-semibold transition',
                    region === option
                      ? 'border-cyber-400/40 bg-cyber-400/10 text-cyber-300'
                      : 'border-white/10 bg-white/[0.03] text-white/40',
                  )}
                >
                  {option === 'India' ? '🇮🇳 India' : '🌍 Global'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor="club-style">
              Riding style
            </label>
            <select
              id="club-style"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="field appearance-none"
            >
              {styles.slice(1).map((option) => (
                <option key={option} value={option} className="bg-ink-900">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="label mb-1.5">Club badge</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBadge(option)}
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-xl border text-base transition',
                  badge === option
                    ? 'border-crimson-500/50 bg-crimson-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label mb-1.5 block" htmlFor="club-description">
            Short description
          </label>
          <textarea
            id="club-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Sunday sunrise runs on NH-44. Cruisers and touring rigs welcome."
            className="field resize-none"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <Toggle
            label={privacy === 'public' ? 'Public club' : 'Invite-only pack'}
            description={
              privacy === 'public'
                ? 'Anyone can find the club and request to join. Group-only rides stay hidden.'
                : 'Only riders with an invite link can see the lounge and group rides.'
            }
            checked={privacy === 'invite_only'}
            onChange={(value) => setPrivacy(value ? 'invite_only' : 'public')}
          />
        </div>

        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-white/30">
          <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
          Clubs are free forever. You can transfer captaincy or archive the club from the lounge
          settings.
        </p>
      </div>
    </Modal>
  )
}
