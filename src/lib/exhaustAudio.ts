/**
 * Synthesised V-twin exhaust note (WebAudio, no assets, no network).
 * Used for the 6-second exhaust audio notes in stories and chat previews.
 */
let context: AudioContext | null = null

const getContext = () => {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

export const isAudioSupported = () => Boolean(getContext())

/** Plays a short engine rev. Resolves when the note has finished. */
export const playExhaustNote = async (durationSec = 4.5, db = 98) => {
  const ctx = getContext()
  if (!ctx) return false
  await ctx.resume()

  const duration = Math.max(0.8, Math.min(8, durationSec))
  const now = ctx.currentTime
  const volume = Math.min(0.14, 0.05 + (db - 88) * 0.004)

  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(volume, now + 0.16)
  master.gain.setValueAtTime(volume, now + duration * 0.72)
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  master.connect(ctx.destination)

  const shaper = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(x * 2.6)
  }
  shaper.curve = curve
  shaper.connect(master)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(420, now)
  lowpass.frequency.linearRampToValueAtTime(950, now + duration * 0.45)
  lowpass.frequency.linearRampToValueAtTime(320, now + duration)
  lowpass.Q.value = 1.1
  lowpass.connect(shaper)

  // Engine firing pulses: saw + square detuned slightly, plus sub octave.
  const frequencies = [46, 92, 138]
  const oscillators = frequencies.map((frequency, index) => {
    const osc = ctx.createOscillator()
    osc.type = index === 0 ? 'sawtooth' : 'square'
    osc.frequency.setValueAtTime(frequency * 1.05, now)
    osc.frequency.linearRampToValueAtTime(frequency * 1.6, now + duration * 0.3)
    osc.frequency.linearRampToValueAtTime(frequency, now + duration * 0.75)
    const gain = ctx.createGain()
    gain.gain.value = index === 0 ? 0.55 : index === 1 ? 0.16 : 0.09
    osc.connect(gain)
    gain.connect(lowpass)
    osc.start(now)
    osc.stop(now + duration + 0.1)
    return osc
  })

  // Intake/exhaust noise layer.
  const noiseLength = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < noiseLength; i += 1) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    channel[i] = last * 3.2
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'lowpass'
  noiseFilter.frequency.value = 210
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.35
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start(now)
  noise.stop(now + duration)

  // Throttle blip LFO on the master gain.
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 5.2
  lfoGain.gain.value = volume * 0.28
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start(now)
  lfo.stop(now + duration)

  await new Promise((resolve) => window.setTimeout(resolve, duration * 1000))
  oscillators.forEach((osc) => {
    try {
      osc.disconnect()
    } catch {
      /* already stopped */
    }
  })
  try {
    master.disconnect()
    lowpass.disconnect()
    shaper.disconnect()
    noiseGain.disconnect()
    noiseFilter.disconnect()
    lfoGain.disconnect()
  } catch {
    /* noop */
  }
  return true
}

/** Records a real microphone clip when permitted; returns null if declined. */
export const recordExhaustNote = async (maxMs = 8000) => {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.start()
    const startedAt = Date.now()
    await new Promise((resolve) => window.setTimeout(resolve, maxMs))
    recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
    await new Promise((resolve) => {
      recorder.onstop = () => resolve(null)
      if (recorder.state === 'inactive') resolve(null)
    })
    const blob = new Blob(chunks, { type: chunks.length ? 'audio/webm' : 'audio/webm' })
    return {
      url: URL.createObjectURL(blob),
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      size: blob.size,
    }
  } catch {
    return null
  }
}
