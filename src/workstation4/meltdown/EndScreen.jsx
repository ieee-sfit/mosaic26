import { STATION4_CONFIG } from '../mockStation4Data'
import Diagnostics from '../../core/Diagnostics'
import { SCORING, gradeFor } from '../../core/scoring'

/** Expected clean-run time per module (seconds), used only to flag slow modules. */
const PAR = { A: 120, B: 240, C: 300, D: 150 }
const TIPS = {
  A: 'Work the gate out from its truth table, then answer.',
  B: 'Read the TARGET table first, then pick the chip, then power and wires.',
  C: 'Trace back from the door. Green is 1, red is 0: flip an input or swap a gate.',
  D: 'Start from the single contacts: they fix a bit. Then rule out the rest, one rung at a time.',
}
const HEAD = {
  complete: ['QUARANTINE HELD', 'mz-green', 'ALL MODULES CLEARED'],
  timeout: ['CONTAINMENT LOST', 'mz-red', 'TIME EXPIRED'],
}

const fmt = (s = 0) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function EndScreen({ result, summary, diag, onRestart }) {
  const { outcome, a, b, c, d, dPlayed, dEnding, bonus } = result
  const cfg = STATION4_CONFIG.scoring
  const base = a + b + c
  const timeLeft = summary?.time_left ?? 0
  // a played Module D ends the story: the escape either destroys the facility or fails
  const head = dPlayed && dEnding === 'win' ? ['FACILITY DESTROYED', 'mz-green', 'OUTBREAK ENDED']
    : dPlayed && dEnding === 'fail' ? ['DETONATION FAILED', 'mz-red', 'THE FACILITY STANDS']
      : HEAD[outcome]
  const rows = [
    { id: 'A', label: 'MODULE A', score: a, max: cfg.moduleA },
    { id: 'B', label: 'MODULE B', score: b, max: cfg.moduleB },
    { id: 'C', label: 'MODULE C', score: c, max: cfg.moduleC },
    ...(dPlayed ? [{ id: 'D', label: 'CODE BREAKER', score: d, max: cfg.moduleD }] : []),
  ]
  const stats = rows.map((r) => ({
    ...r,
    par: PAR[r.id],
    seconds: diag?.[r.id]?.seconds ?? 0,
    wrong: diag?.[r.id]?.wrong ?? 0,
    hints: diag?.[r.id]?.hints ?? 0,
    flags: diag?.[r.id]?.flags ?? [],
  }))

  return (
    <div className={`mz-end2 ${outcome === 'complete' ? '' : 'is-bad'}`}>
      <div className="mz-end2-left">
        <span className="mz-end2-tag">STATION 04 · DEBRIEF</span>
        <h1 className={`mz-end2-head ${head[1]}`}>{head[0]}</h1>
        <p className="mz-end2-line">&gt; {head[2]}</p>
        <p className="mz-end2-line" style={{ color: '#22c55e' }}>&gt; TIME REMAINING: {fmt(timeLeft)} ({timeLeft}s)</p>
        <p className="mz-end2-line">&gt; BASE {Math.round(base)}/100 · SPEED BONUS +{bonus}/{cfg.speedBonusMax}</p>
        {dPlayed && <p className="mz-end2-line">&gt; CODE BREAKER +{Math.round(d * 10) / 10} / {SCORING.bonusModuleMax}</p>}
        <div className="mz-end2-score">
          <div>
            <small>TOTAL_SCORE</small>
            <b>{Math.round(summary.raw_score)}<span>/{SCORING.rawMax}</span></b>
          </div>
          <div style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '4px' }}>
            <small style={{ color: '#22c55e' }}>TIME REMAINING</small>
            <b style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#fff', textShadow: '0 0 20px rgba(34, 197, 94, .45)' }}>
              {fmt(timeLeft)}
              <span style={{ fontSize: '18px', color: '#22c55e', marginLeft: '6px' }}>({timeLeft}s)</span>
            </b>
          </div>
          <div className="mz-end2-grade"><small>RATING</small><b>{gradeFor(base)}</b></div>
        </div>
        <button type="button" className="mz-btn mz-btn-amber mz-big" onClick={onRestart}>[ PLAY AGAIN ]</button>
      </div>

      <div className="mz-end2-right">
        {stats.map((s) => (
          <div key={s.id} className="mz-end2-card">
            <header><span>{s.label}</span><b>{Math.round(s.score * 10) / 10}<em>/{s.max}</em></b></header>
            <div className="mz-end2-bar" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => <i key={i} className={s.max && (i + 1) / 20 <= s.score / s.max + 0.001 ? 'on' : ''} />)}
            </div>
          </div>
        ))}
        <Diagnostics stats={stats} tips={TIPS} />
      </div>
    </div>
  )
}
