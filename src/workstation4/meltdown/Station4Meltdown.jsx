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
import ModuleD from './ModuleD'
import StoryScreen from './StoryScreen'
import TutorialScreen from './TutorialScreen'
import { BEATS, D_FAILED, D_RESTORED } from './story'
import './meltdown.css'

/**
 * Flow: [loading countdown] -> opening story -> tutorial A -> A -> story 1 -> tutorial B -> B -> story 2 -> tutorial C -> C
 *       -> bonus offer -> (PLAY) story 3 -> tutorial D -> D -> ending story -> debrief.
 * The 12-minute shift clock runs ONLY while Module A, B, C or D is being played. It is paused on every story screen,
 * tutorial and the bonus offer. Fail ending: the clock hits 0 in A, B or C. Success ending: Module C completed (the clock
 * dying in D keeps the points D earned).
 */
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const MODULES = ['A', 'B', 'C'] // the three scored modules; D is an optional bonus after them
const ALL_MODULES = [...MODULES, 'D']
const PLAYING = ALL_MODULES
const round2 = (n) => Math.round(n * 100) / 100

export default function Station4Meltdown({ onComplete, onOpenStationChooser }) {
  const session = useSession()
  const preset = /^\d{6}$/.test(session?.p1_id ?? '') && /^\d{6}$/.test(session?.p2_id ?? '') && session.p1_id !== session.p2_id
    ? [session.p1_id, session.p2_id] : null
  // launch | story-opening | tut-A | A | story-1 | tut-B | B | story-2 | tut-C | C | offer | story-3 | tut-D | D | ending | end
  const [phase, setPhase] = useState('launch')
  const [ids, setIds] = useState({ p1: '', p2: '' })
  const [score, setScore] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const [timeLeft, setTimeLeft] = useState(STATION4_CONFIG.totalSeconds)
  const [fxOn, setFxOn] = useState({})
  const [logs, setLogs] = useState([])
  const [report, setReport] = useState(null)
  const [runKey, setRunKey] = useState(0)
  const [seed, setSeed] = useState(1) // picks the Code Breaker variants; fresh every run
  const timeRef = useRef(STATION4_CONFIG.totalSeconds) // seconds of shift left (fractional), only ticks while a module is played
  const lastTick = useRef(0)
  const live = useRef({})
  const phaseRef = useRef('launch')
  const committed = useRef(false)
  const finished = useRef(false)
  /** Everything fixed the moment Module C ends: the speed bonus and time_left do not change while D is played. */
  const frozen = useRef(null)
  const skipRef = useRef(() => undefined)
  // Diagnostics: per-module time, wrong tries, hints and the worst moments (shown on the end screen)
  const stats = useRef({})
  useEffect(() => { live.current = { ids, score }; phaseRef.current = phase })
  const resetStats = () => {
    stats.current = Object.fromEntries(ALL_MODULES.map((m) => [m, { seconds: 0, wrong: 0, hints: 0, flags: [] }]))
  }
  const track = useCallback((m, kind, label) => {
    const s = stats.current[m]
    if (!s) return
    if (kind === 'hint') s.hints += 1
    else s.wrong += 1
    if (label && s.flags.length < 6) s.flags.push(label)
  }, [])

  const fx = useCallback((kind) => {
    setFxOn((f) => ({ ...f, [kind]: true }))
    setTimeout(() => setFxOn((f) => ({ ...f, [kind]: false })), kind === 'strobe' ? 1200 : 600)
  }, [])
  const log = useCallback((msg, type = 'info') => {
    setLogs((l) => [{ id: Math.random(), t: new Date().toLocaleTimeString('en-GB'), msg, type }, ...l].slice(0, 2))
  }, [])

  /**
   * Hands the finished run to the host, once. raw = base (A+B+C) + speed bonus (frozen when C ended) + D.
   * time_left is the value at C's end, so playing or skipping D never changes a tie-break.
   */
  const commit = useCallback((d, dPlayed = false, dEnding = null) => {
    const f = frozen.current
    if (!f || committed.current) return
    committed.current = true
    const { ids: i } = live.current
    const raw = round2(f.base + f.bonus + d)
    const summary = { p1_id: i.p1, p2_id: i.p2, game_id: 'station4', raw_score: raw, time_left: f.left }
    setScore((x) => ({ ...x, d }))
    setReport({
      result: { outcome: f.outcome, a: f.a, b: f.b, c: f.c, d, dPlayed, dEnding, bonus: f.bonus },
      summary, diag: Object.fromEntries(Object.entries(stats.current).map(([m, v]) => [m, { ...v, seconds: Math.round(v.seconds), flags: [...v.flags] }])),
    })
    setPhase('ending')
    try { onComplete?.(summary) } catch { /* host callback must not break the end screen */ }
    try {
      window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }))
      localStorage.setItem('ws4_last_session', JSON.stringify(summary))
      fetch('/api/workstation4/save-result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summary),
      }).catch(() => {})
    } catch { /* storage / network unavailable */ }
  }, [onComplete])

  /**
   * The shift is over in A, B or C ('timeout'), or Module C was completed ('complete'): freeze base, speed bonus and
   * time_left. A completed C with at least 90 s left offers Module D; otherwise the run goes straight to its ending.
   */
  const finish = useCallback((outcome, left) => {
    if (finished.current) return
    finished.current = true
    const { score: s } = live.current
    const base = s.a + s.b + s.c
    const done = outcome === 'complete'
    frozen.current = { outcome, a: s.a, b: s.b, c: s.c, base, bonus: speedBonus(left, done, base), left }
    setTimeLeft(left)
    if (done && left >= STATION4_CONFIG.moduleD.minSecondsToOffer) setPhase('offer')
    else commit(0)
  }, [commit])

  const completeC = () => finish('complete', Math.ceil(timeRef.current))
  const playD = () => { if (frozen.current && phase === 'offer') setPhase('story-3') }
  const skipD = () => { if (phase === 'offer') commit(0) }
  const doneD = useCallback((d, how) => {
    if (phaseRef.current !== 'D') return
    commit(d, true, how)
  }, [commit])
  useEffect(() => { skipRef.current = skipD })

  // The shift clock: timestamp driven, advances ONLY while Module A, B, C or D is on screen
  const running = PLAYING.includes(phase)
  useEffect(() => {
    lastTick.current = Date.now()
    const t = setInterval(() => {
      const now = Date.now()
      const dt = Math.min(1, Math.max(0, (now - lastTick.current) / 1000))
      lastTick.current = now
      const p = phaseRef.current
      if (!PLAYING.includes(p)) return
      timeRef.current = Math.max(0, timeRef.current - dt)
      const st = stats.current[p]
      if (st) st.seconds += dt
      const left = Math.ceil(timeRef.current)
      setTimeLeft(left)
      // in A, B or C this is a failed mission; in D the module ends itself and the run is still a success
      if (left <= 0 && p !== 'D') finish('timeout', 0)
    }, 250)
    return () => clearInterval(t)
  }, [finish])

  // an unanswered BONUS offer auto-skips so an idle kiosk still saves the run
  useEffect(() => {
    if (phase !== 'offer') return undefined
    const t = setTimeout(() => skipRef.current(), STATION4_CONFIG.moduleD.offerSeconds * 1000)
    return () => clearTimeout(t)
  }, [phase])

  const launch = (p1, p2) => {
    finished.current = false
    committed.current = false
    frozen.current = null
    setSeed(Date.now())
    timeRef.current = STATION4_CONFIG.totalSeconds
    setTimeLeft(STATION4_CONFIG.totalSeconds)
    setIds({ p1, p2 })
    resetStats()
    setPhase('story-opening')
    log('QUARANTINE ENGAGED', 'ok')
  }
  const restart = () => {
    // Replays go back through the launcher so the attempt cap is checked
    if (onOpenStationChooser) { onOpenStationChooser(); return }
    finished.current = false
    committed.current = false
    frozen.current = null
    timeRef.current = STATION4_CONFIG.totalSeconds
    setScore({ a: 0, b: 0, c: 0, d: 0 }); setTimeLeft(STATION4_CONFIG.totalSeconds); setLogs([]); setReport(null)
    setRunKey((k) => k + 1)
    setPhase('launch')
  }

  const modOf = (p) => {
    const m = p.startsWith('tut-') ? p.slice(4) : p
    return ALL_MODULES.includes(m) ? m : null
  }
  const inRun = phase !== 'launch' && phase !== 'ending' && phase !== 'end'
  const withD = ['offer', 'story-3', 'tut-D', 'D'].includes(phase)
  const mod = modOf(phase)
  const critical = timeLeft <= 120 && running
  const idx = withD ? MODULES.length : Math.max(0, MODULES.indexOf(mod ?? (phase === 'story-1' ? 'B' : phase === 'story-2' ? 'C' : 'A')))
  const load = withD ? '0.0' : Math.max(0, TELEMETRY_BASELINE.pathogenLoad * (1 - idx / 3 - 0.04)).toFixed(1)
  const pathogen = inRun ? load : TELEMETRY_BASELINE.pathogenLoad
  const shellCls = ['mz-shell', fxOn.shake && 'fx-shake', fxOn.glitch && 'fx-glitch', critical && 'is-critical'].filter(Boolean).join(' ')

  const endBeat = report?.result.outcome === 'timeout' ? BEATS.fail : BEATS.success
  const endExtra = report?.result.outcome === 'complete'
    ? [report.result.dPlayed && report.result.dEnding === 'win' ? D_RESTORED : D_FAILED] : undefined

  return (
    <div className={shellCls} data-phase={phase}>
      <LabBackdrop />
      <div className="mz-scan" aria-hidden="true" />
      {fxOn.strobe && <div className="mz-strobe" aria-hidden="true" />}

      {inRun && (
        <header className="mz-header">
          <div className="mz-brand">
            <b>AREA 51 MELTDOWN</b>
            <span>STATION 04 // OPS {ids.p1} + {ids.p2}</span>
          </div>
          <nav className="mz-modnav" aria-label="Module progress">
            {(withD ? ALL_MODULES : MODULES).map((m, i) => (
              <span key={m} className={`${mod === m ? 'on' : ''} ${idx > i ? 'done' : ''}`}>
                {idx > i ? '■' : mod === m ? '▶' : '□'} {m === 'D' ? 'CODE BREAKER' : `MODULE ${m}`}
              </span>
            ))}
          </nav>
          <div className="mz-telemetry mz-hdr-tele">
            <span className={Number(pathogen) > 50 ? 'mz-red' : 'mz-green'}>PATHOGEN {pathogen}%</span>
            <span>SCORE {Math.round((score.a + score.b + score.c + score.d) * 10) / 10}</span>
          </div>
        </header>
      )}

      {/* unified countdown, fixed top-right on every stage after launch; it only runs while a module is played */}
      {inRun && (
        <div className={`mz-clock mz-chamfer-sm ${critical ? 'hot' : ''} ${running ? '' : 'is-paused'}`} role="timer" aria-label="Time remaining" data-clock data-running={running ? '1' : '0'}>
          <small>{running ? 'T-MINUS' : 'CLOCK PAUSED'}</small>
          <b>{fmt(timeLeft)}</b>
        </div>
      )}

      <main className="mz-main">
        {phase === 'launch' && <LaunchScreen key={runKey} preset={preset} onLaunch={launch} onOpenStationChooser={onOpenStationChooser} />}

        {phase === 'tut-A' && <TutorialScreen module="A" onContinue={() => setPhase('A')} />}
        {phase === 'A' && (
          <ModuleA fx={fx} log={log} track={track} onScore={(a) => setScore((s) => ({ ...s, a }))} onDone={() => setPhase('story-1')} />
        )}
        {phase === 'tut-B' && <TutorialScreen module="B" onContinue={() => setPhase('B')} />}
        {phase === 'B' && (
          <ModuleB fx={fx} log={log} track={track} onScore={(b) => setScore((s) => ({ ...s, b }))} onDone={() => setPhase('story-2')} />
        )}
        {phase === 'tut-C' && <TutorialScreen module="C" onContinue={() => setPhase('C')} />}
        {phase === 'C' && (
          <ModuleC fx={fx} log={log} track={track} onScore={(c) => setScore((s) => ({ ...s, c }))} onDone={completeC} />
        )}
        {phase === 'offer' && (
          <div className="mz-offer mz-panel mz-chamfer mz-fade-in" role="dialog" aria-label="Code Breaker bonus offer">
            <small>BONUS ROUND · CLOCK PAUSED</small>
            <h2>CODE BREAKER</h2>
            <p>UP TO <b>+{STATION4_CONFIG.scoring.moduleD}</b> · {fmt(timeLeft)} OF SHIFT LEFT</p>
            <p className="mz-offer-note">Three demolition codes. Your speed bonus is already locked in.</p>
            <div className="mz-offer-actions">
              <button type="button" className="mz-btn mz-btn-green mz-big" onClick={playD} autoFocus data-offer-play>[ PLAY ]</button>
              <button type="button" className="mz-btn mz-btn-ghost mz-big" onClick={skipD} data-offer-skip>[ SKIP ]</button>
            </div>
            <span className="mz-offer-auto" aria-hidden><i style={{ '--offer-s': `${STATION4_CONFIG.moduleD.offerSeconds}s` }} /></span>
          </div>
        )}
        {phase === 'tut-D' && <TutorialScreen module="D" onContinue={() => setPhase('D')} />}
        {phase === 'D' && (
          <ModuleD
            timeLeft={timeLeft} seed={seed} fx={fx} log={log} track={track}
            onScore={(d) => setScore((s) => ({ ...s, d }))}
            onDone={doneD}
          />
        )}
        {phase === 'end' && report && <EndScreen result={report.result} summary={report.summary} diag={report.diag} onRestart={restart} />}
      </main>

      {inRun && (
        <footer className="mz-log" aria-live="polite">
          {logs.map((l) => (<div key={l.id} className={`l-${l.type}`}><i>{l.t}</i> {l.msg}</div>))}
        </footer>
      )}

      {/* story screens sit above everything; the clock is paused while they are up */}
      {phase === 'story-opening' && <StoryScreen key="opening" beat={BEATS.opening} onContinue={() => setPhase('tut-A')} />}
      {phase === 'story-1' && <StoryScreen key="story1" beat={BEATS.story1} onContinue={() => setPhase('tut-B')} />}
      {phase === 'story-2' && <StoryScreen key="story2" beat={BEATS.story2} onContinue={() => setPhase('tut-C')} />}
      {phase === 'story-3' && <StoryScreen key="story3" beat={BEATS.story3} onContinue={() => setPhase('tut-D')} />}
      {phase === 'ending' && report && (
        <StoryScreen key={`end-${endBeat.id}`} beat={endBeat} extra={endExtra} onContinue={() => setPhase('end')} />
      )}
    </div>
  )
}
