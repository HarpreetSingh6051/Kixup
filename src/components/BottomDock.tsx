import { motion } from 'framer-motion'
import { Compass, MessageCircle, Plus, User, Users } from 'lucide-react'
import type { RouteName } from '@/lib/router'
import { navigate } from '@/lib/router'
import { cx } from '@/lib/format'

interface DockItem {
  key: string
  label: string
  icon: typeof Compass
  route?: RouteName
  path: string
  badge?: number
}

export const BottomDock = ({
  active,
  unreadCount = 0,
}: {
  active: RouteName
  unreadCount?: number
}) => {
  const items: DockItem[] = [
    { key: 'feed', label: 'Feed', icon: Compass, route: 'feed', path: '/feed' },
    { key: 'clubs', label: 'Clubs', icon: Users, route: 'clubs', path: '/clubs' },
    { key: 'create', label: 'Create', icon: Plus, route: 'create', path: '/create' },
    {
      key: 'chat',
      label: 'Chat',
      icon: MessageCircle,
      route: 'chat',
      path: '/chat',
      badge: unreadCount,
    },
    { key: 'garage', label: 'Garage', icon: User, route: 'garage', path: '/garage' },
  ]

  const isActive = (item: DockItem) => {
    if (item.key === 'feed') return active === 'feed' || active === 'ride' || active === 'live'
    return item.route === active
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-5">
      <div className="pointer-events-auto relative w-full max-w-[430px] sm:max-w-[470px]">
        <div className="absolute -inset-x-6 -bottom-4 -top-6 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent" />
        <div className="flex items-end justify-between gap-1 rounded-[26px] border border-white/10 bg-ink-900/80 px-2 pb-2 pt-1.5 shadow-dock backdrop-blur-2xl sm:px-3">
          {items.map((item) => {
            const activeItem = isActive(item)
            const Icon = item.icon

            if (item.key === 'create') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-label="Create a ride or reel"
                  className="group relative -mt-6 flex flex-1 flex-col items-center"
                >
                  <span className="absolute inset-x-2 -bottom-1 h-8 rounded-full bg-crimson-500/30 blur-xl transition-opacity group-hover:opacity-100" />
                  <motion.span
                    whileTap={{ scale: 0.92 }}
                    className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/25 bg-gradient-to-br from-crimson-400 via-crimson-500 to-rose-600 text-white shadow-[0_14px_34px_-10px_rgba(244,63,94,0.9)]"
                  >
                    <span className="absolute inset-0 rounded-[20px] bg-gradient-to-t from-black/25 to-white/25 opacity-60" />
                    <Plus className="relative h-6 w-6" strokeWidth={2.6} />
                  </motion.span>
                  <span className="mt-1 text-[9px] font-semibold tracking-wide text-white/50">
                    Create
                  </span>
                </button>
              )
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                aria-current={activeItem ? 'page' : undefined}
                className={cx(
                  'relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors',
                  activeItem ? 'text-white' : 'text-white/40 hover:text-white/70',
                )}
              >
                {activeItem ? (
                  <motion.span
                    layoutId="dock-active"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-x-1 inset-y-0 -z-10 rounded-2xl border border-white/10 bg-white/[0.07]"
                  />
                ) : null}
                <span className="relative">
                  <Icon
                    className={cx('h-[21px] w-[21px] transition-transform', activeItem && 'scale-105')}
                    strokeWidth={activeItem ? 2.4 : 2}
                  />
                  {item.badge ? (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson-500 px-1 text-[9px] font-bold text-white ring-2 ring-ink-900">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cx(
                    'text-[9px] font-semibold tracking-wide',
                    activeItem ? 'text-white' : 'text-white/40',
                  )}
                >
                  {item.label}
                </span>
                {activeItem ? (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-crimson-400 shadow-[0_0_8px_2px_rgba(244,63,94,0.7)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
