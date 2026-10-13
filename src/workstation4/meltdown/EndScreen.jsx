import { STATION4_CONFIG } from '../mockStation4Data'
import Diagnostics from '../../core/Diagnostics'
import { gradeFor } from '../../core/scoring'

/** Expected clean-run time per module (seconds), used only to flag slow modules. */
const PAR = { A: 120, B: 240, C: 300 }
const TIPS = {
  A: 'Open the cheat sheet first, then answer.',
  B: 'Find the lit row, then read the column.',
  C: 'Trace back from the door. Watch the phase clock.',
}
const HEAD = {
  complete: ['QUARANTINE HELD', 'mz-green', 'ALL MODULES CLEARED'],
  timeout: ['CONTAINMENT LOST', 'mz-red', 'TIME EXPIRED'],
  forfeit: ['SEALS BREACHED', 'mz-red', 'ALL SEALS BROKEN'],
}

export default function EndScreen({ result, summary, diag, onRestart }) {
  const { outcome, a, b, c, bonus } = result
  const cfg = STATION4_CONFIG.scoring
  const base = a + b + c
  const head = HEAD[outcome]
  const rows = [
    { id: 'A', label: 'MODULE A', score: a, max: cfg.moduleA },
    { id: 'B', label: 'MODULE B', score: b, max: cfg.moduleB },
    { id: 'C', label: 'MODULE C', score: c, max: cfg.moduleC },
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
        <p className="mz-end2-line">&gt; BASE {Math.round(base)}/100 · SPEED BONUS +{bonus}/{cfg.speedBonusMax}</p>
        <div className="mz-end2-score">
          <div>
            <small>TOTAL_SCORE</small>
            <b>{summary.raw_score}<span>/120</span></b>
          </div>
          <div className="mz-end2-grade"><small>RATING</small><b>{gradeFor(base)}</b></div>
        </div>
        <button type="button" className="mz-btn mz-btn-amber mz-big" onClick={onRestart}>[ PLAY AGAIN ]</button>
      </div>

      <div className="mz-end2-right">
        {stats.map((s) => (
          <div key={s.id} className="mz-end2-card">
            <header><span>{s.label}</span><b>{s.score}<em>/{s.max}</em></b></header>
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
