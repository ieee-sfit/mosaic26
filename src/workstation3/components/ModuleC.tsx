import { useEffect, useRef, useState } from 'react';
import { CONFIG, formatPlate, registryRow, tierFor, type CaseFile } from '../mockStation3Data';
import {
  FILTER_DEFS,
  FILTER_KEYS,
  POSITIONS,
  computeConfidence,
  costOf,
  fmtEdge,
  fmtReading,
  lensFor,
  scaleFraction,
  type FilterDef,
  type FilterKey,
  type FilterLevels,
} from '../lens';
import type { Fx } from '../utils';
import { ActionBar, Readout } from './Hud';
import ConfidenceGauge from './ConfidenceGauge';
import Viewfinder, { ocrRead, type LockStatus } from './Viewfinder';
import { PlateText } from './Glyph';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import './moduleC.css';

const OFF: FilterLevels = { ir: 0, pol: 0, fog: 0, bin: 0 };
const RESOLVE_MS = 2000;
const NOLOCK_MS = 1800;
const { passConfidence, failCost, pointsPerRound } = CONFIG.moduleC;
const failPts = Math.round(failCost * pointsPerRound);

interface ChallanEntry {
  no: string;
  plate: string;
  code: string;
  points: number;
  fine: string;
  pts: number;
}

