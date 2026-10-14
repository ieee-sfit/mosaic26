import Diagnostics from '../../core/Diagnostics';
import type { ModuleStat } from '../../core/diagnose';
import { SCORING, gradeFor } from '../../core/scoring';
import { PAR, STATION2_CONFIG, TIPS } from '../mockStation2Data';

export type Outcome = 'complete' | 'timeout' | 'forfeit';

export interface Report {
  outcome: Outcome;
  a: number;
  b: number;
  c: number;
  /** Module D (final push) points, 0..20. Not part of the base or the letter grade. */
  d: number;
  /** True when the player took the bonus round. */
  dPlayed: boolean;
  /** Speed bonus, frozen when Module C ended. */
  bonus: number;
  raw: number;
  grid?: number | null;
  /** Race finishing position, null on a DNF. */
  finish?: number | null;
  diag: Record<string, { seconds: number; wrong: number; hints: number; flags: string[] }>;
}

const HEAD: Record<Outcome, { title: string; tone: string; line: string }> = {
  complete: { title: 'CHEQUERED FLAG', tone: 'ok', line: 'ALL MODULES CLEARED' },
  timeout: { title: 'CLOCK RAN OUT', tone: 'bad', line: 'TIME EXPIRED, PARTIAL SCORE LOGGED' },
  forfeit: { title: 'ENGINE SEIZED', tone: 'bad', line: 'ALL GASKETS BLOWN, PARTIAL SCORE LOGGED' },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Debrief in the same layout as Stations 1 and 4: headline, score /140, rating, one card per module, diagnostics. */
export default function EndScreen({ report, onRestart }: { report: Report; onRestart: () => void }) {
  const { outcome, a, b, c, d, dPlayed, bonus, raw, diag, grid, finish } = report;
  const base = a + b + c;
  const head = HEAD[outcome];
  const rows = [
    { id: 'A', label: 'A · TELEMETRY', score: round1(a), max: STATION2_CONFIG.moduleMax.A },
    { id: 'B', label: 'B · ROUTES', score: round1(b), max: STATION2_CONFIG.moduleMax.B },
    { id: 'C', label: 'C · RACE', score: round1(c), max: STATION2_CONFIG.moduleMax.C },
    ...(dPlayed ? [{ id: 'D', label: 'D · FINAL PUSH', score: round1(d), max: STATION2_CONFIG.moduleMax.D }] : []),
  ];
  const stats: ModuleStat[] = rows.map((r) => ({
    ...r,
    par: PAR[r.id as keyof typeof PAR],
    seconds: diag[r.id]?.seconds ?? 0,
    wrong: diag[r.id]?.wrong ?? 0,
    hints: diag[r.id]?.hints ?? 0,
    flags: diag[r.id]?.flags ?? [],
  }));

  return (
    <div className={`ws2-end ws2-in ${head.tone === 'bad' ? 'is-bad' : ''}`}>
      <div className="ws2-end__left">
        <span className="ws2-end__tag">STATION 02 · DEBRIEF</span>
        <h1 className={`ws2-end__head is-${head.tone}`}>{head.title}</h1>
        <p className="ws2-end__line">&gt; {head.line}</p>
        {grid ? <p className="ws2-end__line">&gt; GRID P{grid} · {finish ? `FINISH P${finish}` : 'DNF'}</p> : null}
        <p className="ws2-end__line">&gt; BASE {Math.round(base)}/100 · SPEED BONUS +{bonus}/{STATION2_CONFIG.speedBonusMax}</p>
        {dPlayed && <p className="ws2-end__line">&gt; FINAL PUSH +{round1(d)} / {SCORING.bonusModuleMax}</p>}
        <div className="ws2-end__score">
          <div>
            <small>TOTAL SCORE</small>
            <b>{Math.round(raw)}<span>/{SCORING.rawMax}</span></b>
          </div>
          <div className="ws2-end__grade"><small>RATING</small><b>{gradeFor(base)}</b></div>
        </div>
        <button type="button" className="ws2-btn ws2-btn--go" onClick={onRestart}>PLAY AGAIN</button>
      </div>

      <div className="ws2-end__right">
        {rows.map((r) => (
          <div key={r.id} className="ws2-end__card">
            <header><span>{r.label}</span><b>{r.score}<em>/{r.max}</em></b></header>
            <div className="ws2-end__bar" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => <i key={i} className={r.max && (i + 1) / 20 <= r.score / r.max + 0.001 ? 'on' : ''} />)}
            </div>
          </div>
        ))}
        <Diagnostics stats={stats} tips={TIPS} />
      </div>
    </div>
  );
}
