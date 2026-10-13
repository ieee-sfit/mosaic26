/** Web Audio pads, ambience, and one-shot FX. No bundled media files. */

const S = {
  ctx: null,
  master: null,
  musicGain: null,
  ambGain: null,
  sfxGain: null,
  musicNodes: [],
  ambNodes: [],
  muted: false,
  mood: null,
  amb: null,
}

function ac() {
  return window.AudioContext || window.webkitAudioContext
}

export function unlockAudio() {
  const AC = ac()
  if (!AC) return null
  if (!S.ctx) {
    S.ctx = new AC()
    S.master = S.ctx.createGain()
    S.master.gain.value = S.muted ? 0 : 1
    S.master.connect(S.ctx.destination)
    S.musicGain = S.ctx.createGain()
    S.musicGain.gain.value = 0.14
    S.musicGain.connect(S.master)
    S.ambGain = S.ctx.createGain()
    S.ambGain.gain.value = 0.18
    S.ambGain.connect(S.master)
    S.sfxGain = S.ctx.createGain()
    S.sfxGain.gain.value = 0.32
    S.sfxGain.connect(S.master)
  }
  if (S.ctx.state === 'suspended') S.ctx.resume().catch(() => {})
  return S.ctx
}

export function setMuted(on) {
  S.muted = !!on
  if (S.master) S.master.gain.setTargetAtTime(S.muted ? 0 : 1, S.ctx.currentTime, 0.05)
  if (S.muted) window.speechSynthesis?.cancel()
}

export function isMuted() {
  return S.muted
}

export function duckMusic(on) {
  if (!S.musicGain || !S.ctx) return
  const v = on ? 0.04 : 0.14
  S.musicGain.gain.setTargetAtTime(v, S.ctx.currentTime, 0.12)
}

function stopGroup(list) {
  list.forEach((n) => {
    try { n.stop() } catch { /* already stopped */ }
    try { n.disconnect() } catch { /* */ }
  })
  list.length = 0
}

