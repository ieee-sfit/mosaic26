import { useState } from 'react';
import TrackMap from './TrackMap';
import { LOOKUP_STEPS, MATRIX, MATRIX_COLUMNS, STATION2_CONFIG } from '../mockStation2Data';
import { describeStep, expectedAnswer, fmt, stepsOfProblem } from '../logic';
import type { LookupStep } from '../types';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';

interface Props {
  onScore: (total: number) => void;
  onDone: () => void;
  onShake: () => void;
}

const STEP_PTS = STATION2_CONFIG.moduleMax.B / LOOKUP_STEPS.length;

export default function ModuleB({ onScore, onDone, onShake }: Props) {
  const [answers, setAnswers] = useState<Record<string, { value: string; pts: number }>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [wrongs, setWrongs] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<Record<number, { kind: 'ok' | 'bad'; text: string } | undefined>>({});
  const [interlocked, setInterlocked] = useState(false);
  const [stepHints, setStepHints] = useState<Record<string, HintLevel>>({});
  const [focusId, setFocusId] = useState<string | null>(null);

  const verifiedCount = Object.keys(answers).length;
  const total = Object.values(answers).reduce((a, b) => a + b.pts, 0);
  const allVerified = verifiedCount === LOOKUP_STEPS.length;

  const prevOf = (s: LookupStep) => {
    const prev = LOOKUP_STEPS.find((x) => x.problem === s.problem && x.n === s.n - 1);
    return prev ? answers[prev.id]?.value ?? null : null;
  };

  const isOpen = (s: LookupStep) =>
    !answers[s.id] && (s.n === 1 || LOOKUP_STEPS.some((x) => x.problem === s.problem && x.n === s.n - 1 && answers[x.id]));
  const openSteps = LOOKUP_STEPS.filter(isOpen);
  const dockStep = openSteps.find((s) => s.id === focusId) ?? openSteps[0] ?? null;
  const dockLevel: HintLevel = dockStep ? stepHints[dockStep.id] ?? 0 : 0;

  const stepPoints = (s: LookupStep, hint: HintLevel) => {
    if (hint >= 2) return 0;
    const base = Math.max(0, STEP_PTS - (wrongs[s.id] ?? 0) * STATION2_CONFIG.stepWrongPenalty);
    return hint === 1 ? Math.round(base * (1 - STATION2_CONFIG.hintPenalty.hint1) * 100) / 100 : base;
  };

  const complete = (s: LookupStep, value: string, pts: number, hint: HintLevel) => {
    const next = { ...answers, [s.id]: { value, pts } };
    setAnswers(next);
    onScore(Object.values(next).reduce((a, b) => a + b.pts, 0));
    setMsg({
      ...msg,
      [s.problem]: {
        kind: 'ok',
        text: `STEP ${s.n} ${hint >= 2 ? 'AUTO-SUBMITTED' : 'VERIFIED'} // BEAM ${verifiedCount + 1}/8 LINKED // +${fmt(pts)} PTS`,
      },
    });
  };

  const requestHint = (next: 1 | 2) => {
    if (!dockStep) return;
    setStepHints({ ...stepHints, [dockStep.id]: next });
    if (next === 2) {
      const exp = expectedAnswer(dockStep, prevOf(dockStep));
      if (exp) complete(dockStep, exp, 0, 2);
    }
  };

  const verify = (s: LookupStep) => {
    const exp = expectedAnswer(s, prevOf(s));
    const got = (inputs[s.id] ?? '').trim().toUpperCase();
    if (!got) return;
    if (exp && got === exp.toUpperCase()) {
      const pts = stepPoints(s, stepHints[s.id] ?? 0);
      complete(s, exp, pts, stepHints[s.id] ?? 0);
    } else {
      setWrongs({ ...wrongs, [s.id]: (wrongs[s.id] ?? 0) + 1 });
      setMsg({ ...msg, [s.problem]: { kind: 'bad', text: `STEP ${s.n} MISMATCH // RE-CHECK MATRIX ROW // −${STATION2_CONFIG.stepWrongPenalty} PT` } });
      onShake();
    }
  };

  const hintCols = new Set<string>(dockStep && dockLevel >= 1 ? [String(dockStep.find.column), String(dockStep.read)] : []);

  const pad = (p: 1 | 2) => {
    const steps = stepsOfProblem(p);
    const done = steps.filter((s) => answers[s.id]).length;
    const active = steps.find((s) => !answers[s.id]);
    const m = msg[p];
    return (
      <div className={`ws2-pad ws2-chamfer ${p === 1 ? 'ws2-pad-amber' : 'ws2-pad-red'}`}>
        <div className="ws2-pad-head">
          <b>PROBLEM {p}</b><span>{done}/4 STEPS</span>
        </div>
        <ol className="ws2-steps">
          {steps.map((s) => {
            const a = answers[s.id];
            const isActive = active?.id === s.id;
            return (
              <li key={s.id} className={a ? 'is-done' : isActive ? 'is-active' : 'is-locked'}>
                <div className="ws2-step-top">
                  <span className="ws2-step-n">STEP {s.n}</span>
                  {a && <span className="ws2-step-ans">✓ {a.value}</span>}
                  {!a && !isActive && <span className="ws2-dim">LOCKED</span>}
                </div>
                {(a || isActive) && (
                  <>
                    <div className="ws2-step-brief">{s.brief}</div>
                    <div className="ws2-step-find">{describeStep(s, prevOf(s))}</div>
                  </>
                )}
                {isActive && (
                  <form className="ws2-step-form" onSubmit={(e) => { e.preventDefault(); verify(s); }}>
                    <input aria-label={`Problem ${p} step ${s.n} answer`} className="ws2-input" autoComplete="off" spellCheck={false}
                      value={inputs[s.id] ?? ''} placeholder="ENTER VALUE"
                      onFocus={() => setFocusId(s.id)}
                      onChange={(e) => setInputs({ ...inputs, [s.id]: e.target.value })} />
                    <button type="submit" className="ws2-btn ws2-btn-amber" disabled={!(inputs[s.id] ?? '').trim()}>[VERIFY]</button>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
        {m && <div className={`ws2-flash ws2-flash-${m.kind}`} role="status">{m.text}</div>}
      </div>
    );
  };

  return (
    <section className="ws2-mod ws2-mod-b" aria-label="Module B Le Mans Track Relay Beacon Tower">
      <div className="ws2-mod-head">
        <span className="ws2-tag">MODULE B</span>
        <h2>LE MANS TRACK RELAY BEACON TOWER</h2>
        <span className="ws2-mod-pts">{fmt(total, 2)} / {STATION2_CONFIG.moduleMax.B} PTS</span>
      </div>

      <div className="ws2-b-grid">
        {pad(1)}
        <div className="ws2-b-center ws2-chamfer">
          <TrackMap verified={verifiedCount} interlocked={interlocked} />
          <div className="ws2-b-interlock">
            <span className="ws2-step-n">STEP 5 // INTERLOCK</span>
            {!interlocked ? (
              <button type="button" className="ws2-btn ws2-btn-red" disabled={!allVerified}
                onClick={() => setInterlocked(true)}>
                [ENGAGE TELEMETRY LOOP]
              </button>
            ) : (
              <button type="button" className="ws2-btn ws2-btn-blue" onClick={onDone}>[OPEN PIT WALL BALANCER ▸]</button>
            )}
            <span className="ws2-dim">{interlocked ? 'ALL BEACONS 100% — LOOP STABLE' : allVerified ? 'ALL 8 STEPS VERIFIED — ENGAGE' : `${verifiedCount}/8 STEPS VERIFIED`}</span>
          </div>
        </div>
        {pad(2)}
      </div>

      <div className="ws2-matrix ws2-chamfer">
        <div className="ws2-matrix-head">RACE ENGINEERING MATRIX // 8 COLUMNS</div>
        <div className="ws2-matrix-scroll">
          <table>
            <thead><tr>{MATRIX_COLUMNS.map((c) => <th key={c} className={hintCols.has(c) ? 'is-hint' : ''}>{c}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.UNIT}>{MATRIX_COLUMNS.map((c) => <td key={c} className={hintCols.has(c) ? 'is-hint' : ''}>{String(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {dockStep && (
        <HintDock
          level={dockLevel}
          itemLabel={`PROBLEM ${dockStep.problem} · STEP ${dockStep.n}`}
          hint1Text={`Use cheat-sheet matrix columns ${dockStep.find.column} (to find the row) and ${dockStep.read} (to read the answer). They are highlighted in the table.`}
          hint2Text={`The value was entered for you. Step ${dockStep.n} scores 0.`}
          cost1={STATION2_CONFIG.hintPenalty.hint1}
          onHint={requestHint}
        />
      )}
    </section>
  );
}
