import { CONFIG, MAX_BASE_SCORE } from '../mockStation3Data';
import { fmtClock } from '../utils';

export type Outcome = 'complete' | 'timeout' | 'forfeit';

export interface Breakdown {
  a: number;
  b: number;
  c: number;
  base: number;
  bonus: number;
  timeLeft: number;
  outcome: Outcome;
  p1: string;
  p2: string;
}

const OUTCOME_TEXT: Record<Outcome, { title: string; sub: string }> = {
  complete: { title: 'ALL SUSPECTS CHALLANED', sub: 'Every plate locked and issued.' },
  timeout: { title: 'MISSION CLOCK EXPIRED', sub: 'The highway went quiet — time ran out.' },
  forfeit: { title: 'PURSUIT LOST', sub: 'All radar pips burned. Module C points forfeited.' },
};

export default function SummaryScreen({
  result,
  onRestart,
  onOpenStationChooser,
}: {
  result: Breakdown;
  onRestart: () => void;
  onOpenStationChooser?: () => void;
}) {
  const o = OUTCOME_TEXT[result.outcome];
  const rows = [
    { k: 'MOD_A · ANPR FORENSICS', v: result.a, max: 15 },
    { k: 'MOD_B · RADAR & STROBE', v: result.b, max: 40 },
    { k: 'MOD_C · LENS SHUFFLER', v: result.c, max: 45 },
  ];
  return (
    <main className="ws3-main ws3-start">
      <section className={`ws3-panel ws3-start-card ws3-summary ws3-summary--${result.outcome}`}>
        <div className="ws3-panel-tag">SESSION REPORT // STATION_03</div>
        <h2 className="ws3-start-title">{o.title}</h2>
        <p className="ws3-start-lede">{o.sub}</p>

        <table className="ws3-table ws3-summary-table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <th>{r.k}</th>
                <td>{r.v} / {r.max}</td>
              </tr>
            ))}
            <tr className="is-total">
              <th>BASE RAW SCORE</th>
              <td>{result.base} / {MAX_BASE_SCORE}</td>
            </tr>
            <tr>
              <th>SPEED BONUS · {fmtClock(result.timeLeft)} LEFT</th>
              <td>+{result.bonus} / {CONFIG.speedBonusMax}</td>
            </tr>
            <tr className="is-total">
              <th>TOTAL</th>
              <td>{result.base + result.bonus}</td>
            </tr>
            <tr>
              <th>OPERATORS</th>
              <td>{result.p1} · {result.p2}</td>
            </tr>
          </tbody>
        </table>

        <div className="ws3-summary-actions">
          <button type="button" className="ws3-btn ws3-btn--primary" onClick={onRestart}>
            [NEW SESSION]
          </button>
          {onOpenStationChooser && (
            <button type="button" className="ws3-btn ws3-btn--ghost" onClick={onOpenStationChooser}>
              [RETURN TO LAUNCHER]
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
