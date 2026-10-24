import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Camera,
  Check,
  ChevronDown,
  Crown,
  Database,
  Droplets,
  Flame,
  Gauge,
  ImagePlus,
  Loader2,
  MapPin,
  Mic2,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  ScanLine,
  Send,
  Settings2,
  Share2,
  Sparkles,
  ToggleLeft,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react'
import type { Expense, ExpenseLineItem } from '@/types'
import {
  Avatar,
  Button,
  Divider,
  Modal,
  Panel,
  Pill,
  ProgressBar,
  SectionHeading,
  Toggle,
  Verified,
} from '@/components/ui'
import { cx, clockTime, copyToClipboard, money, relativeTime, uid } from '@/lib/format'
import { RideArtwork } from '@/components/RideArtwork'
import { garage, currentUserId, profileMap } from '@/lib/mockData'
import { useExpenses, useRides } from '@/lib/data'
import { useAppStore } from '@/store/useAppStore'
import { askMechanic, isGeminiConfigured, scanReceipt, type MechanicAnswer, type ReceiptResult } from '@/lib/gemini'
import { dataMode } from '@/lib/supabase'

type Tab = 'split' | 'garage' | 'founder'

const tabs: Array<{ id: Tab; label: string; emoji: string }> = [
  { id: 'split', label: 'Split Ride Bills', emoji: '💸' },
  { id: 'garage', label: 'Digital Garage', emoji: '🔧' },
  { id: 'founder', label: 'Founder & PRO', emoji: '👑' },
]

export const GarageAndProfilePage = () => {
  const [tab, setTab] = useState<Tab>('split')
  const me = profileMap[currentUserId]
  const isPro = useAppStore((state) => state.isPro)
  const muted = useAppStore((state) => state.muted)
  const toggleMuted = useAppStore((state) => state.toggleMuted)
  const openPaywall = useAppStore((state) => state.openPaywall)
  const pushToast = useAppStore((state) => state.pushToast)
  const joinedClubIds = useAppStore((state) => state.joinedClubIds)
  const joinedRideIds = useAppStore((state) => state.joinedRideIds)
  const { data: rides } = useRides()
  const { data: expenses } = useExpenses()

  const currentRide =
    rides.find((ride) => ride.status === 'ongoing' && joinedRideIds.includes(ride.id)) ??
    rides.find((ride) => joinedRideIds.includes(ride.id)) ??
    null
  const splitCount = Math.max(1, currentRide?.participantIds.length ?? 9)
  const packExpenses = expenses.filter((expense) => expense.rideId === (currentRide?.id ?? 'r_sunrise'))
  const totalSpend = packExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const shareProfile = async () => {
    const ok = await copyToClipboard(`${window.location.origin}/#/garage`)
    pushToast(ok ? 'Profile link copied' : 'Copy failed', `@${me.handle} · Ride & Roam`, ok ? 'success' : 'warn')
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <RideArtwork art={{ palette: 'night', seed: 12 }} className="h-[142px] w-full sm:h-[170px]" showBike={false} tint={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />

        <div className="absolute right-3 top-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => pushToast('Edit profile', 'Avatar, bike and bio editing are editable in the full build.', 'default')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-[10px] font-semibold text-white/70 backdrop-blur transition hover:text-white"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            type="button"
            onClick={shareProfile}
            aria-label="Share profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-ink-950/60 text-white/70 backdrop-blur transition hover:text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative px-4 pb-4 sm:px-6 sm:pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
            <div className="flex items-end gap-3">
              <div className="relative">
                <Avatar name={me.fullName} accent={me.accent} size="2xl" ring />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-950 bg-crimson-500 text-[11px]">
                  🏍️
                </span>
              </div>
              <div className="pb-1">
                <h1 className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {me.fullName}
                  <BadgeCheck className="h-4 w-4 text-cyber-400" />
                </h1>
                <p className="text-[11px] text-white/40">@{me.handle}</p>
              </div>
            </div>
            {isPro ? (
              <Pill tone="amber" className="mb-1 shrink-0">
                <Crown className="h-3 w-3" /> Road Captain PRO
              </Pill>
            ) : (
              <Button size="xs" className="mb-1 shrink-0" onClick={() => openPaywall()}>
                Go PRO
              </Button>
            )}
          </div>

          <p className="mt-2.5 max-w-lg text-[11px] leading-relaxed text-white/50">{me.bio}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {me.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3 w-3" /> {me.primaryBike}
            </span>
            <span className="inline-flex items-center gap-1">
              <UsersIcon /> {joinedClubIds.length} clubs
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: 'total km', value: me.totalKm.toLocaleString('en-IN') },
              { label: 'clubs', value: joinedClubIds.length },
              { label: 'followers', value: `${(me.followers / 1000).toFixed(1)}k` },
              { label: 'rides', value: `${Math.round(me.totalKm / 42)}` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2 text-center sm:px-3">
                <p className="font-display text-sm font-bold text-white sm:text-base">{stat.value}</p>
                <p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx(
              'shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition',
              tab === item.id
                ? 'border-crimson-500/45 bg-crimson-500/10 text-crimson-200'
                : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75',
            )}
          >
            <span className="mr-1.5">{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'split' ? (
        <SplitTab
          expenses={packExpenses}
          totalSpend={totalSpend}
          splitCount={splitCount}
          rideLabel={currentRide?.title ?? 'Sunday Sunrise Run'}
        />
      ) : null}
      {tab === 'garage' ? <GarageTab /> : null}
      {tab === 'founder' ? (
        <FounderTab
          isPro={isPro}
          muted={muted}
          toggleMuted={toggleMuted}
          openPaywall={openPaywall}
          pushToast={pushToast}
          riderCount={412}
        />
      ) : null}

      <p className="text-center text-[9px] leading-relaxed text-white/20">
        Muted audio is off by default? No — tap the mic in a story to hear the synthesized V-twin.
      </p>
    </div>
  )
}

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
)

