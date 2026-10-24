import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ChatMessage,
  Club,
  Expense,
  PingEvent,
  PrivacyFilter,
  Ride,
  ScopeFilter,
  Toast,
  ToastTone,
} from '@/types'
import { uid } from '@/lib/format'

interface FeatureFlags {
  sponsoredPitstops: boolean
  liveIntercom: boolean
  reelStudio4k: boolean
  nearMeRadar: boolean
}

interface AppState {
  // identity / entitlement
  isPro: boolean
  setPro: (value: boolean) => void

  // social graph (demo-persisted)
  joinedRideIds: string[]
  toggleJoinRide: (id: string) => void
  likedRideIds: string[]
  toggleLikeRide: (id: string) => void
  joinedClubIds: string[]
  toggleJoinClub: (id: string) => void

  // feed filters
  scope: ScopeFilter
  setScope: (scope: ScopeFilter) => void
  privacy: PrivacyFilter
  setPrivacy: (privacy: PrivacyFilter) => void

  // locally created content
  localRides: Ride[]
  addLocalRide: (ride: Ride) => void
  localClubs: Club[]
  addLocalClub: (club: Club) => void
  sentMessages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  expenses: Expense[]
  addExpense: (expense: Expense) => void
  pings: PingEvent[]
  addPing: (ping: PingEvent) => void
  seenStoryIds: string[]
  markStorySeen: (id: string) => void

  // feature flags (founder console)
  flags: FeatureFlags
  toggleFlag: (key: keyof FeatureFlags) => void

  // ui
  paywall: { open: boolean; reason: string } | null
  openPaywall: (reason?: string) => void
  closePaywall: () => void
  toasts: Toast[]
  pushToast: (message: string, description?: string, tone?: ToastTone) => void
  dismissToast: (id: string) => void
  muted: boolean
  toggleMuted: () => void
  activeStoryId: string | null
  setActiveStoryId: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isPro: true,
      setPro: (value) => {
        set({ isPro: value })
        get().pushToast(
          value ? 'Road Captain PRO unlocked' : 'PRO switched off',
          value
            ? '4K reels, offline GPX, family tracking and pack-spread alerts are live.'
            : 'You are back on the free rider tier.',
          value ? 'success' : 'default',
        )
      },

      joinedRideIds: ['r_sunrise', 'r_manali'],
      toggleJoinRide: (id) => {
        const joined = get().joinedRideIds.includes(id)
        set({
          joinedRideIds: joined
            ? get().joinedRideIds.filter((rideId) => rideId !== id)
            : [...get().joinedRideIds, id],
        })
        get().pushToast(
          joined ? 'RSVP removed' : 'You are in the pack',
          joined ? 'The Road Captain has been notified.' : 'Meetup pin and pack chat unlocked.',
          joined ? 'default' : 'success',
        )
      },

      likedRideIds: [],
      toggleLikeRide: (id) => {
        const liked = get().likedRideIds.includes(id)
        set({
          likedRideIds: liked
            ? get().likedRideIds.filter((rideId) => rideId !== id)
            : [...get().likedRideIds, id],
        })
      },

      joinedClubIds: ['c_phog', 'c_himalayan', 'c_bullet'],
      toggleJoinClub: (id) => {
        const joined = get().joinedClubIds.includes(id)
        set({
          joinedClubIds: joined
            ? get().joinedClubIds.filter((clubId) => clubId !== id)
            : [...get().joinedClubIds, id],
        })
        get().pushToast(
          joined ? 'Left the club' : 'Club joined',
          joined ? 'You can rejoin any time.' : 'Club lounge and group-only rides are now visible.',
          joined ? 'default' : 'success',
        )
      },

      scope: 'all',
      setScope: (scope) => set({ scope }),
      privacy: 'all',
      setPrivacy: (privacy) => set({ privacy }),

      localRides: [],
      addLocalRide: (ride) => set({ localRides: [ride, ...get().localRides] }),
      localClubs: [],
      addLocalClub: (club) => set({ localClubs: [club, ...get().localClubs] }),
      sentMessages: [],
      addMessage: (message) => set({ sentMessages: [...get().sentMessages, message] }),
      expenses: [],
      addExpense: (expense) => set({ expenses: [expense, ...get().expenses] }),
      pings: [],
      addPing: (ping) => set({ pings: [...get().pings, ping].slice(-40) }),
      seenStoryIds: [],
      markStorySeen: (id) =>
        set({
          seenStoryIds: get().seenStoryIds.includes(id)
            ? get().seenStoryIds
            : [...get().seenStoryIds, id],
        }),

      flags: {
        sponsoredPitstops: true,
        liveIntercom: true,
        reelStudio4k: true,
        nearMeRadar: true,
      },
      toggleFlag: (key) => {
        const next = { ...get().flags, [key]: !get().flags[key] }
        set({ flags: next })
        get().pushToast(
          `Flag ${key} ${next[key] ? 'enabled' : 'disabled'}`,
          'Runtime change applied — no redeploy needed.',
          'default',
        )
      },

      paywall: null,
      openPaywall: (reason = 'Unlock the full Road Captain toolkit.') =>
        set({ paywall: { open: true, reason } }),
      closePaywall: () => set({ paywall: null }),

      toasts: [],
      pushToast: (message, description, tone = 'default') => {
        const toast: Toast = { id: uid('toast'), message, description, tone }
        set({ toasts: [...get().toasts, toast].slice(-3) })
        window.setTimeout(() => {
          set({ toasts: get().toasts.filter((item) => item.id !== toast.id) })
        }, 4200)
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((item) => item.id !== id) }),
      muted: false,
      toggleMuted: () => set({ muted: !get().muted }),
      activeStoryId: null,
      setActiveStoryId: (id) => set({ activeStoryId: id }),
    }),
    {
      name: 'packpulse.state.v1',
      partialize: (state) => ({
        isPro: state.isPro,
        joinedRideIds: state.joinedRideIds,
        likedRideIds: state.likedRideIds,
        joinedClubIds: state.joinedClubIds,
        localRides: state.localRides,
        localClubs: state.localClubs,
        sentMessages: state.sentMessages,
        expenses: state.expenses,
        pings: state.pings,
        seenStoryIds: state.seenStoryIds,
        flags: state.flags,
        muted: state.muted,
      }),
    },
  ),
)
