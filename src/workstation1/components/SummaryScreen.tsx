import { SCORING } from '../mockStation1Data';
import { gradeFor } from '../utils/scoring';
import type { EndReason, Station1Result } from '../types';
import { HudPanel, TeleChip, type Tone } from './HudPanel';

const REASON: Record<EndReason, { label: string; tone: Tone; line: string }> = {
  COMPLETE: { label: 'MISSION COMPLETE', tone: 'lock', line: 'ALL THREE MODULES CLEARED' },
  TIME_EXPIRED: { label: 'CLOCK EXPIRED', tone: 'gold', line: 'MISSION TIMER REACHED 00:00 — PARTIAL SCORE LOGGED' },
  HULL_BREACH: { label: 'HULL BREACH', tone: 'crimson', line: 'ARMOUR EXHAUSTED IN MODULE C — PARTIAL SCORE LOGGED' },
};

interface Row {
  code: string;
  name: string;
  score: number;
  max: number;
  detail: string;
  tone: Tone;
}

export function SummaryScreen({ result, onRestart }: { result: Station1Result; onRestart: () => void }) {
  const r = REASON[result.endReason];
  const grade = gradeFor(result.total, result.maxTotal);
  const used = SCORING.totalSeconds - result.secondsRemaining;
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const aHints = result.moduleA.reduce((n, q) => n + q.hintsUsed, 0);
  const bWrong = result.moduleB.reduce((n, s) => n + s.wrongAttempts, 0);
  const cMiss = result.moduleC.reduce((n, x) => n + x.misses, 0);

  const rows: Row[] = [
    { code: 'A', name: 'FLIGHT TELEMETRY', score: result.scoreA, max: SCORING.moduleA.questionCount * SCORING.moduleA.pointsPerQuestion, detail: `${result.moduleA.length}/${SCORING.moduleA.questionCount} SOLVED · ${aHints} HINTS`, tone: 'cyan' },
    { code: 'B', name: 'TOKAMAK DIAGNOSTIC', score: result.scoreB, max: 8 * SCORING.moduleB.pointsPerStep, detail: `${result.moduleB.length}/8 STEPS · ${bWrong} MISMATCHES`, tone: 'plasma' },
    { code: 'C', name: 'WAVE INTERCEPTION', score: result.scoreC, max: 3 * SCORING.moduleC.pointsPerRound, detail: `${result.moduleC.filter((x) => x.destroyed).length}/3 TARGETS · ${cMiss} MISSES · HULL ${Math.round((result.hullPips / SCORING.moduleC.hullPips) * 100)}%`, tone: 'gold' },
  ];

  return (
    <div className="hud-grid-bg flex min-h-screen flex-col px-6 pb-10 pt-8 md:px-14">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="chamfer-tr bg-goat-gold px-3 py-1 font-hud text-[11px] font-bold tracking-[0.3em] text-goat-void" style={{ ['--c' as string]: '10px' }}>
          STATION 01 · DEBRIEF
        </span>
        <TeleChip label="OP1" value={result.operators[0]} />
        <TeleChip label="OP2" value={result.operators[1]} />
        <TeleChip label="ELAPSED" value={mm(used)} />
      </div>

      <div className="mt-6 grid flex-1 items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className={`font-hud text-[clamp(40px,8vw,104px)] font-bold uppercase leading-[0.9] ${r.tone === 'lock' ? 'text-goat-lock' : r.tone === 'gold' ? 'text-goat-gold' : 'text-goat-crimson'}`}>
            {r.label}
          </h1>
          <p className="mt-2 font-tele text-xs uppercase tracking-widest text-goat-mute">&gt; {r.line}</p>

          <div className="mt-8 flex items-end gap-6">
            <div>
              <div className="font-tele text-[10px] uppercase tracking-[0.3em] text-goat-mute">TOTAL_SCORE</div>
              <div className="font-tele text-[clamp(56px,9vw,120px)] font-extrabold leading-none tabular-nums text-white" style={{ textShadow: '0 0 30px rgba(0,242,254,0.5)' }}>
                {result.total}
                <span className="text-2xl text-goat-mute">/{result.maxTotal}</span>
              </div>
            </div>
            <div className="chamfer flex h-28 w-28 shrink-0 flex-col items-center justify-center bg-goat-cyan text-goat-void" style={{ ['--c' as string]: '20px' }}>
              <span className="font-tele text-[9px] font-bold uppercase tracking-widest">RATING</span>
              <span className="font-hud text-6xl font-bold leading-none">{grade}</span>
            </div>
          </div>

          <button type="button" onClick={onRestart} className="tac-btn mt-10 bg-goat-gold px-8 py-3.5 text-sm font-bold text-goat-void">
            [ REDEPLOY STATION ▸ ]
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <HudPanel key={row.code} title={`MODULE ${row.code} · ${row.name}`} tag={row.detail} tone={row.tone} cut="both" bodyClassName="p-3">
              <div className="flex items-baseline justify-between font-tele">
                <span className="text-3xl font-bold tabular-nums text-white">{row.score}</span>
                <span className="text-xs text-goat-mute">/ {row.max} PTS</span>
              </div>
              <div className="mt-2 flex h-2 gap-px" aria-hidden>
                {Array.from({ length: 20 }, (_, i) => (
                  <span key={i} className="flex-1" style={{ background: row.max && (i + 1) / 20 <= row.score / row.max + 0.001 ? '#00f2fe' : '#16202e' }} />
                ))}
              </div>
            </HudPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