/* ------------------------------------------------------------------ */
/* Split the tank                                                      */
/* ------------------------------------------------------------------ */

const SplitTab = ({
  expenses,
  totalSpend,
  splitCount,
  rideLabel,
}: {
  expenses: Expense[]
  totalSpend: number
  splitCount: number
  rideLabel: string
}) => {
  const addExpense = useAppStore((state) => state.addExpense)
  const pushToast = useAppStore((state) => state.pushToast)
  const [scanOpen, setScanOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const perRider = Math.round(totalSpend / Math.max(1, splitCount))
  const paidByMe = expenses
    .filter((expense) => expense.paidByUserId === currentUserId)
    .reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Panel className="relative overflow-hidden p-4 sm:p-5">
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-pack-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-pack-400">
                <Sparkles className="h-3 w-3" /> AI split-the-tank kitty
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold tracking-tight text-white">
                {money(totalSpend)}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {rideLabel} · {expenses.length} bills · {splitCount} checked-in riders
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-white/30">per rider</p>
                <p className="font-display text-lg font-bold text-pack-400">{money(perRider)}</p>
              </div>
              <Button
                size="sm"
                icon={<ScanLine className="h-3.5 w-3.5" />}
                onClick={() => setScanOpen(true)}
              >
                AI Scan Bill
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/30">you paid</p>
              <p className="mt-0.5 text-xs font-semibold text-white">{money(paidByMe)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/30">your share</p>
              <p className="mt-0.5 text-xs font-semibold text-white">{money(perRider)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/30">settle up</p>
              <p
                className={cx(
                  'mt-0.5 text-xs font-semibold',
                  paidByMe >= perRider ? 'text-pack-400' : 'text-amber-300',
                )}
              >
                {paidByMe >= perRider ? `+${money(paidByMe - perRider)}` : `-${money(perRider - paidByMe)}`}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">This ride’s bills</p>
              <h2 className="mt-1 font-display text-base font-semibold text-white">Expense ledger</h2>
            </div>
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyber-300 hover:text-cyber-200"
            >
              <Plus className="h-3 w-3" /> Add bill
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {expenses.map((expense) => {
              const payer = profileMap[expense.paidByUserId]
              const isOpen = expanded === expense.id
              return (
                <div key={expense.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : expense.id)}
                    className="flex w-full items-center gap-3 p-2.5 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-pack-400">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-white">
                        {expense.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-white/35">
                        <Avatar name={payer.fullName} accent={payer.accent} size="xs" />
                        {payer.fullName.split(' ')[0]} paid · {relativeTime(expense.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-xs font-semibold text-white">
                        {money(expense.amount, expense.currency)}
                      </span>
                      <span className="block text-[9px] text-white/30">
                        {money(expense.perRiderShare, expense.currency)} / rider
                      </span>
                    </span>
                    <ChevronDown
                      className={cx(
                        'h-3.5 w-3.5 shrink-0 text-white/25 transition',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-white/[0.07] px-3 py-2.5">
                      <div className="space-y-1.5">
                        {(expense.lineItems ?? []).map((item: ExpenseLineItem) => (
                          <div key={item.label} className="flex items-center justify-between text-[10px]">
                            <span className="text-white/45">
                              {item.qty > 1 ? `${item.qty}× ` : ''}
                              {item.label}
                            </span>
                            <span className="font-mono text-white/50">
                              {item.price ? money(item.price, expense.currency) : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
                        <span className="text-[9px] text-white/30">
                          split between {expense.splitCount} riders
                        </span>
                        <span className="text-[10px] font-semibold text-pack-400">
                          {money(expense.perRiderShare, expense.currency)} each
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-white/25">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-cyber-400/60" />
            Gemini reads crumpled dhaba bills, fuel slips and toll receipts, then splits by the
            checked-in roster.
          </p>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="p-4">
          <p className="label">Settlement</p>
          <h2 className="mt-1 font-display text-sm font-semibold text-white">Who owes whom</h2>
          <div className="mt-3 space-y-2">
            {[
              { id: 'u_simran', amount: 267, direction: 'owes you' },
              { id: 'u_kabir', amount: 539, direction: 'owes you' },
              { id: 'u_zoya', amount: 71, direction: 'you owe' },
            ].map((row) => {
              const profile = profileMap[row.id]
              const owesMe = row.direction === 'owes you'
              return (
                <div key={row.id} className="flex items-center gap-2">
                  <Avatar name={profile.fullName} accent={profile.accent} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-white">
                      {profile.fullName.split(' ')[0]}
                    </p>
                    <p className="text-[9px] text-white/30">{row.direction}</p>
                  </div>
                  <span className={cx('font-mono text-[10px] font-semibold', owesMe ? 'text-pack-400' : 'text-amber-300')}>
                    {owesMe ? '+' : '-'}
                    {money(row.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => useAppStore.getState().pushToast('UPI request sent', `Payment request sent to ${profile.fullName.split(' ')[0]} via UPI.`, 'success')}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1 text-[8px] font-bold text-white/50 hover:text-white"
                  >
                    {owesMe ? 'Remind' : 'Pay'}
                  </button>
                </div>
              )
            })}
          </div>
          <Button
            size="xs"
            variant="secondary"
            full
            className="mt-3"
            onClick={() =>
              useAppStore.getState().pushToast(
                'UPI settlement link created',
                'One link settles all 9 riders. Razorpay handles the collections.',
                'success',
              )
            }
          >
            Settle all via UPI
          </Button>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-cyber-400/10 text-cyber-300">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-white">Receipt vault</p>
              <p className="text-[9px] text-white/30">3 bills scanned this ride</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { palette: 'sunset', seed: 4 },
              { palette: 'desert', seed: 9 },
              { palette: 'night', seed: 15 },
            ].map((art, index) => (
              <div key={index} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10">
                <RideArtwork
                  art={{ palette: art.palette as 'sunset' | 'desert' | 'night', seed: art.seed }}
                  className="h-full w-full"
                  showBike={false}
                  showSpeedLines={false}
                  tint={false}
                />
                <span className="absolute inset-0 bg-ink-950/45" />
                <ReceiptText className="absolute inset-0 m-auto h-5 w-5 text-white/60" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <ScanBillModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        splitCount={splitCount}
        onSave={(result) => {
          addExpense({
            id: uid('exp'),
            rideId: 'r_sunrise',
            paidByUserId: currentUserId,
            title: result.title,
            amount: result.amount,
            currency: result.currency,
            perRiderShare: result.perRiderShare,
            splitCount: result.splitCount,
            lineItems: result.items,
            createdAt: new Date().toISOString(),
          })
          setScanOpen(false)
          pushToast(
            'Bill added to the kitty',
            `${result.title} · ${money(result.amount, result.currency)} split ${result.splitCount} ways.`,
            'success',
          )
        }}
      />
    </div>
  )
}

const ScanBillModal = ({
  open,
  onClose,
  splitCount,
  onSave,
}: {
  open: boolean
  onClose: () => void
  splitCount: number
  onSave: (result: ReceiptResult) => void
}) => {
  const pushToast = useAppStore((state) => state.pushToast)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [stage, setStage] = useState(0)
  const [result, setResult] = useState<ReceiptResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (selected: File | null) => {
    setFile(selected)
    setResult(null)
    if (selected) setPreview(URL.createObjectURL(selected))
  }

  const runScan = async () => {
    setScanning(true)
    setStage(1)
    const stageTimer = window.setInterval(() => setStage((value) => Math.min(3, value + 1)), 700)
    const scanned = await scanReceipt({ file, previewUrl: preview, splitCount })
    window.clearInterval(stageTimer)
    setStage(4)
    setScanning(false)
    setResult(scanned)
    pushToast(
      scanned.source === 'gemini' ? 'Gemini read your bill' : 'Demo OCR complete',
      `${scanned.items.length} line items extracted · ${money(scanned.amount, scanned.currency)}`,
      'success',
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Scan Bill"
      subtitle={`Gemini 2.5 Flash vision splits the bill ${splitCount} ways with the checked-in roster.`}
      footer={
        result ? (
          <div className="flex gap-2">
            <Button variant="secondary" full onClick={() => setResult(null)}>
              Rescan
            </Button>
            <Button full icon={<Check className="h-4 w-4" />} onClick={() => onSave(result)}>
              Add {money(result.perRiderShare, result.currency)}/rider
            </Button>
          </div>
        ) : (
          <Button full loading={scanning} icon={<ScanLine className="h-4 w-4" />} onClick={runScan}>
            {scanning ? 'Reading receipt…' : 'Scan with Gemini'}
          </Button>
        )
      }
    >
      <div className="space-y-3.5 pb-1">
        <div className="flex items-center justify-between">
          <Pill tone={isGeminiConfigured ? 'cyan' : 'amber'} className="text-[9px]">
            <Sparkles className="h-3 w-3" />
            {isGeminiConfigured ? 'Gemini 2.5 Flash connected' : 'Demo AI · add VITE_GEMINI_API_KEY'}
          </Pill>
          <span className="text-[10px] text-white/30">{splitCount} riders</span>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            'relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed transition',
            preview ? 'border-white/20' : 'border-white/15 bg-white/[0.02] hover:border-cyber-400/40 hover:bg-white/[0.04]',
          )}
        >
          {preview ? (
            <>
              <img src={preview} alt="Receipt preview" className="h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
              <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/70 px-2 py-1 text-[9px] text-white/60 backdrop-blur">
                <ImagePlus className="h-3 w-3" /> {file?.name ?? 'receipt.jpg'}
              </span>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Camera className="h-5 w-5 text-white/40" />
              </div>
              <p className="mt-2 text-xs font-semibold text-white">Snap or upload a bill</p>
              <p className="mt-0.5 text-[10px] text-white/35">
                Dhaba bill, fuel slip, toll tag or cafe receipt
              </p>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        {scanning ? (
          <div className="rounded-2xl border border-cyber-400/20 bg-cyber-500/[0.05] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-cyber-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {stage === 1
                ? 'Reading the receipt…'
                : stage === 2
                  ? 'Extracting line items…'
                  : 'Splitting between the pack…'}
            </div>
            <ProgressBar value={stage * 28} tone="cyan" className="mt-2" />
          </div>
        ) : null}

        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-pack-500/25 bg-pack-500/[0.05] p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-white">{result.title}</p>
                <p className="mt-0.5 text-[9px] text-white/35">
                  {result.items.length} items · {Math.round(result.confidence * 100)}% confidence ·{' '}
                  {result.source === 'gemini' ? 'Gemini' : 'demo'}
                </p>
              </div>
              <p className="font-display text-lg font-bold text-white">
                {money(result.amount, result.currency)}
              </p>
            </div>

            <div className="mt-2.5 space-y-1 border-t border-white/[0.08] pt-2">
              {result.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[10px]">
                  <span className="text-white/50">
                    {item.qty > 1 ? `${item.qty}× ` : ''}
                    {item.label}
                  </span>
                  <span className="font-mono text-white/55">
                    {item.price ? money(item.price, result.currency) : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/10 bg-ink-950/40 px-2.5 py-2">
              <span className="text-[10px] text-white/40">Each of {result.splitCount} riders pays</span>
              <span className="font-display text-sm font-bold text-pack-400">
                {money(result.perRiderShare, result.currency)}
              </span>
            </div>
          </motion.div>
        ) : null}

        <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-white/25">
          <ReceiptText className="mt-0.5 h-3 w-3 shrink-0" />
          Images are sent directly from your device to Gemini and never stored on our servers.
        </p>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Digital garage                                                      */
/* ------------------------------------------------------------------ */

interface MechanicMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: MechanicAnswer['source']
}

const quickQuestions = [
  'What tyre pressure for a pillion?',
  'When is my next oil change?',
  'How much chain slack is correct?',
  'My cold start sounds lazy — battery?',
]

const GarageTab = () => {
  const pushToast = useAppStore((state) => state.pushToast)
  const [messages, setMessages] = useState<MechanicMessage[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: `Hey Arjun. I have your ${garage.year} ${garage.model} on file at ${garage.odometerKm.toLocaleString('en-IN')} km. Ask me anything about service intervals, tyre pressures, noises or pre-ride checks.`,
      source: 'demo',
    },
  ])
  const [question, setQuestion] = useState('')
  const [thinking, setThinking] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return
    setMessages((current) => [...current, { id: uid('m'), role: 'user', text: trimmed }])
    setQuestion('')
    setThinking(true)
    const answer = await askMechanic(trimmed, garage)
    setThinking(false)
    setMessages((current) => [
      ...current,
      { id: uid('m'), role: 'assistant', text: answer.answer, source: answer.source },
    ])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-4">
        <Panel className="overflow-hidden">
          <div className="relative">
            <RideArtwork art={{ palette: 'night', seed: 27 }} className="h-[170px] w-full" showBike tint={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-crimson-300">
                  Digital garage
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-white">
                  {garage.model}
                </h2>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {garage.year} · {garage.plate} · {garage.odometerKm.toLocaleString('en-IN')} km
                </p>
              </div>
              <Pill tone="cyan" className="mb-1">
                <Wrench className="h-3 w-3" /> Service due soon
              </Pill>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
            {[
              { label: 'next service', value: '980 km', tone: 'text-amber-300' },
              { label: 'avg mileage', value: '18.4 km/l', tone: 'text-white' },
              { label: 'rides logged', value: '114', tone: 'text-white' },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2.5 text-center">
                <p className={cx('font-display text-sm font-bold', item.tone)}>{item.value}</p>
                <p className="mt-0.5 text-[8px] uppercase tracking-wider text-white/30">{item.label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Front tyre', value: garage.tyreFront, max: 45, icon: Gauge, hint: 'cold · solo' },
            { label: 'Rear tyre', value: garage.tyreRear, max: 48, icon: Gauge, hint: 'cold · solo' },
          ].map((item) => {
            const ratio = Math.min(1, item.value / item.max)
            return (
              <Panel key={item.label} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {item.label}
                  </p>
                  <item.icon className="h-3.5 w-3.5 text-cyber-300" />
                </div>
                <div className="mt-2 flex items-end gap-1.5">
                  <span className="font-display text-2xl font-bold text-white">{item.value}</span>
                  <span className="mb-1 text-[10px] text-white/35">{garage.tyreUnit}</span>
                  <span className="mb-1 ml-auto text-[9px] text-pack-400">recommended</span>
                </div>
                <ProgressBar value={ratio * 100} tone={ratio > 0.9 ? 'amber' : 'cyan'} className="mt-2" />
                <p className="mt-1 text-[9px] text-white/25">{item.hint} · check weekly</p>
              </Panel>
            )
          })}
        </div>

        <Panel className="p-4 sm:p-5">
          <SectionHeading
            eyebrow="Service countdown"
            title="Maintenance"
            action={
              <Button size="xs" variant="ghost" onClick={() => setLogOpen(true)} icon={<Plus className="h-3 w-3" />}>
                Log service
              </Button>
            }
          />
          <div className="mt-3 space-y-3">
            {garage.service.map((item) => {
              const used = Math.max(0, item.totalKm - item.dueInKm)
              const percent = Math.min(100, (used / item.totalKm) * 100)
              const urgent = item.dueInKm <= 350
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cx(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                          urgent
                            ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                            : 'border-white/10 bg-white/[0.03] text-white/40',
                        )}
                      >
                        {item.icon === 'oil' ? <Droplets className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-white">{item.label}</p>
                        <p className="truncate text-[9px] text-white/30">{item.detail}</p>
                      </div>
                    </div>
                    <span className={cx('shrink-0 font-mono text-[10px]', urgent ? 'text-amber-300' : 'text-white/40')}>
                      {item.dueInKm} km
                    </span>
                  </div>
                  <ProgressBar value={percent} tone={urgent ? 'amber' : 'pack'} className="mt-1.5" />
                </div>
              )
            })}
          </div>
        </Panel>

        {/* AI mechanic */}
        <Panel className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyber-400/25 bg-cyber-500/10 text-cyber-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-white">AI Mechanic</p>
                <p className="text-[9px] text-white/30">
                  {isGeminiConfigured ? 'Gemini 2.5 Flash · live' : 'Demo mechanic · add Gemini key'}
                </p>
              </div>
            </div>
            <Pill tone="cyan" className="px-2 py-0.5 text-[8px]">
              <Zap className="h-2.5 w-2.5" /> Bike-aware
            </Pill>
          </div>

          <div className="max-h-[320px] min-h-[180px] space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cx('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : '')}
              >
                {message.role === 'assistant' ? (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-cyber-400/20 bg-cyber-500/10 text-cyber-300">
                    <Wrench className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <div className="max-w-[85%]">
                  <div
                    className={cx(
                      'rounded-2xl px-3 py-2 text-[11px] leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-br-md border border-crimson-500/25 bg-crimson-500/15 text-white'
                        : 'rounded-bl-md border border-white/10 bg-white/[0.055] text-white/75',
                    )}
                  >
                    {message.text}
                  </div>
                  {message.role === 'assistant' && message.source ? (
                    <p className="mt-0.5 px-1 text-[8px] text-white/20">
                      {message.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Demo knowledge base'}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {thinking ? (
              <div className="flex items-center gap-2 pl-9 text-[10px] text-white/35">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking your service log…
              </div>
            ) : null}
          </div>

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-white/[0.07] px-3 py-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => send(question)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-white/45 transition hover:border-cyber-400/30 hover:text-white"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.07] p-2.5">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') send(question)
              }}
              placeholder="Ask about your bike…"
              className="w-full bg-transparent px-1.5 py-2 text-[11px] text-white placeholder:text-white/25 outline-none"
            />
            <Button
              size="sm"
              onClick={() => send(question)}
              disabled={!question.trim() || thinking}
              className="h-9 w-9 shrink-0 !px-0"
              aria-label="Send question"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="p-4">
          <p className="label">Bike profile</p>
          <div className="mt-2.5 space-y-2 text-[10px]">
            {[
              { label: 'Model', value: garage.model },
              { label: 'Year', value: String(garage.year) },
              { label: 'Registration', value: garage.plate },
              { label: 'Odometer', value: `${garage.odometerKm.toLocaleString('en-IN')} km` },
              { label: 'Tyre spec', value: `${garage.tyreFront}/${garage.tyreRear} psi` },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2 border-b border-white/[0.05] pb-1.5">
                <span className="text-white/30">{row.label}</span>
                <span className="text-right font-medium text-white/65">{row.value}</span>
              </div>
            ))}
          </div>
          <Button
            size="xs"
            variant="secondary"
            full
            className="mt-3"
            onClick={() => pushToast('Garage synced', 'Service history pulled from your last 114 rides.', 'success')}
          >
            Sync service history
          </Button>
        </Panel>

        <Panel className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Flame className="h-3.5 w-3.5 text-amber-300" /> Pre-ride check
          </p>
          <div className="mt-2.5 space-y-2">
            {[
              { label: 'Tyre pressures', done: true },
              { label: 'Oil level', done: true },
              { label: 'Chain / belt tension', done: false },
              { label: 'Brake pads & fluid', done: true },
              { label: 'Lights & horn', done: false },
              { label: 'Fuel above half', done: true },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => pushToast(item.done ? 'Checked' : 'Marked for inspection', item.label, item.done ? 'success' : 'warn')}
                className="flex w-full items-center gap-2 text-left"
              >
                <span
                  className={cx(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    item.done
                      ? 'border-pack-500/40 bg-pack-500/15 text-pack-400'
                      : 'border-white/15 text-transparent',
                  )}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span className={cx('text-[10px]', item.done ? 'text-white/50' : 'text-white/30')}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-2 text-[9px] leading-relaxed text-amber-200/60">
            Chain tension is 320 km overdue. Get it checked before the Kasauli climb.
          </p>
        </Panel>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40">
            <Mic2 className="h-3 w-3" /> Sound library
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/25">
            Log your exhaust note at each service to hear the engine drift over time.
          </p>
        </div>
      </div>

      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log a service"
        subtitle="Keep the pack’s maintenance history accurate."
        size="sm"
      >
        <div className="space-y-3 pb-2">
          {['Engine oil & filter', 'Chain / belt', 'Tyre replacement', 'Brake service'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setLogOpen(false)
                pushToast('Service logged', `${option} recorded at ${garage.odometerKm.toLocaleString('en-IN')} km.`, 'success')
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20"
            >
              <span className="text-[11px] text-white/70">{option}</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/25" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Founder console                                                     */
/* ------------------------------------------------------------------ */

const FounderTab = ({
  isPro,
  muted,
  toggleMuted,
  openPaywall,
  pushToast,
  riderCount,
}: {
  isPro: boolean
  muted: boolean
  toggleMuted: () => void
  openPaywall: (reason?: string) => void
  pushToast: (message: string, description?: string, tone?: 'default' | 'success' | 'warn' | 'danger') => void
  riderCount: number
}) => {
  const setPro = useAppStore((state) => state.setPro)
  const flags = useAppStore((state) => state.flags)
  const toggleFlag = useAppStore((state) => state.toggleFlag)

  const mrrInr = riderCount * 199

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-4">
        <Panel className="relative overflow-hidden p-5">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300">
                <Crown className="h-3 w-3" /> Road Captain PRO
              </p>
              <p className="mt-1.5 font-display text-xl font-bold text-white">
                {isPro ? 'Subscription active' : 'Free rider tier'}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {isPro
                  ? '₹199/mo · renews 24 Nov · UPI AutoPay'
                  : 'Upgrade to unlock 4K reels, GPX, family links and alerts.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isPro ? 'secondary' : 'primary'}
                onClick={() => (isPro ? setPro(false) : openPaywall())}
              >
                {isPro ? 'Cancel PRO (demo)' : 'Activate PRO'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openPaywall()}
                aria-label="Preview paywall"
              >
                Test paywall
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <SectionHeading eyebrow="Runtime switches" title="Feature flags" />
          <p className="mt-1 text-[10px] text-white/30">
            Flip these without a redeploy to test paywall triggers and partner placements.
          </p>
          <div className="mt-3 space-y-3">
            <Toggle
              label="Sponsored highway pitstops"
              description="Non-intrusive partner perk card every third feed item."
              checked={flags.sponsoredPitstops}
              onChange={() => toggleFlag('sponsoredPitstops')}
            />
            <Divider />
            <Toggle
              label="Helmet intercom bridge"
              description="PRO WebRTC voice upsell in ride and club chats."
              checked={flags.liveIntercom}
              onChange={() => toggleFlag('liveIntercom')}
            />
            <Divider />
            <Toggle
              label="Reel Studio 4K export"
              description="Gates 4K + watermark removal behind PRO."
              checked={flags.reelStudio4k}
              onChange={() => toggleFlag('reelStudio4k')}
            />
            <Divider />
            <Toggle
              label="Near-me radar radius"
              description="Uses device geolocation for the 400 km ride radius."
              checked={flags.nearMeRadar}
              onChange={() => toggleFlag('nearMeRadar')}
            />
            <Divider />
            <Toggle
              label="Mute app audio"
              description="Silences synthesized exhaust notes in stories and chat."
              checked={muted}
              onChange={toggleMuted}
            />
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <SectionHeading eyebrow="Environment" title="Service connections" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              {
                name: 'Supabase + PostGIS',
                detail: dataMode === 'live' ? 'Connected · live queries' : 'Demo dataset · add URL + anon key',
                ok: dataMode === 'live',
                icon: Database,
              },
              {
                name: 'Gemini 2.5 Flash',
                detail: isGeminiConfigured ? 'Connected · vision + mechanic' : 'Demo AI · add API key',
                ok: isGeminiConfigured,
                icon: Sparkles,
              },
              {
                name: 'Cloudflare R2',
                detail: import.meta.env.VITE_R2_PUBLIC_BASE_URL ? 'Bucket linked' : 'Not linked · local media',
                ok: Boolean(import.meta.env.VITE_R2_PUBLIC_BASE_URL),
                icon: ImagePlus,
              },
              {
                name: 'Razorpay / Lemon Squeezy',
                detail: isPro ? 'Test subscription active' : 'Sandbox · no card charged',
                ok: isPro,
                icon: TrendingUp,
              },
            ].map((service) => (
              <div key={service.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <service.icon className="h-4 w-4 text-white/40" />
                  <span
                    className={cx(
                      'rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                      service.ok
                        ? 'border-pack-500/30 bg-pack-500/10 text-pack-400'
                        : 'border-amber-400/25 bg-amber-400/[0.07] text-amber-300',
                    )}
                  >
                    {service.ok ? 'Live' : 'Demo'}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-white">{service.name}</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-white/30">{service.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <SectionHeading eyebrow="Monetization" title="Revenue model" />
          <div className="mt-3 space-y-2">
            {[
              {
                title: 'Global riders — $4.99/mo',
                body: 'Lemon Squeezy merchant of record handles US/EU/UK VAT automatically.',
                icon: Crown,
              },
              {
                title: 'India riders — ₹199/mo',
                body: 'Razorpay Subscriptions with UPI AutoPay (GPay, PhonePe, Paytm).',
                icon: Zap,
              },
              {
                title: 'Sponsored pitstops',
                body: '₹0 fixed cost partner placements at dhabas and gear stores.',
                icon: BadgeCheck,
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <p className="text-[11px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-white/35">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="p-4">
          <p className="label">Demo economics</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">
            {money(mrrInr)}
            <span className="ml-1 text-[10px] font-medium text-white/30">MRR</span>
          </p>
          <p className="mt-0.5 text-[10px] text-white/30">
            {riderCount} PRO riders × ₹199 · illustrative
          </p>
          <div className="mt-3 space-y-2">
            {[
              { label: 'PRO conversion', value: '7.4%', percent: 74 },
              { label: 'Reel exports / week', value: '1,842', percent: 58 },
              { label: 'Tank splits / week', value: '3,210', percent: 82 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-white/35">{item.label}</span>
                  <span className="text-white/60">{item.value}</span>
                </div>
                <ProgressBar value={item.percent} tone="amber" className="mt-1" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Settings2 className="h-3.5 w-3.5" /> Demo controls
          </p>
          <div className="mt-2.5 space-y-2">
            <Button
              size="xs"
              variant="secondary"
              full
              icon={<RotateCcw className="h-3 w-3" />}
              onClick={() => {
                window.localStorage.removeItem('packpulse.state.v1')
                pushToast('Demo state reset', 'Reloading with the seeded pack dataset…', 'default')
                window.setTimeout(() => window.location.reload(), 700)
              }}
            >
              Reset demo data
            </Button>
            <Button
              size="xs"
              variant="ghost"
              full
              icon={<ToggleLeft className="h-3 w-3" />}
              onClick={() => {
                setPro(!isPro)
              }}
            >
              Toggle PRO instantly
            </Button>
            <Button
              size="xs"
              variant="ghost"
              full
              icon={<ReceiptText className="h-3 w-3" />}
              onClick={() => pushToast('Billing portal', 'Razorpay subscription management opens here in production.', 'default')}
            >
              Open billing portal
            </Button>
          </div>
        </Panel>

        <Panel className="border-white/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Bike className="h-3.5 w-3.5" /> Roadmap
          </p>
          <div className="mt-2.5 space-y-2">
            {[
              'Supabase Realtime GPS broadcast',
              'Offline GPX + background geolocation',
              'Capacitor Android / iOS shells',
              'H3 geo-bucketed nearby ride queries',
              'R2 upload + 4K render worker',
            ].map((item) => (
              <p key={item} className="flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-crimson-400/60" /> {item}
              </p>
            ))}
          </div>
        </Panel>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40">
            <Verified className="h-3 w-3 text-cyber-400" /> Build status
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/25">
            React 19 · Vite · Tailwind · TanStack Query · Zustand · Supabase · Capacitor · Tauri
            ready
          </p>
          <p className="mt-1.5 font-mono text-[9px] text-white/20">
            last checked {clockTime(new Date().toISOString())}
          </p>
        </div>
      </div>
    </div>
  )
}
