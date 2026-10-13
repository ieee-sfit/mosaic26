import { useSession } from '../../session/sessionContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { STATION4_CONFIG, TELEMETRY_BASELINE } from '../mockStation4Data'
import { speedBonus } from './logic'
import LaunchScreen from './LaunchScreen'
import EndScreen from './EndScreen'
import LabBackdrop from './LabBackdrop'
import ModuleA from './ModuleA'
import ModuleB from './ModuleB'
import ModuleC from './ModuleC'
import Cinematic, { CineDock } from '../cinematic/Cinematic'
import { CINE_NEXT, teamLabel } from '../cinematic/script'
import { cue, setAmbience, setMusic, setMuted, stopAllAudio, unlockAudio } from '../cinematic/soundscape'
import './meltdown.css'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const MODULES = ['A', 'B', 'C']

export default function Station4Meltdown({ onComplete, onOpenStationChooser }) {
  const session = useSession()
  const preset = /^\d{6}$/.test(session?.p1_id ?? '') && /^\d{6}$/.test(session?.p2_id ?? '')
    ? [session.p1_id, session.p2_id] : null
  const [stage, setStage] = useState('launch') // launch | play | end
  const [cine, setCine] = useState(null)
  const [muted, setMute] = useState(false)
  const [ids, setIds] = useState({ p1: '', p2: '' })
  const [mod, setMod] = useState(null)
  const [score, setScore] = useState({ a: 0, b: 0, c: 0 })
  const [seals, setSeals] = useState(STATION4_CONFIG.moduleC.seals)
  const [timeLeft, setTimeLeft] = useState(STATION4_CONFIG.totalSeconds)
  const [fxOn, setFxOn] = useState({})
  const [logs, setLogs] = useState([])
  const [report, setReport] = useState(null)
  const endAt = useRef(0)
  const pausedLeft = useRef(null)
  const clockOn = useRef(false)
  const live = useRef({})
  const finished = useRef(false)
  const cineOnce = useRef(new Set())
  const cineRef = useRef(null)
  // Diagnostics: per-module time, wrong tries, hints and the worst moments (shown on the end screen)
  const stats = useRef({})
  const modStart = useRef(0)
  const modRef = useRef('A')
  useEffect(() => { live.current = { ids, score, timeLeft }; modRef.current = mod; cineRef.current = cine })
  const resetStats = () => {
    stats.current = Object.fromEntries(MODULES.map((m) => [m, { seconds: 0, wrong: 0, hints: 0, flags: [] }]))
    modStart.current = Date.now()
  }
  const track = useCallback((m, kind, label) => {
    const s = stats.current[m]
    if (!s) return
    if (kind === 'hint') s.hints += 1
    else s.wrong += 1
    if (label && s.flags.length < 6) s.flags.push(label)
  }, [])
  const closeModule = useCallback(() => {
    const s = stats.current[modRef.current]
    if (s) s.seconds += Math.round((Date.now() - modStart.current) / 1000)
    modStart.current = Date.now()
  }, [])
  const pauseClock = () => {
    if (!clockOn.current || pausedLeft.current != null) return
    pausedLeft.current = Math.max(0, endAt.current - Date.now())
  }
  const resumeClock = () => {
    if (!clockOn.current) {
      clockOn.current = true
      endAt.current = Date.now() + STATION4_CONFIG.totalSeconds * 1000
      pausedLeft.current = null
      setTimeLeft(STATION4_CONFIG.totalSeconds)
      return
    }
    if (pausedLeft.current == null) return
    endAt.current = Date.now() + pausedLeft.current
    pausedLeft.current = null
  }
  const playCine = useCallback((id) => {
    if (!id || cineOnce.current.has(id)) return
    cineOnce.current.add(id)
    pauseClock()
    setCine(id)
  }, [])

  const fx = useCallback((kind) => {
    if (kind === 'glitch') cue('wrong')
    if (kind === 'shake' || kind === 'strobe') cue('thud')
    setFxOn((f) => ({ ...f, [kind]: true }))
    setTimeout(() => setFxOn((f) => ({ ...f, [kind]: false })), kind === 'strobe' ? 1200 : 600)
  }, [])
  const log = useCallback((msg, type = 'info') => {
    setLogs((l) => [{ id: Math.random(), t: new Date().toLocaleTimeString('en-GB'), msg, type }, ...l].slice(0, 2))
  }, [])

  const finish = useCallback((outcome, tl) => {
    if (finished.current) return
    finished.current = true
    closeModule()
    const { ids: i, score: s } = live.current
    const c = outcome === 'forfeit' ? 0 : s.c
    const bonus = speedBonus(tl, outcome === 'complete', s.a + s.b + c)
    const raw = Math.round((s.a + s.b + c + bonus) * 100) / 100
    const summary = { p1_id: i.p1, p2_id: i.p2, game_id: 'station4', raw_score: raw, time_left: tl }
    setReport({ result: { outcome, a: s.a, b: s.b, c, bonus }, summary, diag: JSON.parse(JSON.stringify(stats.current)) })
    playCine(outcome === 'complete' ? 'escape' : 'lost')
    try { onComplete?.(summary) } catch { /* host callback must not break the end screen */ }
    try {
      window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }))
      localStorage.setItem('ws4_last_session', JSON.stringify(summary))
      fetch('/api/workstation4/save-result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summary),
      }).catch(() => {})
    } catch { /* storage / network unavailable */ }
  }, [onComplete, closeModule, playCine])

  // timestamp-driven 12:00 countdown
  useEffect(() => {
    if (stage !== 'play' || cine) return undefined
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) finish('timeout', 0)
    }
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [stage, cine, finish])

  const launch = (p1, p2) => {
    unlockAudio()
    setIds({ p1, p2 })
    resetStats()
    clockOn.current = false
    pausedLeft.current = null
    cineOnce.current.clear()
    setMod(null)
    setStage('play')
    playCine('opening')
    log('QUARANTINE ENGAGED', 'ok')
  }
  const restart = () => {
    stopAllAudio()
    // Replays go back through the launcher so the attempt cap is checked
    if (onOpenStationChooser) { onOpenStationChooser(); return }
    finished.current = false
    cineOnce.current.clear()
    clockOn.current = false
    pausedLeft.current = null
    setScore({ a: 0, b: 0, c: 0 }); setSeals(STATION4_CONFIG.moduleC.seals)
    setMod(null); modRef.current = null; setTimeLeft(STATION4_CONFIG.totalSeconds); setLogs([]); setReport(null); setCine(null); setStage('launch')
  }

  const onCineDone = () => {
    const id = cineRef.current
    const next = CINE_NEXT[id]
    if (next === 'PLAY_A' || next === 'PLAY_B' || next === 'PLAY_C') {
      modStart.current = Date.now()
      setMusic('play')
      setAmbience('lab')
      setCine(null)
      setMod(next === 'PLAY_A' ? 'A' : next === 'PLAY_B' ? 'B' : 'C')
      resumeClock()
      return
    }
    if (next === 'END') { stopAllAudio(); setCine(null); setStage('end'); return }
    if (next) setCine(next)
  }

  const muteToggle = (on) => {
    setMute(on)
    setMuted(on)
  }

  const critical = timeLeft <= 120 && stage === 'play' && !cine
  const load = Math.max(0, TELEMETRY_BASELINE.pathogenLoad * (1 - (Math.max(0, MODULES.indexOf(mod)) / 3) - 0.04)).toFixed(1)
  const pathogen = stage === 'play' ? load : TELEMETRY_BASELINE.pathogenLoad
  const winner = report?.result?.outcome === 'complete' ? teamLabel(ids.p1, ids.p2) : ''
  const shellCls = ['mz-shell', fxOn.shake && 'fx-shake', fxOn.glitch && 'fx-glitch', critical && 'is-critical'].filter(Boolean).join(' ')

  return (
    <div className={shellCls}>
      <LabBackdrop />
      <div className="mz-scan" aria-hidden="true" />
      {fxOn.strobe && <div className="mz-strobe" aria-hidden="true" />}

      {stage === 'play' && !cine && (
        <header className="mz-header">
          <div className="mz-brand">
            <b>AREA 51 MELTDOWN</b>
            <span>STATION 04 // OPS {ids.p1} + {ids.p2}</span>
          </div>
          <nav className="mz-modnav" aria-label="Module progress">
            {MODULES.map((m, i) => (
              <span key={m} className={`${m === mod ? 'on' : ''} ${MODULES.indexOf(mod) > i ? 'done' : ''}`}>
                {MODULES.indexOf(mod) > i ? '■' : m === mod ? '▶' : '□'} MODULE {m}
              </span>
            ))}
          </nav>
          <div className="mz-telemetry mz-hdr-tele">
            <span className={Number(pathogen) > 50 ? 'mz-red' : 'mz-amber'}>PATHOGEN {pathogen}%</span>
            <span>SEALS {seals}/{STATION4_CONFIG.moduleC.seals}</span>
            <span>SCORE {Math.round((score.a + score.b + score.c) * 10) / 10}</span>
          </div>
        </header>
      )}

      {/* unified countdown, fixed top-right on every stage after launch */}
      {stage === 'play' && !cine && clockOn.current && (
        <div className={`mz-clock mz-chamfer-sm ${critical ? 'hot' : ''}`} role="timer" aria-label="Time remaining">
          <small>T-MINUS</small>
          <b>{fmt(timeLeft)}</b>
        </div>
      )}

      <main className="mz-main">
        {stage === 'launch' && <LaunchScreen preset={preset} onLaunch={launch} onOpenStationChooser={onOpenStationChooser} />}
        {stage === 'play' && !cine && mod === 'A' && (
          <ModuleA fx={fx} log={log} track={track} onScore={(a) => setScore((s) => { if (a > s.a) cue('correct'); return { ...s, a } })} onDone={() => { closeModule(); playCine('clear1') }} />
        )}
        {stage === 'play' && !cine && mod === 'B' && (
          <ModuleB fx={fx} log={log} track={track} onScore={(b) => setScore((s) => { if (b > s.b) cue('correct'); return { ...s, b } })} onDone={() => { closeModule(); playCine('clear2') }} />
        )}
        {stage === 'play' && !cine && mod === 'C' && (
          <ModuleC
            fx={fx} log={log} track={track} onSeals={setSeals}
            onScore={(c) => setScore((s) => { if (c > s.c) cue('correct'); return { ...s, c } })}
            onDone={() => finish('complete', Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))}
            onForfeit={() => finish('forfeit', Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))}
          />
        )}
        {stage === 'end' && report && <EndScreen result={report.result} summary={report.summary} diag={report.diag} onRestart={restart} />}
      </main>

      {cine && (
        <Cinematic
          sceneId={cine}
          tokens={{ winner: winner || teamLabel(ids.p1, ids.p2) }}
          muted={muted}
          onMute={muteToggle}
          onDone={onCineDone}
          gateStart={cine === 'opening'}
        />
      )}
      {stage === 'play' && !cine && <CineDock muted={muted} onMute={muteToggle} />}

      {stage === 'play' && !cine && (
        <footer className="mz-log" aria-live="polite">
          {logs.map((l) => (<div key={l.id} className={`l-${l.type}`}><i>{l.t}</i> {l.msg}</div>))}
        </footer>
      )}
    </div>
  )
}
