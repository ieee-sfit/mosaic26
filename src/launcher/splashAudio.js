// Web Audio API sound generator for CtrlFreak intro splash (zero external asset dependencies)

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

let droneOsc = null
let droneGain = null
let isMuted = false

export function setSplashMuted(muted) {
  isMuted = muted
  if (droneGain && audioCtx) {
    try {
      droneGain.gain.setValueAtTime(muted ? 0 : 0.06, audioCtx.currentTime)
    } catch {}
  }
}

export function startAmbientDrone() {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx || droneOsc) return

  try {
    droneOsc = ctx.createOscillator()
    droneGain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    droneOsc.type = 'sawtooth'
    droneOsc.frequency.setValueAtTime(55, ctx.currentTime) // Low A

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(160, ctx.currentTime)

    droneGain.gain.setValueAtTime(0.001, ctx.currentTime)
    droneGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2)

    droneOsc.connect(filter)
    filter.connect(droneGain)
    droneGain.connect(ctx.destination)

    droneOsc.start()
  } catch (err) {
    console.debug('[Audio] Drone init failed:', err)
  }
}

export function stopAmbientDrone() {
  if (droneGain && audioCtx) {
    try {
      droneGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5)
      setTimeout(() => {
        if (droneOsc) {
          droneOsc.stop()
          droneOsc.disconnect()
          droneOsc = null
          droneGain = null
        }
      }, 500)
    } catch {
      droneOsc = null
      droneGain = null
    }
  }
}

export function playSectorHoverSfx(freq = 440) {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {}
}

export function playWarpEngageSfx() {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    // 1. Ascending energy riser
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(80, now)
    osc1.frequency.exponentialRampToValueAtTime(880, now + 1.2)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(300, now)
    filter.frequency.exponentialRampToValueAtTime(3200, now + 1.2)

    gain1.gain.setValueAtTime(0.01, now)
    gain1.gain.linearRampToValueAtTime(0.12, now + 1.0)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

    osc1.connect(filter)
    filter.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 1.4)

    // 2. Sub-bass impact thud
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(140, now + 0.9)
    osc2.frequency.exponentialRampToValueAtTime(30, now + 1.4)

    gain2.gain.setValueAtTime(0.001, now + 0.9)
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.95)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.9)
    osc2.stop(now + 1.6)
  } catch {}
}
