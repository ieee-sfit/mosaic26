import { diagnose, mmss, type ModuleStat } from './diagnose'
import './diagnostics.css'

interface Props {
  stats: ModuleStat[]
  /** One short tip per module id, shown for the focus module only. */
  tips: Record<string, string>
}

/** End-of-run "where you lost points" panel. Short on purpose: time vs par, mistakes, one tip. */
export default function Diagnostics({ stats, tips }: Props) {
  const { focus, trouble } = diagnose(stats)
  return (
    <section className="dg-root" aria-label="Run diagnostic">
      <h3 className="dg-title">WHERE YOU LOST POINTS</h3>
      <ul className="dg-rows">
        {stats.map((s) => {
          const over = s.seconds > s.par * 1.25
          const pct = Math.min(100, (s.seconds / Math.max(1, s.par * 1.6)) * 100)
          return (
            <li key={s.id} className={focus?.id === s.id ? 'is-focus' : ''}>
              <div className="dg-line">
                <b>{s.label}</b>
                <span className="dg-pts">{Math.round(s.score * 10) / 10}/{s.max}</span>
              </div>
              <div className="dg-bar" title={`par ${mmss(s.par)}`}>
                <i className={over ? 'is-over' : ''} style={{ width: `${pct}%` }} />
                <em style={{ left: `${(1 / 1.6) * 100}%` }} />
              </div>
              <div className="dg-meta">
                <span className={over ? 'dg-bad' : ''}>{mmss(s.seconds)} <small>par {mmss(s.par)}</small></span>
                <span className={s.wrong ? 'dg-bad' : ''}>✖ {s.wrong}</span>
                <span className={s.hints ? 'dg-warn' : ''}>? {s.hints}</span>
                {trouble[s.id] < 0.8 && <span className="dg-ok">CLEAN</span>}
              </div>
              {s.flags.length > 0 && <div className="dg-flags">{s.flags.slice(0, 3).join(' · ')}</div>}
            </li>
          )
        })}
      </ul>
      <p className={`dg-focus ${focus ? '' : 'is-clean'}`}>
        {focus ? <><b>NEXT TIME: {focus.label}.</b> {tips[focus.id]}</> : <b>CLEAN RUN. Beat your time for a higher bonus.</b>}
      </p>
    </section>
  )
}
