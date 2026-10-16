import { CONFIG, MAX_BASE_SCORE } from '../mockStation3Data';
import { SCORING, gradeFor } from '../../core/scoring';
import Diagnostics from '../../core/Diagnostics';
import { fmtClock } from '../utils';
import { PlateText } from './Glyph';
import { formatPlate } from '../mockStation3Data';
import './summary.css';

export type Outcome = 'complete' | 'timeout';
export type ModId = 'A' | 'B' | 'C' | 'D';
/** What the run tracked for one module: seconds on the clock while it was played, wrong tries and hints used. */
export interface ModStat {
  seconds: number;
  wrong: number;
  hints: number;
}

export interface Breakdown {
  a: number;
  b: number;
  c: number;
  d: number;
  dPlayed: boolean;
  dSuccess: boolean;
  base: number;
  bonus: number;
  timeLeft: number;
  outcome: Outcome;
  p1: string;
  p2: string;
  stats: Record<ModId, ModStat>;
}

/** Expected clean-run seconds per module, used only to flag slow modules in the diagnostic. */
const PAR: Record<ModId, number> = { A: 120, B: 240, C: 300, D: 150 };
const TIPS: Record<string, string> = {
  A: 'Rule out options, then check the 0 versus O trap.',
  B: 'Use the slot type first, then the clues.',
  C: 'Match each reading to its nearest band; the small filter can decide it.',
  D: 'Follow each car camera by camera, then match the complaint.',
};
const mmss = (s: number) => fmtClock(s);

export default function SummaryScreen({ result, twins, onRestart }: { result: Breakdown; /** The two rebuilt plates, shown when the run got past Module C. */ twins?: [string, string]; onRestart: () => void }) {
  const fail = result.outcome === 'timeout';
  const grade = gradeFor(result.base);
  const total = result.base + result.bonus + result.d;
  const used = (Object.values(result.stats) as ModStat[]).reduce((n, s) => n + s.seconds, 0);
  const head = fail
    ? { label: 'MISSION FAILED', tone: 'fail', line: 'THE LANE IS LOST · THE CLOCK REACHED 00:00 · PARTIAL SCORE LOGGED' }
    : result.dPlayed && !result.dSuccess
      ? { label: 'MISSION COMPLETE', tone: 'ok', line: 'ALL PLATES LOCKED · THE OFFENDER SLIPPED THROUGH THE BLOCKADE' }
      : { label: 'MISSION COMPLETE', tone: 'ok', line: result.dPlayed ? 'ALL PLATES LOCKED · OFFENDER STOPPED AT THE EXIT' : 'ALL PLATES LOCKED · THE LANE IS CLEAR' };

  const rows: { id: ModId; name: string; score: number; max: number; detail: string }[] = [
    { id: 'A', name: 'ANPR FORENSICS', score: result.a, max: 15, detail: `${result.stats.A.wrong} WRONG PICKS · ${result.stats.A.hints} HINTS` },
    { id: 'B', name: 'PLATE REBUILD', score: result.b, max: 40, detail: `${result.stats.B.wrong} FAILED CHECKS · ${result.stats.B.hints} HINTS` },
    { id: 'C', name: 'LENS SHUFFLER', score: result.c, max: 45, detail: `${result.stats.C.wrong} NO-LOCKS · ${result.stats.C.hints} HINTS` },
    ...(result.dPlayed
      ? [{ id: 'D' as const, name: 'BLOCKADE · BONUS', score: result.d, max: CONFIG.moduleD.max, detail: `${result.stats.D.wrong} WRONG TRIES · ${result.stats.D.hints} HINTS` }]
      : []),
  ];
  const stats = rows.map((r) => ({
    id: r.id,
    label: `MODULE ${r.id}`,
    score: r.score,
    max: r.max,
    seconds: result.stats[r.id].seconds,
    par: PAR[r.id],
    wrong: result.stats[r.id].wrong,
    hints: result.stats[r.id].hints,
    flags: [] as string[],
  }));

  return (
    <main className="ws3-main ws3-sum">
      <section className="ws3-sum-left">
        <div className="ws3-sum-chips">
          <span className="ws3-sum-chip ws3-sum-chip--y">STATION 03 · DEBRIEF</span>
          <span className="ws3-sum-chip">OP1 {result.p1 || '------'}</span>
          <span className="ws3-sum-chip">OP2 {result.p2 || '------'}</span>
          <span className="ws3-sum-chip">ELAPSED {mmss(used)}</span>
          <span className="ws3-sum-chip ws3-sum-chip--y">REMAINING {mmss(result.timeLeft)} ({result.timeLeft}s)</span>
        </div>
        <h2 className={`ws3-sum-head ws3-sum-head--${head.tone}`}>{head.label}</h2>
        <p className="ws3-sum-line">&gt; {head.line}</p>
        <p className="ws3-sum-line ws3-sum-line--y">&gt; TIME REMAINING: {mmss(result.timeLeft)} ({result.timeLeft}s)</p>
        <p className="ws3-sum-line">&gt; BASE {result.base}/{MAX_BASE_SCORE} · SPEED BONUS +{result.bonus}/{SCORING.speedBonusMax}</p>
        {result.dPlayed && <p className="ws3-sum-line ws3-sum-line--y">&gt; BLOCKADE +{result.d} / {SCORING.bonusModuleMax}</p>}

        {twins && (
          <div className="ws3-sum-plates" aria-label="Rebuilt twin plates">
            {twins.map((pl, i) => (
              <span key={pl} className={`ws3-sum-plate ws3-sum-plate--${i + 1}`}>
                <small>TWIN {i + 1}</small>
                <PlateText text={formatPlate(pl)} />
              </span>
            ))}
          </div>
        )}

        <div className="ws3-sum-score">
          <div>
            <div className="ws3-sum-k">TOTAL_SCORE</div>
            <div className="ws3-sum-total">
              {total}
              <span>/{SCORING.rawMax}</span>
            </div>
          </div>
          <div style={{ padding: '8px 16px', background: 'rgba(255, 184, 0, 0.1)', border: '1px solid rgba(255, 184, 0, 0.35)', borderRadius: '4px' }}>
            <div className="ws3-sum-k" style={{ color: '#ffb800' }}>TIME REMAINING</div>
            <div className="ws3-sum-total" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
              {mmss(result.timeLeft)}
              <span style={{ fontSize: '18px', color: '#ffb800', marginLeft: '6px' }}>({result.timeLeft}s)</span>
            </div>
          </div>
          <div className="ws3-sum-grade" aria-label={`Rating ${grade}`}>
            <small>RATING</small>
            <b>{grade}</b>
          </div>
        </div>

        <button type="button" className="ws3-btn ws3-btn--primary ws3-btn--big" onClick={onRestart}>
          [ RETURN TO LAUNCHER ]
        </button>
      </section>

      <section className="ws3-sum-right">
        {rows.map((r) => (
          <div key={r.id} className="ws3-panel ws3-sum-card">
            <div className="ws3-sum-card-top">
              <span>MODULE {r.id} · {r.name}</span>
              <span className="ws3-sum-detail">{r.detail}</span>
            </div>
            <div className="ws3-sum-card-pts">
              <b>{r.score}</b>
              <span>/ {r.max} PTS</span>
            </div>
            <div className="ws3-sum-bar" aria-hidden="true">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} className={r.max && (i + 1) / 20 <= r.score / r.max + 0.001 ? 'is-on' : ''} />
              ))}
            </div>
          </div>
        ))}
        <Diagnostics stats={stats} tips={TIPS} />
      </section>
    </main>
  );
}
