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
import './meltdown.css'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const MODULES = ['A', 'B', 'C']

export default function Station4Meltdown({ onComplete, onOpenStationChooser }) {
  const session = useSession()
  const preset = /^\d{6}$/.test(session?.p1_id ?? '') && /^\d{6}$/.test(session?.p2_id ?? '')
    ? [session.p1_id, session.p2_id] : null
  const [stage, setStage] = useState('launch') // launch | play | end
  const [ids, setIds] = useState({ p1: '', p2: '' })
  const [mod, setMod] = useState('A')
  const [score, setScore] = useState({ a: 0, b: 0, c: 0 })
  const [seals, setSeals] = useState(STATION4_CONFIG.moduleC.seals)
  const [timeLeft, setTimeLeft] = useState(STATION4_CONFIG.totalSeconds)
  const [fxOn, setFxOn] = useState({})
  const [logs, setLogs] = useState([])
  const [report, setReport] = useState(null)
  const endAt = useRef(0)
  const live = useRef({})
  const finished = useRef(false)
  // Diagnostics: per-module time, wrong tries, hints and the worst moments (shown on the end screen)
  const stats = useRef({})
  const modStart = useRef(0)
  const modRef = useRef('A')
  useEffect(() => { live.current = { ids, score, timeLeft }; modRef.current = mod })
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
  const goMod = (next) => { closeModule(); setMod(next) }

  const fx = useCallback((kind) => {
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
    setStage('end')
    try { onComplete?.(summary) } catch { /* host callback must not break the end screen */ }
    try {
      window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }))
      localStorage.setItem('ws4_last_session', JSON.stringify(summary))
      fetch('/api/workstation4/save-result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summary),
      }).catch(() => {})
    } catch { /* storage / network unavailable */ }
  }, [onComplete, closeModule])

  // timestamp-driven 12:00 countdown
  useEffect(() => {
    if (stage !== 'play') return undefined
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) finish('timeout', 0)
    }
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [stage, finish])

  const launch = (p1, p2) => {
    endAt.current = Date.now() + STATION4_CONFIG.totalSeconds * 1000
    setIds({ p1, p2 })
    resetStats()
    setStage('play')
    log('QUARANTINE ENGAGED', 'ok')
  }
  const restart = () => {
    // Replays go back through the launcher so the attempt cap is checked
    if (onOpenStationChooser) { onOpenStationChooser(); return }
    finished.current = false
    setScore({ a: 0, b: 0, c: 0 }); setSeals(STATION4_CONFIG.moduleC.seals)
    setMod('A'); modRef.current = 'A'; setTimeLeft(STATION4_CONFIG.totalSeconds); setLogs([]); setReport(null); setStage('launch')
  }

  const critical = timeLeft <= 120 && stage === 'play'
  const load = Math.max(0, TELEMETRY_BASELINE.pathogenLoad * (1 - (MODULES.indexOf(mod) / 3) - 0.04)).toFixed(1)
  const pathogen = stage === 'play' ? load : TELEMETRY_BASELINE.pathogenLoad
  const shellCls = ['mz-shell', fxOn.shake && 'fx-shake', fxOn.glitch && 'fx-glitch', critical && 'is-critical'].filter(Boolean).join(' ')

  return (
    <div className={shellCls}>
      <LabBackdrop />
      <div className="mz-scan" aria-hidden="true" />
      {fxOn.strobe && <div className="mz-strobe" aria-hidden="true" />}

      {stage === 'play' && (
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
      {stage === 'play' && (
        <div className={`mz-clock mz-chamfer-sm ${critical ? 'hot' : ''}`} role="timer" aria-label="Time remaining">
          <small>T-MINUS</small>
          <b>{fmt(timeLeft)}</b>
        </div>
      )}

      <main className="mz-main">
        {stage === 'launch' && <LaunchScreen preset={preset} onLaunch={launch} onOpenStationChooser={onOpenStationChooser} />}
        {stage === 'play' && mod === 'A' && (
          <ModuleA fx={fx} log={log} track={track} onScore={(a) => setScore((s) => ({ ...s, a }))} onDone={() => goMod('B')} />
        )}
        {stage === 'play' && mod === 'B' && (
          <ModuleB fx={fx} log={log} track={track} onScore={(b) => setScore((s) => ({ ...s, b }))} onDone={() => goMod('C')} />
        )}
        {stage === 'play' && mod === 'C' && (
          <ModuleC
            fx={fx} log={log} track={track} onSeals={setSeals}
            onScore={(c) => setScore((s) => ({ ...s, c }))}
            onDone={() => finish('complete', Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))}
            onForfeit={() => finish('forfeit', Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))}
          />
        )}
        {stage === 'end' && report && <EndScreen result={report.result} summary={report.summary} diag={report.diag} onRestart={restart} />}
      </main>

      {stage === 'play' && (
        <footer className="mz-log" aria-live="polite">
          {logs.map((l) => (<div key={l.id} className={`l-${l.type}`}><i>{l.t}</i> {l.msg}</div>))}
        </footer>
      )}
    </div>
  )
}