/** One filter: a numeric reading next to a four-band scale, and four positions to pick from. */
function FilterCard({
  def,
  reading,
  level,
  live,
  hinted,
  onPick,
}: {
  def: FilterDef;
  reading: number;
  level: number;
  live: boolean;
  hinted: boolean;
  onPick: (pos: number) => void;
}) {
  const x = scaleFraction(def, reading) * 100;
  return (
    <div className={`ws3-filter ${level > 0 ? 'is-on' : ''} ${hinted ? 'is-hint' : ''}`}>
      <div className="ws3-filter-top">
        <span className="ws3-filter-name">{def.label}</span>
        {def.fine && <span className="ws3-filter-tag">FINE-TUNE</span>}
      </div>
      <div className="ws3-filter-read" aria-label={`${def.reading} reading ${fmtReading(def, reading)}`}>
        <span className="ws3-filter-rk">{def.reading}</span>
        <b>{reading.toFixed(def.decimals)}</b>
        {def.unit && <small>{def.unit}</small>}
      </div>
      <div className="ws3-scale" aria-hidden="true">
        <div className="ws3-scale-bar">
          {POSITIONS.map((p, i) => (
            <span key={p} className={i === level ? 'is-set' : ''}>{p}</span>
          ))}
          <i className="ws3-scale-mark" style={{ left: `${x}%` }} />
        </div>
        <div className="ws3-scale-edges">
          <em style={{ left: '25%' }}>{fmtEdge(def, def.scale[1])}</em>
          <em style={{ left: '50%' }}>{fmtEdge(def, def.scale[2])}</em>
          <em style={{ left: '75%' }}>{fmtEdge(def, def.scale[3])}</em>
        </div>
      </div>
      <div className="ws3-pos" role="group" aria-label={`${def.label} position`}>
        {POSITIONS.map((p, i) => (
          <button key={p} type="button" className={`ws3-pos-btn ${i === level ? 'is-set' : ''}`} onClick={() => onPick(i)} disabled={!live} aria-pressed={i === level}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ModuleC({
  cas,
  seed,
  onScore,
  onDone,
  fx,
  onStat,
}: {
  cas: CaseFile;
  seed: number;
  onScore: (delta: number) => void;
  onDone: () => void;
  fx: Fx;
  /** Reports a failed lock or a hint for the end-of-run diagnostic. */
  onStat: (kind: 'wrong' | 'hint') => void;
}) {
  const ROUNDS = cas.rounds;
  const [roundIdx, setRoundIdx] = useState(0);
  const [levels, setLevels] = useState<FilterLevels>(OFF);
  const [status, setStatus] = useState<LockStatus>('live');
  const [roundFails, setRoundFails] = useState(0);
  const [log, setLog] = useState<ChallanEntry[]>([]);
  const [lastPts, setLastPts] = useState(0);
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [noLock, setNoLock] = useState(0);
  const [hint, setHint] = useState<HintLevel>(0);

  const round = ROUNDS[roundIdx];
  const lens = lensFor(roundIdx, seed);
  const confidence = computeConfidence(lens, levels);
  const ready = confidence >= passConfidence;
  const live = status === 'live';
  const hintCut = hint === 1 ? 1 - CONFIG.hintPenalty[1] : 1;
  const roundValue = Math.max(0, Math.round(pointsPerRound * hintCut) - roundFails * failPts);

  // resolve a caught state after the banner has shown
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    if (status !== 'caught') return undefined;
    const t = setTimeout(() => {
      if (roundIdx + 1 >= ROUNDS.length) {
        doneRef.current();
      } else {
        setRoundIdx(roundIdx + 1);
        setHint(0);
        setRoundFails(0);
        setLevels(OFF);
        setLockMsg(null);
        setStatus('live');
      }
    }, RESOLVE_MS);
    return () => clearTimeout(t);
  }, [status, roundIdx, ROUNDS.length]);

  // the NO LOCK banner shows briefly
  useEffect(() => {
    if (!noLock) return undefined;
    const t = setTimeout(() => setNoLock(0), NOLOCK_MS);
    return () => clearTimeout(t);
  }, [noLock]);

  const pick = (key: FilterKey, pos: number) => {
    if (!live) return;
    setLevels((l) => ({ ...l, [key]: pos }));
  };

  const issue = (pts: number) => {
    const row = registryRow(cas, round.plate);
    const tier = tierFor(row.radar - row.limit);
    onScore(pts);
    setLastPts(pts);
    setLog((l) => [
      ...l,
      { no: `E-${String(l.length + 1).padStart(4, '0')}`, plate: round.plate, code: tier.code, points: tier.points, fine: tier.fine, pts },
    ]);
    setLockMsg(null);
    setStatus('caught');
    fx.flash();
  };

  const lock = () => {
    if (!live) return;
    if (!ready) {
      // NO LOCK: costs 20% of this suspect's points, and the player keeps trying
      setRoundFails((f) => f + 1);
      setLockMsg(`NO LOCK · ${confidence.toFixed(1)}% - need ${passConfidence}% · −${failPts} PTS`);
      setNoLock(Date.now());
      onStat('wrong');
      fx.shake();
      return;
    }
    issue(roundValue);
  };

  // Hint 1 marks the filter that costs the most right now; Hint 2 sets the best combination and issues the challan for 0 pts
  const worst = FILTER_KEYS.reduce(
    (a, k) => {
      const c = costOf(lens, k, levels[k]);
      return c > a.cost ? { key: k, cost: c } : a;
    },
    { key: FILTER_KEYS[0], cost: 0 },
  );
  const worstDef = FILTER_DEFS.find((d) => d.key === worst.key) as FilterDef;
  const requestHint = (next: 1 | 2) => {
    if (!live || hint >= next) return;
    setHint(next);
    onStat('hint');
    if (next === 2) {
      setLevels(lens.target);
      issue(0);
    }
  };

  const ocr = ocrRead(round.plate, round.ocrNoise, confidence);
  const hinted = hint >= 1 && live && worst.cost > 0 ? worst.key : null;

  return (
    <>
      <main className="ws3-main ws3-modC">
        <section className="ws3-panel ws3-console">
          <div className="ws3-panel-tag">MOD_C // FORENSIC LENS SHUFFLER</div>
          <Viewfinder round={round} levels={levels} confidence={confidence} status={status} target={lens.target} noLock={noLock} />

          <div className="ws3-ocr" aria-live="off">
            <span className="ws3-ocr-k">OCR_READ</span>
            <span className={`ws3-ocr-v ${ready ? 'is-ok' : ''}`}>
              <PlateText text={ocr} />
            </span>
          </div>

          <p className="ws3-c-how">Match each reading to a band: set each filter to OFF, 1, 2 or 3.</p>
          <div className="ws3-filters" role="group" aria-label="Filter array">
            {FILTER_DEFS.map((def) => (
              <FilterCard key={def.key} def={def} reading={lens.reading[def.key]} level={levels[def.key]} live={live} hinted={hinted === def.key} onPick={(p) => pick(def.key, p)} />
            ))}
          </div>
        </section>

        <aside className="ws3-side">
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">AI CONFIDENCE</div>
            <ConfidenceGauge value={confidence} threshold={passConfidence} />
            <button type="button" className={`ws3-lock ${ready ? 'is-ready' : ''}`} onClick={lock} disabled={!live}>
              [LOCK PLATE / ISSUE CHALLAN]
            </button>
            <p className="ws3-lock-note">
              {ready ? `${confidence.toFixed(1)}% · ABOVE ${passConfidence}% · READY TO LOCK` : `BELOW ${passConfidence}% · LOCKING NOW IS NO LOCK AND COSTS ${failPts} PTS`}
            </p>
            {lockMsg && live && <div className="ws3-intel ws3-intel--red" role="alert">▸ {lockMsg}</div>}
            {status === 'caught' && <div className="ws3-intel ws3-intel--ok">▸ LOCKED · +{lastPts} PTS · NEXT SUSPECT INBOUND</div>}
          </div>

          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">SUSPECT</div>
            <Readout label="SUSPECT" value={`${roundIdx + 1}/${ROUNDS.length} · ${round.label}`} />
            <Readout label="ROUND_VALUE" value={`${roundValue} PTS`} tone={roundValue < pointsPerRound ? 'warn' : 'ok'} />
            <Readout label="NO_LOCKS" value={roundFails} tone={roundFails ? 'bad' : undefined} />
          </div>

          <div className="ws3-panel ws3-sidebox ws3-log">
            <div className="ws3-panel-tag">CHALLAN LOG</div>
            {log.length === 0 && <p className="ws3-log-empty">NO VIOLATIONS LOGGED</p>}
            {log.map((e) => (
              <div key={e.no} className="ws3-log-row">
                <b>{e.no}</b> <PlateText text={formatPlate(e.plate)} /> · {e.code} · {e.fine} · <em>{e.points} VIOLATION PTS</em>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_C</span>
          <span>{round.label} · {round.model.toUpperCase()}</span>
        </div>
        <span className="ws3-bar-note">PICK A POSITION ON EACH FILTER · REACH {passConfidence}% · THEN LOCK</span>
      </ActionBar>
      <HintDock
        level={hint}
        itemLabel={`SUSPECT ${roundIdx + 1}/${ROUNDS.length}`}
        hint1Text={
          worst.cost > 0
            ? `${worstDef.label} is costing you the most (−${worst.cost.toFixed(1)} confidence). Re-check its ${worstDef.reading} reading against the scale. It is highlighted.`
            : 'Every filter matches its reading. Lock the plate.'
        }
        hint2Text="The best filter combination was set and the challan issued for you. This suspect scores 0."
        cost1={CONFIG.hintPenalty[1]}
        disabled={!live}
        onHint={requestHint}
      />
    </>
  );
}
