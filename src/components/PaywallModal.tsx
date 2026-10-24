import { useState } from 'react'
import { Check, Crown, Sparkles, Zap } from 'lucide-react'
import { Button, Divider, Modal, Segmented } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { money } from '@/lib/format'

const proFeatures = [
  {
    title: '4K watermark-free reels',
    body: 'Export Instagram Reels and YouTube Shorts at full resolution with telemetry HUD overlays.',
  },
  {
    title: 'Pack spread / fall-behind alerts',
    body: 'Instant red-flag warning when the tail sweep drops more than 2.0 km behind the lead.',
  },
  {
    title: 'Offline mountain GPX',
    body: 'Download every route before you lose signal in the high passes.',
  },
  {
    title: 'Family tracking web links',
    body: 'Share a live ride link so family can follow the pack in a browser — no app install.',
  },
  {
    title: 'Helmet intercom bridge',
    body: 'Background WebRTC voice across Cardo, Sena and AirPods on the same ride channel.',
  },
  {
    title: 'Unlimited AI tank splits',
    body: 'Gemini scans every receipt, splits by checked-in riders and keeps the kitty ledger.',
  },
]

export const PaywallModal = () => {
  const paywall = useAppStore((state) => state.paywall)
  const closePaywall = useAppStore((state) => state.closePaywall)
  const isPro = useAppStore((state) => state.isPro)
  const setPro = useAppStore((state) => state.setPro)
  const pushToast = useAppStore((state) => state.pushToast)

  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual')
  const [region, setRegion] = useState<'IN' | 'GLOBAL'>('IN')
  const [loading, setLoading] = useState(false)

  const pricing =
    region === 'IN'
      ? { monthly: 199, annual: 1499, currency: 'INR' as const }
      : { monthly: 4.99, annual: 39.99, currency: 'USD' as const }

  const price = cycle === 'monthly' ? pricing.monthly : pricing.annual
  const perMonth =
    cycle === 'monthly' ? pricing.monthly : Math.round((pricing.annual / 12) * 100) / 100

  const activate = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setLoading(false)
    setPro(true)
    closePaywall()
  }

  return (
    <Modal
      open={Boolean(paywall?.open)}
      onClose={closePaywall}
      size="md"
      title={isPro ? 'You are a Road Captain' : 'Road Captain PRO'}
      subtitle={
        isPro
          ? 'Every pack tool is unlocked on this device.'
          : paywall?.reason ?? 'The full toolkit for riders who lead the pack.'
      }
    >
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-crimson-500/10 to-cyber-500/10 p-5">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/15 text-amber-300">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              Ride like a captain, not a passenger.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              12,400+ riders run Sunday packs on Ride &amp; Roam. PRO pays for itself in one tank
              split.
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-2">
          <span className="flex -space-x-2">
            {['#F43F5E', '#22D3EE', '#FBBF24', '#A78BFA'].map((color, index) => (
              <span
                key={color}
                className="h-6 w-6 rounded-full border-2 border-ink-900"
                style={{ background: `linear-gradient(135deg, ${color}, #1b1b2b)` }}
              >
                <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-white/90">
                  {['AS', 'SK', 'KM', 'AR'][index]}
                </span>
              </span>
            ))}
          </span>
          <span className="text-[10px] text-white/45">
            <span className="font-semibold text-amber-300">★★★★★</span> 4.9 from 2,180 riders
          </span>
        </div>
      </div>

      {isPro ? (
        <div className="space-y-3 pb-2">
          {proFeatures.slice(0, 4).map((feature) => (
            <div key={feature.title} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pack-500/20 text-pack-400">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <p className="text-xs leading-relaxed text-white/60">
                <span className="font-semibold text-white">{feature.title}</span> — {feature.body}
              </p>
            </div>
          ))}
          <Divider className="my-4" />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              full
              onClick={() => {
                pushToast('Subscription manager', 'Billing is handled by Razorpay / Lemon Squeezy in production.', 'default')
                closePaywall()
              }}
            >
              Manage billing
            </Button>
            <Button variant="ghost" full onClick={closePaywall}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRegion('IN')}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                region === 'IN'
                  ? 'border-crimson-500/50 bg-crimson-500/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <p className="text-xs font-semibold text-white">🇮🇳 India</p>
              <p className="mt-0.5 text-[10px] text-white/40">UPI AutoPay · Razorpay</p>
            </button>
            <button
              type="button"
              onClick={() => setRegion('GLOBAL')}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                region === 'GLOBAL'
                  ? 'border-cyber-400/50 bg-cyber-500/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <p className="text-xs font-semibold text-white">🌍 Global</p>
              <p className="mt-0.5 text-[10px] text-white/40">Cards · Apple Pay</p>
            </button>
          </div>

          <Segmented
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual · save 37%' },
            ]}
            value={cycle}
            onChange={setCycle}
            className="mb-4"
          />

          <div className="mb-4 flex items-end justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-white">
                {money(price, pricing.currency)}
                <span className="ml-1 text-xs font-medium text-white/40">
                  /{cycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-white/40">
                {cycle === 'annual'
                  ? `${money(perMonth, pricing.currency)}/mo billed yearly · cancel anytime`
                  : 'Billed monthly · cancel anytime'}
              </p>
            </div>
            <span className="rounded-full border border-pack-400/30 bg-pack-500/10 px-2.5 py-1 text-[10px] font-bold text-pack-400">
              7-day free trial
            </span>
          </div>

          <div className="space-y-3 pb-4">
            {proFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crimson-500/15 text-crimson-400">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <p className="text-xs leading-relaxed text-white/55">
                  <span className="font-semibold text-white">{feature.title}</span> — {feature.body}
                </p>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-5 border-t border-white/[0.07] bg-ink-900/95 px-5 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <Button
              full
              size="lg"
              loading={loading}
              icon={<Zap className="h-4 w-4" />}
              onClick={activate}
            >
              Start free trial
            </Button>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-white/30">
              Demo build — no card is charged. Production wires Razorpay Subscriptions (UPI
              AutoPay) and Lemon Squeezy (global MoR).
            </p>
          </div>
        </>
      )}

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[10px] text-white/25">
        <Sparkles className="h-3 w-3" /> Prices in {region === 'IN' ? 'INR incl. GST' : 'USD excl. local tax'}
      </p>
    </Modal>
  )
}
