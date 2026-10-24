import type { ExpenseLineItem, GarageBike } from '@/types'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
const model = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

export const isGeminiConfigured = Boolean(apiKey)

export const RECEIPT_OCR_SYSTEM_PROMPT = `
You are the PackPulse AI Expense Splitter for motorcycle group rides.
Analyze the uploaded restaurant, highway dhaba, cafe, or fuel station receipt image.
Return ONLY valid JSON matching this exact schema:
{
  "title": "Store or Cafe Name + Brief Type (e.g., Haveli Highway Breakfast)",
  "amount": 2400,
  "currency": "₹",
  "items": ["10x Amritsari Kulcha", "5x Masala Chai"]
}
`

const RECEIPT_JSON_CONTRACT = `
Return ONLY valid JSON, no markdown fences, matching:
{
  "title": string,
  "amount": number,
  "currency": "INR" | "USD",
  "items": [{ "label": string, "qty": number, "price": number }],
  "confidence": number
}
Rules:
- Read fuel slips, dhaba bills, cafe receipts, toll tags and parking tickets.
- Use the grand total actually payable, including taxes.
- Never invent line items you cannot see; if the receipt is unreadable set confidence below 0.4.
- Prices are in the receipt currency. Quantities default to 1.
`

export const MECHANIC_SYSTEM_PROMPT = `
You are the PackPulse AI Mechanic: a concise, safety-first motorcycle mechanic for group riders in India and worldwide.
Answer in under 120 words. Use plain language, give torque/PSI/km figures when relevant, and always flag anything that should stop the rider from continuing the ride.
Never suggest skipping brake, tyre or structural safety checks.
`

export interface ReceiptResult {
  title: string
  amount: number
  currency: 'INR' | 'USD'
  items: ExpenseLineItem[]
  perRiderShare: number
  splitCount: number
  confidence: number
  source: 'gemini' | 'demo'
}

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

const callGemini = async (
  parts: GeminiPart[],
  options: { system: string; json?: boolean; temperature?: number } = { system: '' },
): Promise<string | null> => {
  if (!apiKey) return null
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: options.temperature ?? 0.35,
            maxOutputTokens: 1024,
            ...(options.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      },
    )
    if (!response.ok) return null
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? null
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

const extractJson = (text: string): Record<string, unknown> | null => {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

const normalizeItems = (raw: unknown): ExpenseLineItem[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const match = item.match(/^(\d+)\s*[x×]\s*(.+)$/i)
        return match
          ? { label: match[2].trim(), qty: Number(match[1]), price: 0 }
          : { label: item.trim(), qty: 1, price: 0 }
      }
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>
        return {
          label: String(row.label ?? row.name ?? 'Item'),
          qty: Number(row.qty ?? row.quantity ?? 1) || 1,
          price: Number(row.price ?? row.amount ?? 0) || 0,
        }
      }
      return null
    })
    .filter((item): item is ExpenseLineItem => Boolean(item && item.label))
}

const demoReceipts: Array<Omit<ReceiptResult, 'perRiderShare' | 'splitCount' | 'source'>> = [
  {
    title: 'Haveli Highway Breakfast',
    amount: 2400,
    currency: 'INR',
    items: [
      { label: 'Amritsari Kulcha', qty: 10, price: 1200 },
      { label: 'Masala Chai', qty: 9, price: 450 },
      { label: 'Curd & White Butter', qty: 9, price: 450 },
      { label: 'Bottled Water', qty: 6, price: 300 },
    ],
    confidence: 0.96,
  },
  {
    title: 'HP Petrol Pump · Karnal',
    amount: 4850,
    currency: 'INR',
    items: [
      { label: 'Petrol · 8 bikes', qty: 8, price: 4400 },
      { label: 'Engine oil top-up', qty: 1, price: 450 },
    ],
    confidence: 0.93,
  },
  {
    title: 'Dharampur Maggi & Chai Point',
    amount: 760,
    currency: 'INR',
    items: [
      { label: 'Masala Maggi', qty: 6, price: 480 },
      { label: 'Adrak Chai', qty: 8, price: 240 },
      { label: 'Parle-G', qty: 2, price: 40 },
    ],
    confidence: 0.91,
  },
]

let demoCursor = 0

export const scanReceipt = async (input: {
  file?: File | null
  previewUrl?: string | null
  splitCount: number
  currency?: 'INR' | 'USD'
}): Promise<ReceiptResult> => {
  const { file, previewUrl, splitCount } = input
  const base64 = await toBase64(file, previewUrl)

  if (apiKey && base64) {
    const mimeType = file?.type || 'image/jpeg'
    const text = await callGemini(
      [
        { text: RECEIPT_OCR_SYSTEM_PROMPT },
        { text: RECEIPT_JSON_CONTRACT },
        { inlineData: { mimeType, data: base64 } },
      ],
      { system: RECEIPT_OCR_SYSTEM_PROMPT, json: true, temperature: 0.1 },
    )
    const parsed = text ? extractJson(text) : null
    if (parsed && typeof parsed.amount === 'number') {
      const amount = Number(parsed.amount)
      const currencyRaw = String(parsed.currency ?? input.currency ?? 'INR')
      const currency: 'INR' | 'USD' =
        currencyRaw.includes('$') || currencyRaw.toUpperCase().includes('USD') ? 'USD' : 'INR'
      return {
        title: String(parsed.title ?? 'Highway receipt'),
        amount,
        currency,
        items: normalizeItems(parsed.items),
        perRiderShare: Math.round((amount / Math.max(1, splitCount)) * 100) / 100,
        splitCount,
        confidence: Number(parsed.confidence ?? 0.9) || 0.9,
        source: 'gemini',
      }
    }
  }

  // Deterministic demo OCR: cycles realistic receipts so every tap produces a useful split.
  await new Promise((resolve) => setTimeout(resolve, 1400))
  const demo = demoReceipts[demoCursor % demoReceipts.length]
  demoCursor += 1
  return {
    ...demo,
    currency: input.currency ?? demo.currency,
    perRiderShare: Math.round((demo.amount / Math.max(1, splitCount)) * 100) / 100,
    splitCount,
    source: 'demo',
  }
}

