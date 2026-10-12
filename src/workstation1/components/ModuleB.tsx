import { useMemo, useState } from 'react';
import { LOOKUP_PROBLEMS, SCORING, TELEMETRY_SHEET } from '../mockStation1Data';
import { useShake } from '../hooks/useScreenShake';
import { normalizeAnswer, resolveProblem } from '../utils/lookup';
import { scoreStep } from '../utils/scoring';
import type { StepResult } from '../types';
import { Datapad } from './Datapad';
import HintDock from '../../core/HintDock';
import { HudPanel, TeleChip } from './HudPanel';
import { ModuleHeader } from './ModuleHeader';
import { TokamakReactor } from './TokamakReactor';

interface Props {
  operators: [string, string];
  onRecord: (r: StepResult) => void;
  onComplete: () => void;
}

const STEPS_PER_PROBLEM = 4;

export function ModuleB({ operators, onRecord, onComplete }: Props) {
  const shake = useShake();
  const [done, setDone] = useState<[number, number]>([0, 0]);
  const [wrong, setWrong] = useState<number[][]>(() => LOOKUP_PROBLEMS.map(() => Array(STEPS_PER_PROBLEM).fill(0)));
  const [hints, setHints] = useState<(0 | 1 | 2)[][]>(() => LOOKUP_PROBLEMS.map(() => Array(STEPS_PER_PROBLEM).fill(0)));
  const [flash, setFlash] = useState<{ kind: 'bad' | 'ok'; n: number } | null>(null);

  const answers = useMemo(() => LOOKUP_PROBLEMS.map((p) => resolveProblem(TELEMETRY_SHEET, p)), []);

  const totalSteps = STEPS_PER_PROBLEM * LOOKUP_PROBLEMS.length;
  const stepsDone = done[0] + done[1];
  const ignited = stepsDone === totalSteps;
  const pct = Math.round((stepsDone / totalSteps) * 100);

  const submit = (p: number, step: number, value: string, hintLevel: 0 | 1 | 2 = hints[p][step]): boolean => {
    if (normalizeAnswer(value) === normalizeAnswer(answers[p][step])) {
      const attempts = wrong[p][step];
      onRecord({
        problemId: LOOKUP_PROBLEMS[p].id,
        stepIndex: step,
        wrongAttempts: attempts,
        hintsUsed: hintLevel,
        points: scoreStep(SCORING.moduleB, attempts, hintLevel),
        maxPoints: SCORING.moduleB.pointsPerStep,
      });
      setDone((d) => (p === 0 ? [d[0] + 1, d[1]] : [d[0], d[1] + 1]));
      setFlash((f) => ({ kind: 'ok', n: (f?.n ?? 0) + 1 }));
      return true;
    }
    setWrong((w) => w.map((row, i) => (i === p ? row.map((n, s) => (s === step ? n + 1 : n)) : row)));
    setFlash((f) => ({ kind: 'bad', n: (f?.n ?? 0) + 1 }));
    shake('light');
    return false;
  };

  // The shared hint dock targets the pad the player last focused, falling back to the first unfinished one.
  const [focusP, setFocusP] = useState<0 | 1>(0);
  const dockP: 0 | 1 = done[focusP] < STEPS_PER_PROBLEM ? focusP : done[0] < STEPS_PER_PROBLEM ? 0 : 1;
  const dockStep = done[dockP];
  const dockActive = !ignited && dockStep < STEPS_PER_PROBLEM;
  const dockLevel = dockActive ? hints[dockP][dockStep] : 0;
  const stepDef = LOOKUP_PROBLEMS[dockP].steps[Math.min(dockStep, STEPS_PER_PROBLEM - 1)];
  const readCol = TELEMETRY_SHEET.columns.find((c) => c.index === stepDef.readColumn)?.label ?? `COL_${stepDef.readColumn}`;

  /** Hint 1 points at the sheet column; Hint 2 submits the answer for the player (step scores 0). */
  const requestHint = (next: 1 | 2) => {
    if (!dockActive || dockLevel >= next) return;
    setHints((h) => h.map((row, i) => (i === dockP ? row.map((v, s) => (s === dockStep ? next : v)) : row)));
    if (next === 2) submit(dockP, dockStep, answers[dockP][dockStep], 2);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ModuleHeader code="MODULE B" title="Tokamak Plasma Diagnostic" tag="CONFINEMENT_FIELD" operators={operators} steps={3} active={1} />
      {flash && <div key={`${flash.kind}${flash.n}`} className={flash.kind === 'bad' ? 'hull-flash' : 'ok-flash'} />}

      <div className="grid flex-1 items-stretch gap-3 p-3 pb-24 lg:grid-cols-[minmax(300px,1fr)_minmax(340px,1.15fr)_minmax(300px,1fr)]">
        <Datapad problem={LOOKUP_PROBLEMS[0]} columns={TELEMETRY_SHEET.columns} answers={answers[0]} done={done[0]} wrong={wrong[0]} onActivate={() => setFocusP(0)} accent="cyan" onSubmit={(s, v) => submit(0, s, v)} />

        <HudPanel
          title="Reactor Core"
          tag={`FLUX_TOL: ±0.06 · ITER_ZONE: TOK-MK${ignited ? '9' : '0'}`}
          tone={ignited ? 'plasma' : 'cyan'}
          className="order-first lg:order-none"
          bodyClassName="flex flex-col items-center justify-between gap-2 p-3"
        >
          <div className="hud-grid-bg absolute inset-0 opacity-60" aria-hidden />
          <div className="relative flex w-full flex-1 items-center">
            <TokamakReactor stepsDone={stepsDone} totalSteps={totalSteps} />
          </div>
          <div className="relative w-full">
            <div className="mb-1 flex justify-between font-tele text-[10px] uppercase tracking-widest">
              <span className="text-goat-mute">SOLENOID_CHARGE</span>
              <span className={ignited ? 'font-bold text-goat-plasma' : 'text-goat-cyan'}>{pct}%</span>
            </div>
            <div className="flex h-2.5 gap-px" aria-hidden>
              {Array.from({ length: totalSteps }, (_, i) => (
                <span key={i} className={`flex-1 ${i < stepsDone ? (ignited ? 'bg-goat-plasma' : 'bg-goat-cyan') : 'bg-goat-mute/25'}`} />
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <TeleChip label="P1" value={`${done[0]}/${STEPS_PER_PROBLEM}`} tone={done[0] === STEPS_PER_PROBLEM ? 'lock' : 'cyan'} />
              <TeleChip label="STEP_5" value={ignited ? 'IGNITION' : 'STANDBY'} tone={ignited ? 'plasma' : 'mute'} />
              <TeleChip label="P2" value={`${done[1]}/${STEPS_PER_PROBLEM}`} tone={done[1] === STEPS_PER_PROBLEM ? 'lock' : 'gold'} />
            </div>
          </div>
        </HudPanel>

        <Datapad problem={LOOKUP_PROBLEMS[1]} columns={TELEMETRY_SHEET.columns} answers={answers[1]} done={done[1]} wrong={wrong[1]} onActivate={() => setFocusP(1)} accent="gold" onSubmit={(s, v) => submit(1, s, v)} />
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex items-center gap-3 px-3 py-2.5 lg:pr-[380px]">
          <span className={`font-tele text-[11px] uppercase tracking-widest ${ignited ? 'goat-blink text-goat-plasma' : 'text-goat-mute'}`}>
            {ignited ? '● PLASMA STABLE — MODULE C UNLOCKED' : `◌ RESOLVE BOTH ISSUES TO IGNITE (${stepsDone}/${totalSteps})`}
          </span>
          <button
            type="button"
            onClick={onComplete}
            disabled={!ignited}
            className={`tac-btn ml-auto px-6 py-3 text-xs font-bold ${ignited ? 'bg-goat-plasma text-white' : 'bg-goat-mute/20 text-goat-mute'}`}
          >
            {ignited ? '[ PROCEED ▸ MODULE C ]' : '[ MODULE C LOCKED ]'}
          </button>
        </div>
      </footer>
      {dockActive && (
        <HintDock
          level={dockLevel}
          itemLabel={`${LOOKUP_PROBLEMS[dockP].id} · STEP ${dockStep + 1}/${STEPS_PER_PROBLEM}`}
          hint1Text={`The answer is in cheat-sheet column ${stepDef.readColumn}: ${readCol}.`}
          hint2Text="The answer was submitted for you. This step scores 0."
          cost1={SCORING.moduleB.hint1Penalty}
          onHint={requestHint}
        />
      )}
    </div>
  );
}