function noiseSrc() {
  const len = S.ctx.sampleRate * 2
  const buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = S.ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

export function setMusic(mood) {
  unlockAudio()
  if (!S.ctx) return
  if (mood === S.mood) return
  stopGroup(S.musicNodes)
  S.mood = mood
  if (!mood || mood === 'none') return
  const table = {
    tension: [123.47, 155.56, 185.0, 246.94],
    alarm: [110, 138.59, 164.81],
    triumph: [196, 246.94, 293.66, 392],
    quiet: [98, 146.83],
    play: [123.47, 155.56],
  }
  const freqs = table[mood] || table.tension
  freqs.forEach((f, i) => {
    const o = S.ctx.createOscillator()
    const g = S.ctx.createGain()
    o.type = i % 2 ? 'triangle' : 'sawtooth'
    o.frequency.value = f
    g.gain.value = mood === 'triumph' ? 0.035 : 0.028
    const lfo = S.ctx.createOscillator()
    const lg = S.ctx.createGain()
    lfo.frequency.value = 0.07 + i * 0.025
    lg.gain.value = 0.012
    lfo.connect(lg)
    lg.connect(g.gain)
    o.connect(g)
    g.connect(S.musicGain)
    o.start()
    lfo.start()
    S.musicNodes.push(o, lfo)
  })
}

export function setAmbience(kind) {
  unlockAudio()
  if (!S.ctx) return
  if (kind === S.amb) return
  stopGroup(S.ambNodes)
  S.amb = kind
  if (!kind || kind === 'none') return
  const src = noiseSrc()
  const bp = S.ctx.createBiquadFilter()
  bp.type = 'bandpass'
  if (kind === 'outbreak') { bp.frequency.value = 420; bp.Q.value = 0.6 }
  else if (kind === 'alarm') { bp.frequency.value = 900; bp.Q.value = 3 }
  else if (kind === 'dawn') { bp.frequency.value = 1800; bp.Q.value = 0.4 }
  else { bp.frequency.value = 280; bp.Q.value = 0.8 }
  const g = S.ctx.createGain()
  g.gain.value = kind === 'dawn' ? 0.04 : 0.09
  src.connect(bp)
  bp.connect(g)
  g.connect(S.ambGain)
  src.start()
  S.ambNodes.push(src)

  if (kind === 'outbreak' || kind === 'alarm') {
    const o = S.ctx.createOscillator()
    const og = S.ctx.createGain()
    o.type = 'sine'
    o.frequency.value = kind === 'alarm' ? 780 : 620
    og.gain.value = 0.03
    const lfo = S.ctx.createOscillator()
    const lg = S.ctx.createGain()
    lfo.frequency.value = kind === 'alarm' ? 2.2 : 0.35
    lg.gain.value = 80
    lfo.connect(lg)
    lg.connect(o.frequency)
    o.connect(og)
    og.connect(S.ambGain)
    o.start()
    lfo.start()
    S.ambNodes.push(o, lfo)
  }
}

export function cue(kind) {
  unlockAudio()
  if (!S.ctx || S.muted) return
  const t = S.ctx.currentTime
  const beep = (freq, dur, type = 'square', vol = 0.12) => {
    const o = S.ctx.createOscillator()
    const g = S.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(S.sfxGain)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
  if (kind === 'correct') beep(880, 0.12, 'square', 0.1)
  else if (kind === 'wrong') beep(140, 0.28, 'sawtooth', 0.14)
  else if (kind === 'beep') beep(640, 0.08, 'square', 0.08)
  else if (kind === 'static') {
    const src = noiseSrc()
    const g = S.ctx.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    src.connect(g)
    g.connect(S.sfxGain)
    src.start(t)
    src.stop(t + 0.36)
  } else if (kind === 'door') {
    const src = noiseSrc()
    const f = S.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(200, t)
    f.frequency.exponentialRampToValueAtTime(80, t + 1.1)
    const g = S.ctx.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    src.connect(f)
    f.connect(g)
    g.connect(S.sfxGain)
    src.start(t)
    src.stop(t + 1.22)
    beep(90, 0.4, 'sine', 0.16)
  } else if (kind === 'circuit') {
    beep(520, 0.08)
    beep(780, 0.1)
  } else if (kind === 'alarm' || kind === 'siren') {
    const o = S.ctx.createOscillator()
    const g = S.ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(420, t)
    o.frequency.linearRampToValueAtTime(780, t + 0.45)
    o.frequency.linearRampToValueAtTime(420, t + 0.9)
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    o.connect(g)
    g.connect(S.sfxGain)
    o.start(t)
    o.stop(t + 1.12)
  } else if (kind === 'fanfare') {
    beep(392, 0.18, 'triangle', 0.1)
    setTimeout(() => beep(523, 0.22, 'triangle', 0.1), 160)
    setTimeout(() => beep(659, 0.35, 'triangle', 0.12), 320)
  } else if (kind === 'thud') beep(70, 0.22, 'sine', 0.18)
}

export function stopAllAudio() {
  stopGroup(S.musicNodes)
  stopGroup(S.ambNodes)
  S.mood = null
  S.amb = null
  window.speechSynthesis?.cancel()
}

export function stopVoice() {
  window.speechSynthesis?.cancel()
}

function pickVoice() {
  const list = window.speechSynthesis?.getVoices?.() || []
  const en = list.filter((v) => /en[-_]/i.test(v.lang))
  return (
    en.find((v) => /male|daniel|david|guy|george|matthew/i.test(v.name)) ||
    en.find((v) => /en-GB/i.test(v.lang)) ||
    en[0] ||
    list[0] ||
    null
  )
}

export function speakLines(lines, { getMuted, onLine, onDone }) {
  let i = 0
  let timer = 0
  let gen = 0
  let dead = false
  const finish = () => {
    if (dead) return
    dead = true
    duckMusic(false)
    onDone?.()
  }
  const next = () => {
    if (dead) return
    window.clearTimeout(timer)
    if (i >= lines.length) {
      finish()
      return
    }
    const text = lines[i]
    onLine?.(i)
    i += 1
    const my = ++gen
    const wait = Math.min(14000, 800 + text.split(/\s+/).length * 310)
    const go = () => { if (!dead && gen === my) next() }
    if (getMuted?.() || !window.speechSynthesis) {
      timer = window.setTimeout(go, wait)
      return
    }
    duckMusic(true)
    const u = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) u.voice = voice
    u.rate = 0.92
    u.pitch = 0.82
    u.volume = 1
    u.onend = go
    u.onerror = go
    try {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
      timer = window.setTimeout(go, wait + 3500)
    } catch {
      timer = window.setTimeout(go, wait)
    }
  }
  window.speechSynthesis?.getVoices?.()
  next()
  return () => {
    dead = true
    window.clearTimeout(timer)
    window.speechSynthesis?.cancel()
    duckMusic(false)
  }
}
