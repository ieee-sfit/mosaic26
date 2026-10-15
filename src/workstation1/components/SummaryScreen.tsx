import { SCORING } from '../mockStation1Data';
import { gradeFor } from '../utils/scoring';
import { SCORING as SHARED, normalizeStation1, speedBonus } from '../../core/scoring';
import Diagnostics from '../../core/Diagnostics';
import type { EndReason, Station1Result } from '../types';
import { HudPanel, TeleChip, type Tone } from './HudPanel';

/** Expected clean-run seconds per module, used only to flag slow modules in the diagnostic. */
const PAR = { A: 120, B: 240, C: 300, D: 150 } as const;
const TIPS: Record<string, string> = {
  A: 'Two waves 180° apart cancel. Read each question slowly and rule options out.',
  B: 'Look for swelling first (pitch). Then compare the peaks: lined up = loudness, between = timing.',
  C: 'Fix one control at a time and watch the leftover line flatten.',
  D: 'Use the 4 free hops to find the jump rule, then pick the channel BEFORE the hop.',
};

const REASON: Record<EndReason, { label: string; tone: Tone; line: string }> = {
  COMPLETE: { label: 'MISSION COMPLETE', tone: 'lock', line: 'ALL THREE MODULES CLEARED' },
  TIME_EXPIRED: { label: 'MISSION FAILED', tone: 'crimson', line: 'THE CLOCK REACHED 00:00 — PARTIAL SCORE LOGGED' },
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
  const final = normalizeStation1(result); // shared scale: base 100 + frozen speed bonus 20 + Module D 20 = 0..140
  const bonus = speedBonus(result.secondsRemaining, result.endReason === 'COMPLETE', (result.total / result.maxTotal) * SHARED.baseMax);
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const aHints = result.moduleA.reduce((n, q) => n + q.hintsUsed, 0);
  const aWrong = result.moduleA.reduce((n, q) => n + q.wrongAttempts, 0);
  const bWrong = result.moduleB.reduce((n, s) => n + s.wrongAttempts, 0);
  const bHints = result.moduleB.reduce((n, s) => n + s.hintsUsed, 0);
  const cHints = result.moduleC.reduce((n, x) => n + x.hintsUsed, 0);
  const cMiss = result.moduleC.reduce((n, x) => n + x.misses, 0);
  const dLocks = result.moduleD.reduce((n, x) => n + x.locks, 0);
  const dHops = result.moduleD.reduce((n, x) => n + x.scoredHops, 0);
  const dHints = result.moduleD.reduce((n, x) => n + x.hintsUsed, 0);
  const dMiss = result.moduleD.reduce((n, x) => n + x.misses, 0);
  const bMax = SCORING.moduleB.waves * SCORING.moduleB.stepPoints.reduce((n, p) => n + p, 0);
  // a played Module D ends the story: the link is restored or lost
  const head = result.dPlayed
    ? result.dEnding === 'success'
      ? { label: 'LINK RESTORED', tone: 'lock' as Tone, line: 'MOTHERSHIP LINK RESTORED · FLEET REUNITED' }
      : { label: 'LINK LOST', tone: 'crimson' as Tone, line: 'NO REPLY FROM THE MOTHERSHIP — BONUS PARTIAL' }
    : r;

  const rows: Row[] = [
    { code: 'A', name: 'FLIGHT TELEMETRY', score: result.scoreA, max: SCORING.moduleA.questionCount * SCORING.moduleA.pointsPerQuestion, detail: `${result.moduleA.length}/${SCORING.moduleA.questionCount} SOLVED · ${aHints} HINTS`, tone: 'cyan' },
    { code: 'B', name: 'DIAGNOSE THE LEFTOVER', score: result.scoreB, max: bMax, detail: `${result.moduleB.length}/${SCORING.moduleB.waves * 3} STEPS · ${bWrong} WRONG DIAGNOSES · ${bHints} HINTS`, tone: 'plasma' },
    { code: 'C', name: 'WAVE INTERCEPTION', score: result.scoreC, max: 3 * SCORING.moduleC.pointsPerRound, detail: `${result.moduleC.filter((x) => x.destroyed).length}/3 TARGETS · ${cMiss} NO-LOCK SHOTS · ${cHints} HINTS`, tone: 'gold' },
    ...(result.dPlayed
      ? [{ code: 'D', name: 'SECRET HANDSHAKE · BONUS', score: result.scoreD, max: SCORING.moduleD.maxPoints, detail: `${dLocks}/${dHops} HOPS LOCKED · ${dMiss} MISSES · ${dHints} HINTS`, tone: 'gold' as Tone }]
      : []),
  ];

  const stats = rows.map((row) => {
    const id = row.code as 'A' | 'B' | 'C' | 'D';
    const wrong = id === 'A' ? aWrong : id === 'B' ? bWrong : id === 'C' ? cMiss : dMiss;
    const hints = id === 'A' ? aHints : id === 'B' ? bHints : id === 'C' ? cHints : dHints;
    return { id, label: `MODULE ${id}`, score: row.score, max: row.max, seconds: result.moduleSeconds[id], par: PAR[id], wrong, hints, flags: [] as string[] };
  });

  return (
    <div className="hud-grid-bg flex min-h-screen flex-col px-6 pb-10 pt-8 md:px-14">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="chamfer-tr bg-goat-gold px-3 py-1 font-hud text-[11px] font-bold tracking-[0.3em] text-goat-void" style={{ ['--c' as string]: '10px' }}>
          STATION 01 · DEBRIEF
        </span>
        <TeleChip label="OP" value={result.operator} />
        <TeleChip label="ELAPSED" value={mm(used)} />
      </div>

      <div className="mt-6 grid flex-1 items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className={`font-hud text-[clamp(40px,8vw,104px)] font-bold uppercase leading-[0.9] ${head.tone === 'lock' ? 'text-goat-lock' : head.tone === 'gold' ? 'text-goat-gold' : 'text-goat-crimson'}`}>
            {head.label}
          </h1>
          <p className="mt-2 font-tele text-xs uppercase tracking-widest text-goat-mute">&gt; {head.line}</p>
          <p className="mt-1 font-tele text-xs uppercase tracking-widest text-goat-mute">
            &gt; BASE {Math.round(result.total)}/100 · SPEED BONUS +{bonus}/{SHARED.speedBonusMax}
          </p>
          {result.dPlayed && (
            <p className="mt-1 font-tele text-xs uppercase tracking-widest text-goat-gold">&gt; SECRET HANDSHAKE +{Math.round(result.scoreD * 10) / 10} / {SHARED.bonusModuleMax}</p>
          )}

          <div className="mt-8 flex items-end gap-6">
            <div>
              <div className="font-tele text-[10px] uppercase tracking-[0.3em] text-goat-mute">TOTAL_SCORE</div>
              <div className="font-tele text-[clamp(56px,9vw,120px)] font-extrabold leading-none tabular-nums text-white" style={{ textShadow: '0 0 30px rgba(0,242,254,0.5)' }}>
                {Math.round(final.raw_score)}
                <span className="text-2xl text-goat-mute">/{SHARED.rawMax}</span>
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
          <Diagnostics stats={stats} tips={TIPS} />
        </div>
      </div>
    </div>
  );
}
