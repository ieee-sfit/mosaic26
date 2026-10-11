import { useState } from 'react';
import TrackMap from './TrackMap';
import { LOOKUP_STEPS, MATRIX, MATRIX_COLUMNS, STATION2_CONFIG } from '../mockStation2Data';
import { describeStep, expectedAnswer, fmt, stepsOfProblem } from '../logic';
import type { LookupStep } from '../types';

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

  const verifiedCount = Object.keys(answers).length;
  const total = Object.values(answers).reduce((a, b) => a + b.pts, 0);
  const allVerified = verifiedCount === LOOKUP_STEPS.length;

  const prevOf = (s: LookupStep) => {
    const prev = LOOKUP_STEPS.find((x) => x.problem === s.problem && x.n === s.n - 1);
    return prev ? answers[prev.id]?.value ?? null : null;
  };

  const verify = (s: LookupStep) => {
    const exp = expectedAnswer(s, prevOf(s));
    const got = (inputs[s.id] ?? '').trim().toUpperCase();
    if (!got) return;
    if (exp && got === exp.toUpperCase()) {
      const pts = Math.max(0, STEP_PTS - (wrongs[s.id] ?? 0) * STATION2_CONFIG.stepWrongPenalty);
      const next = { ...answers, [s.id]: { value: exp, pts } };
      setAnswers(next);
      onScore(Object.values(next).reduce((a, b) => a + b.pts, 0));
      setMsg({ ...msg, [s.problem]: { kind: 'ok', text: `STEP ${s.n} VERIFIED // BEAM ${verifiedCount + 1}/8 LINKED // +${fmt(pts)} PTS` } });
    } else {
      setWrongs({ ...wrongs, [s.id]: (wrongs[s.id] ?? 0) + 1 });
      setMsg({ ...msg, [s.problem]: { kind: 'bad', text: `STEP ${s.n} MISMATCH // RE-CHECK MATRIX ROW // −${STATION2_CONFIG.stepWrongPenalty} PT` } });
      onShake();
    }
  };

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
            <thead><tr>{MATRIX_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.UNIT}>{MATRIX_COLUMNS.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