export interface MechanicAnswer {
  answer: string
  source: 'gemini' | 'demo'
}

const garageFallback = (question: string, bike: GarageBike): MechanicAnswer => {
  const q = question.toLowerCase()
  const front = bike.tyreFront
  const rear = bike.tyreRear
  if (/(tyre|tire|pressure|psi)/.test(q)) {
    return {
      source: 'demo',
      answer: `For your ${bike.model}, run ${front} psi front / ${rear} psi rear when cold, solo, no luggage. Add 2 psi rear with a pillion or loaded saddlebags. Check cold — highway heat adds 3–4 psi by itself. If pressure drops more than 2 psi in a week, get the valve core and bead checked before the next Sunday run.`,
    }
  }
  if (/(oil|service|interval)/.test(q)) {
    return {
      source: 'demo',
      answer: `You are at ${bike.odometerKm.toLocaleString('en-IN')} km. Change engine oil and the filter every 8,000 km or 12 months, whichever comes first — you are about 980 km out. Use the spec weight in the manual (20W-50 for most V-twins). If the oil looks milky or smells of fuel, stop riding and get it inspected; that is not a service-interval question.`,
    }
  }
  if (/(chain|belt|sprocket)/.test(q)) {
    return {
      source: 'demo',
      answer: `Clean and lube the chain every 500–600 km in dry weather, every 300 km in rain. Slack should sit in the manual range (typically 25–35 mm) measured mid-span. Your next check is due in about 320 km. On a belt-drive like the Fat Bob, check belt tension and look for missing teeth instead — never lubricate a belt.`,
    }
  }
  if (/(brake|pad|disc)/.test(q)) {
    return {
      source: 'demo',
      answer: `Front pads are at roughly 62%, rear at 71% on your logged service data. Replace pads under 2 mm of friction material, and replace fluid every two years regardless of mileage. If the lever feels spongy or the bike pulls under braking, stop and inspect before the next ride — brakes are a no-go item.`,
    }
  }
  if (/(battery|start|cold start|electrical)/.test(q)) {
    return {
      source: 'demo',
      answer: `A healthy 12V battery rests at 12.6V+ and should hold above 10V while cranking. If cold starts are lazy, charge it overnight on a smart charger before condemning it. Check the terminals for corrosion and make sure any auxiliary lights are on a switched circuit, not a permanent live.`,
    }
  }
  return {
    source: 'demo',
    answer: `Quick pre-ride check on the ${bike.model}: cold tyre pressures (${front}/${rear} psi), oil level on a level surface, chain/belt tension, brake pads and lights. Tell me the symptom — noise, vibration, warning light, or handling — and I will narrow it down. If it involves brakes, steering or a cracked structural part, do not ride it.`,
  }
}

export const askMechanic = async (
  question: string,
  bike: GarageBike,
): Promise<MechanicAnswer> => {
  const text = await callGemini(
    [
      {
        text: `Bike: ${bike.year} ${bike.model}, odometer ${bike.odometerKm} km, tyres ${bike.tyreFront}/${bike.tyreRear} psi.\nRider question: ${question}`,
      },
    ],
    { system: MECHANIC_SYSTEM_PROMPT, temperature: 0.4 },
  )
  if (text?.trim()) return { answer: text.trim(), source: 'gemini' }
  return garageFallback(question, bike)
}

export const suggestReelCaption = async (rideTitle: string, overlay: string) => {
  const text = await callGemini(
    [
      {
        text: `Write an Instagram Reel caption for a motorcycle ride titled "${rideTitle}" with a "${overlay}" telemetry overlay. Max 90 characters, one line, then 4 hashtags including #RideAndRoam. Return plain text only.`,
      },
    ],
    { system: 'You write punchy motorcycle social captions.', temperature: 0.8 },
  )
  if (text?.trim()) return text.trim()
  return `Cold air, warm engines, empty highway. ${rideTitle.split(':')[0]} with the pack. #RideAndRoam #SundayRun #MotorcycleLife #PackPulse`
}

const toBase64 = async (file?: File | null, previewUrl?: string | null) => {
  const dataUrl = file ? await readAsDataUrl(file) : previewUrl
  if (!dataUrl) return null
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

const readAsDataUrl = (file: File) =>
  new Promise<string | null>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
