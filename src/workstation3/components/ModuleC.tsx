import { useEffect, useRef, useState } from 'react';
import {
  CONFIG,
  FILTER_DEFS,
  ROUNDS,
  computeConfidence,
  formatPlate,
  registryRow,
  tierFor,
  type FilterKey,
  type FilterLevels,
} from '../mockStation3Data';
import type { Fx } from '../utils';
import { ActionBar, Readout } from './Hud';
import ConfidenceGauge from './ConfidenceGauge';
import Viewfinder, { ocrRead, type PursuitStatus } from './Viewfinder';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';

const OFF: FilterLevels = { ir: 0, pol: 0, fog: 0, bin: 0 };
const LEVEL_NAMES = ['OFF', 'LVL 1', 'LVL 2'];
const RESOLVE_MS = 2000;
const { roundSeconds, pips: MAX_PIPS, passConfidence } = CONFIG.moduleC;

interface ChallanEntry {
  no: string;
  plate: string;
  code: string;
  points: number;
  fine: string;
  pts: number;
}

export default function ModuleC({
  onScore,
  onDone,
  onForfeit,
  fx,
}: {
  onScore: (delta: number) => void;
  onDone: () => void;
  onForfeit: () => void;
  fx: Fx;
}) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [levels, setLevels] = useState<FilterLevels>(OFF);
  const [status, setStatus] = useState<PursuitStatus>('live');
  const [pips, setPips] = useState<number>(MAX_PIPS);
  const [roundFails, setRoundFails] = useState(0);
  const [roundTime, setRoundTime] = useState<number>(roundSeconds);
  const [log, setLog] = useState<ChallanEntry[]>([]);
  const [lastPts, setLastPts] = useState(0);
  const [reason, setReason] = useState('');
  const [hint, setHint] = useState<HintLevel>(0);

  const round = ROUNDS[roundIdx];
  const confidence = computeConfidence(round, levels);
  const ready = confidence >= passConfidence;
  const live = status === 'live';
  const roundValue = Math.max(CONFIG.moduleC.minRoundPoints, CONFIG.moduleC.pointsPerRound - roundFails * CONFIG.moduleC.failPenalty);

  const timeRef = useRef<number>(roundSeconds);
  const escapeRef = useRef<(why: string) => void>(() => {});
  const resetClock = () => {
    timeRef.current = roundSeconds;
    setRoundTime(roundSeconds);
  };

  const escape = (why: string) => {
    setPips((p) => Math.max(0, p - 1));
    setRoundFails((f) => f + 1);
    setReason(why);
    setStatus('escaped');
    fx.shake();
  };
  useEffect(() => {
    escapeRef.current = escape;
  });

  // pursuit window countdown
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setRoundTime(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(id);
        escapeRef.current('PURSUIT WINDOW EXPIRED');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status, roundIdx]);

  // resolve a caught / escaped state after the banner has shown
  const doneRef = useRef({ onDone, onForfeit });
  useEffect(() => {
    doneRef.current = { onDone, onForfeit };
  });
  useEffect(() => {
    if (status === 'live') return;
    const t = setTimeout(() => {
      if (status === 'escaped') {
        if (pips <= 0) {
          doneRef.current.onForfeit();
          return;
        }
        setLevels(OFF);
        resetClock();
        setStatus('live');
      } else if (roundIdx + 1 >= ROUNDS.length) {
        doneRef.current.onDone();
      } else {
        setRoundIdx(roundIdx + 1);
        setHint(0);
        setRoundFails(0);
        setLevels(OFF);
        resetClock();
        setStatus('live');
      }
    }, RESOLVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pips, roundIdx]);

  const step = (key: FilterKey) => {
    if (!live) return;
    setLevels((l) => ({ ...l, [key]: (l[key] + 1) % 3 }));
  };

  const issue = (pts: number) => {
    const row = registryRow(round.plate);
    const tier = tierFor(row.radar - row.limit);
    onScore(pts);
    setLastPts(pts);
    setLog((l) => [
      ...l,
      { no: `E-${String(l.length + 1).padStart(4, '0')}`, plate: round.plate, code: tier.code, points: tier.points, fine: tier.fine, pts },
    ]);
    setStatus('caught');
    fx.flash();
  };

  const lock = () => {
    if (!live) return;
    if (!ready) {
      escape(`SUBMITTED AT ${confidence.toFixed(1)}% — BELOW ${passConfidence}%`);
      return;
    }
    issue(hint === 1 ? Math.round(roundValue * (1 - CONFIG.hintPenalty[1])) : roundValue);
  };

  // Hint 1 points at the filter furthest from its sweet spot; Hint 2 sets the filters and issues the challan for 0 pts
  const worst = FILTER_DEFS.reduce((a, d) => {
    const off = d.weight * Math.abs(levels[d.key] - round.target[d.key]);
    return off > a.off ? { def: d, off } : a;
  }, { def: FILTER_DEFS[0], off: 0 });
  const requestHint = (next: 1 | 2) => {
    if (!live || hint >= next) return;
    setHint(next);
    if (next === 2) {
      setLevels(round.target);
      issue(0);
    }
  };

  const clockTone = roundTime <= 10 ? 'bad' : roundTime <= 25 ? 'warn' : undefined;
  const ocr = ocrRead(round.plate, round.ocrNoise, confidence);

  return (
    <>
      <main className="ws3-main ws3-modC">
        <section className="ws3-panel ws3-console">
          <div className="ws3-panel-tag">MOD_C // FORENSIC LENS SHUFFLER</div>
          <Viewfinder round={round} levels={levels} confidence={confidence} status={status} />

          <div className="ws3-ocr" aria-live="off">
            <span className="ws3-ocr-k">OCR_READ</span>
            <span className={`ws3-ocr-v ${ready ? 'is-ok' : ''}`}>{ocr}</span>
          </div>

          <div className="ws3-filters" role="group" aria-label="Multi-spectrum filter array">
            {FILTER_DEFS.map((def) => {
              const lvl = levels[def.key];
              return (
                <button
                  key={def.key}
                  type="button"
                  className={`ws3-filter ${lvl > 0 ? 'is-on' : ''} ${hint === 1 && worst.off > 0 && worst.def.key === def.key ? 'is-hint' : ''}`}
                  onClick={() => step(def.key)}
                  disabled={!live}
                  aria-label={`${def.label} ${LEVEL_NAMES[lvl]}`}
                >
                  <span className="ws3-filter-name">{def.label}</span>
                  <span className="ws3-filter-leds" aria-hidden="true">
                    {[1, 2].map((n) => (
                      <i key={n} className={lvl >= n ? 'is-lit' : ''} />
                    ))}
                  </span>
                  <span className="ws3-filter-level">{LEVEL_NAMES[lvl]}</span>
                  <span className="ws3-filter-mode">{def.levels[lvl]}</span>
                  <span className="ws3-filter-sig">
                    {def.signalLabel}: {def.signal[round.target[def.key]]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="ws3-side">
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">AI CONFIDENCE</div>
            <ConfidenceGauge value={confidence} threshold={passConfidence} />
            <button
              type="button"
              className={`ws3-lock ${ready ? 'is-ready' : ''}`}
              onClick={lock}
              disabled={!live}
            >
              [LOCK TELEMETRY / ISSUE CHALLAN]
            </button>
            <p className="ws3-lock-note">
              {ready ? `≥ ${passConfidence}% — CHALLAN CLEARED FOR ISSUE` : `BELOW ${passConfidence}% — LOCKING NOW LOSES THE SUSPECT`}
            </p>
          </div>

          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">RADAR PURSUIT INTEGRITY</div>
            <div className="ws3-pips" aria-label={`${pips} of ${MAX_PIPS} radar pips left`}>
              {Array.from({ length: MAX_PIPS }, (_, i) => (
                <span key={i} className={`ws3-pip ${i < pips ? 'is-live' : 'is-burned'}`} />
              ))}
            </div>
            <Readout label="PURSUIT_WINDOW" value={`${String(roundTime).padStart(2, '0')}s`} tone={clockTone} />
            <Readout label="SUSPECT" value={`${roundIdx + 1}/${ROUNDS.length}`} />
            <Readout label="ROUND_VALUE" value={`${roundValue} PTS`} />
            {status === 'escaped' && <div className="ws3-intel ws3-intel--red">▸ {reason}</div>}
            {status === 'caught' && <div className="ws3-intel ws3-intel--ok">▸ +{lastPts} PTS · NEXT TARGET INBOUND</div>}
          </div>

          <div className="ws3-panel ws3-sidebox ws3-log">
            <div className="ws3-panel-tag">CHALLAN LOG</div>
            {log.length === 0 && <p className="ws3-log-empty">NO VIOLATIONS LOGGED</p>}
            {log.map((e) => (
              <div key={e.no} className="ws3-log-row">
                <b>{e.no}</b> {formatPlate(e.plate)} · {e.code} · {e.fine} · <em>{e.points} VIOLATION PTS</em>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_C</span>
          <span>{round.label} · {round.model.toUpperCase()}</span>
          <span>PIPS {pips}/{MAX_PIPS}</span>
        </div>
        <span className="ws3-bar-note">CLICK A FILTER BLOCK TO STEP OFF → LVL 1 → LVL 2</span>
      </ActionBar>
      <HintDock
        level={hint}
        itemLabel={`SUSPECT ${roundIdx + 1}/${ROUNDS.length}`}
        hint1Text={
          worst.off > 0
            ? `${worst.def.label} is the furthest from its sweet spot. Compare its signal (${worst.def.signalLabel}) with the scene and re-set it. It is highlighted.`
            : 'Every filter matches the scene. Lock the telemetry.'
        }
        hint2Text="The filters were set and the challan issued for you. This suspect scores 0."
        cost1={CONFIG.hintPenalty[1]}
        disabled={!live}
        onHint={requestHint}
      />
    </>
  );
}
