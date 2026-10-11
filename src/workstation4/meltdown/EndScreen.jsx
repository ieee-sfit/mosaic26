import { STATION4_CONFIG } from '../mockStation4Data'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function EndScreen({ result, summary, onRestart }) {
  const { outcome, a, b, c, bonus } = result
  const head = {
    complete: ['QUARANTINE HOLDS', 'mz-green', 'ALL MODULES CLEARED'],
    timeout: ['CONTAINMENT LOST', 'mz-red', 'TIMER EXPIRED // PARTIAL CREDIT BANKED'],
    forfeit: ['SEALS BREACHED', 'mz-red', 'ALL 3 QUARANTINE SEALS BROKEN // MODULE C FORFEITED'],
  }[outcome]
  const rows = [
    ['MODULE A // PROTOCOL CHECKS', a, STATION4_CONFIG.scoring.moduleA],
    ['MODULE B // CENTRIFUGE', b, STATION4_CONFIG.scoring.moduleB],
    ['MODULE C // AIRLOCK', c, STATION4_CONFIG.scoring.moduleC],
    ['SPEED BONUS', bonus, STATION4_CONFIG.scoring.speedBonusMax],
  ]
  return (
    <div className={`mz-end mz-center-all ${outcome === 'complete' ? '' : 'mz-end-bad'}`}>
      <div className="mz-panel mz-chamfer mz-end-card">
        <header className="mz-panel-head"><span>SESSION REPORT // STATION 04</span><span>T-{fmt(summary.time_left)}</span></header>
        <div className="mz-end-body">
          <h2 className={`mz-title ${head[1]}`}>{head[0]}</h2>
          <p className="mz-dim">{head[2]}</p>
          <table className="mz-score">
            <tbody>
              {rows.map(([l, v, m]) => (
                <tr key={l}><td>{l}</td><td><b>{v}</b> / {m}</td></tr>
              ))}
              <tr className="mz-total"><td>RAW SCORE</td><td><b>{summary.raw_score}</b></td></tr>
            </tbody>
          </table>
          <pre className="mz-json">{JSON.stringify(summary, null, 2)}</pre>
          <button type="button" className="mz-btn mz-btn-green" onClick={onRestart}>[ REBOOT TERMINAL ]</button>
        </div>
      </div>
    </div>
  )
}
