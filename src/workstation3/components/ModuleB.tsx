import { useEffect, useRef, useState } from 'react';
import {
  CONFIG,
  DISPATCH_CODES,
  FINE_TIERS,
  PROBLEMS,
  REGISTRY,
  REGISTRY_COLUMNS,
  formatPlate,
} from '../mockStation3Data';
import { shuffle, type Fx } from '../utils';
import { ActionBar, Readout } from './Hud';
import RadarUnit from './RadarUnit';

const STEPS_PER_PROBLEM = 4;
const SOLVE_MS = 700;

type Stage = 'lookup' | 'interlock' | 'fired';

export default function ModuleB({
  onScore,
  onDone,
  fx,
}: {
  onScore: (delta: number) => void;
  onDone: () => void;
  fx: Fx;
}) {
  const [deck] = useState(() => PROBLEMS.map((p) => p.steps.map((s) => shuffle(s.options))));
  const [pIdx, setPIdx] = useState(0);
  const [sIdx, setSIdx] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState<string | null>(null);
  const [verified, setVerified] = useState(0); // 0–8
  const [cells, setCells] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('lookup');
  const [flashKey, setFlashKey] = useState(0);

  const problem = PROBLEMS[pIdx];
  const step = problem.steps[sIdx];
  const options = deck[pIdx][sIdx];

  const advanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    advanceRef.current = () => {
      setSolved(null);
      setWrong([]);
      if (sIdx + 1 < STEPS_PER_PROBLEM) {
        setSIdx(sIdx + 1);
      } else if (pIdx + 1 < PROBLEMS.length) {
        setPIdx(pIdx + 1);
        setSIdx(0);
      } else {
        setStage('interlock');
      }
    };
  });

  useEffect(() => {
    if (solved === null) return;
    const t = setTimeout(() => advanceRef.current(), SOLVE_MS);
    return () => clearTimeout(t);
  }, [solved]);

  const choose = (opt: string) => {
    if (solved !== null || wrong.includes(opt) || stage !== 'lookup') return;
    if (opt === step.answer) {
      onScore(Math.max(0, CONFIG.moduleB.pointsPerStep - wrong.length * CONFIG.moduleB.wrongPenalty));
      setSolved(opt);
      setVerified((v) => v + 1);
      setCells((c) => [...c, ...step.refs.map((col) => `${problem.plate}:${col}`)]);
    } else {
      setWrong((w) => [...w, opt]);
      fx.shake();
    }
  };

  const fire = () => {
    setStage('fired');
    setFlashKey((k) => k + 1);
    fx.flash();
  };

  const status =
    stage === 'fired'
      ? 'STROBE 100% · FILTER CONSOLE UNLOCKED'
      : stage === 'interlock'
        ? 'STROBE 100% · AWAITING INTERLOCK'
        : `PROBLEM ${pIdx + 1}/2 · STEP ${sIdx + 1}/4`;

  return (
    <>
      <main className="ws3-main ws3-modB">
        {/* LEFT DATAPAD — registry matrix */}
        <section className="ws3-panel ws3-pad">
          <div className="ws3-panel-tag">DATAPAD_01 // VEHICLE REGISTRY MATRIX</div>
          <div className="ws3-table-wrap">
            <table className="ws3-table ws3-registry">
              <thead>
                <tr>
                  {REGISTRY_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGISTRY.map((row) => (
                  <tr key={row.plate} className={row.plate === problem.plate && stage === 'lookup' ? 'is-target' : ''}>
                    {REGISTRY_COLUMNS.map((c) => (
                      <td key={c.key} className={cells.includes(`${row.plate}:${c.key}`) ? 'is-verified' : ''}>
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ws3-legend">
            <span className="ws3-legend-chip is-target">CAPTURED ROW</span>
            <span className="ws3-legend-chip is-verified">VERIFIED CELL</span>
          </div>
        </section>

        {/* CENTRE — speed trap unit */}
        <section className="ws3-center" aria-label="Speed trap radar and strobe unit">
          <RadarUnit steps={verified} fired={stage === 'fired'} flashKey={flashKey} />
          <Readout label="STROBE_CHARGE" value={`${Math.round((verified / 8) * 100)}%`} tone={verified === 8 ? 'ok' : 'warn'} />
        </section>

        {/* RIGHT DATAPAD — lookup terminal */}
        <section className="ws3-panel ws3-pad">
          <div className="ws3-panel-tag">DATAPAD_02 // LOOKUP TERMINAL</div>

          {stage === 'lookup' && (
            <>
              <div className="ws3-prob-head">
                <span className="ws3-prob-id">PROBLEM {pIdx + 1}</span>
                <span>{problem.camera} · {problem.title}</span>
              </div>
              <div className="ws3-plate-badge" aria-label={`Captured plate ${formatPlate(problem.plate)}`}>
                <span>CAPTURED PLATE</span>
                <b>{formatPlate(problem.plate)}</b>
              </div>

              <ol className="ws3-steprail">
                {problem.steps.map((_, i) => (
                  <li key={i} className={i < sIdx ? 'is-done' : i === sIdx ? 'is-live' : ''}>S{i + 1}</li>
                ))}
                <li className="ws3-steprail-lock">S5 🔒</li>
              </ol>

              <p className="ws3-qtext ws3-qtext--sm" key={`${pIdx}-${sIdx}`}>{step.prompt}</p>
              <div className="ws3-options ws3-options--tight" role="group" aria-label="Lookup answers">
                {options.map((opt) => {
                  const state =
                    solved === opt ? 'is-correct' : wrong.includes(opt) ? 'is-wrong' : solved !== null ? 'is-dim' : '';
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`ws3-opt ${state}`}
                      disabled={solved !== null || wrong.includes(opt)}
                      onClick={() => choose(opt)}
                    >
                      <span className="ws3-opt-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {stage === 'interlock' && (
            <div className="ws3-interlock">
              <div className="ws3-prob-head"><span className="ws3-prob-id">STEP 5</span><span>STROBE INTERLOCK</span></div>
              <p className="ws3-qtext ws3-qtext--sm">
                Both lookups verified. Capacitors are at 100%. Fire the calibration strobe to unlock the Forensic Filter Console.
              </p>
              <button type="button" className="ws3-btn ws3-btn--primary ws3-pulse" onClick={fire}>
                [ENGAGE STROBE INTERLOCK]
              </button>
            </div>
          )}

          {stage === 'fired' && (
            <div className="ws3-interlock">
              <div className="ws3-prob-head"><span className="ws3-prob-id">STEP 5</span><span>CALIBRATION COMPLETE</span></div>
              <p className="ws3-qtext ws3-qtext--sm">Optics locked. Forensic Filter Console online.</p>
              <button type="button" className="ws3-btn ws3-btn--primary" onClick={onDone}>
                [ENTER FILTER CONSOLE ➔]
              </button>
            </div>
          )}

          <div className="ws3-reftables">
            <table className="ws3-table ws3-table--ref">
              <caption>FINE TIER · OVERSPEED KM/H</caption>
              <tbody>
                {FINE_TIERS.map((t) => (
                  <tr key={t.code}>
                    <th>{t.code}</th>
                    <td>{t.max > 900 ? `${t.min}+` : `${t.min}–${t.max}`}</td>
                    <td>{t.fine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="ws3-table ws3-table--ref">
              <caption>DISPATCH · BY FLAG</caption>
              <tbody>
                {Object.entries(DISPATCH_CODES).map(([flag, action]) => (
                  <tr key={flag}>
                    <th>{flag}</th>
                    <td colSpan={2}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_B</span>
          <span>{status}</span>
          <span>{verified}/8 VERIFIED</span>
        </div>
        <span className="ws3-bar-note">−{CONFIG.moduleB.wrongPenalty} PT PER WRONG PICK</span>
      </ActionBar>
    </>
  );
}
