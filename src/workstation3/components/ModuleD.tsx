import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPLAINT_TEXT,
  CONFIG,
  formatPlate,
  registryRow,
  type CaseFile,
  type Complaint,
  type Sighting,
} from '../mockStation3Data';
import { anchors, gantryCards, seededShuffle, trueSwaps, lastLane } from '../logic';
import { fmtClock, type Fx } from '../utils';
import { useDrag } from '../useDrag';
import { ActionBar, Readout } from './Hud';
import { Glyph, PlateText, plateLabel } from './Glyph';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import './moduleD.css';

const { items: ITEM_PTS, wrongCost } = CONFIG.moduleD;
type Stage = 'chain' | 'offender' | 'blockade' | 'end';
type ItemKey = 'chain' | 'offender' | 'blockade';
const ENDING_MS = 1700;
const LANES = [1, 2, 3, 4] as const;
const TWIN = ['TWIN 1', 'TWIN 2'] as const;

const STEPS: { k: ItemKey; title: string; what: string }[] = [
  { k: 'chain', title: 'FOLLOW THE CARS', what: 'Drag each sighting card under the twin it belongs to.' },
  { k: 'offender', title: 'FIND THE OFFENDER', what: 'Tap the twin that matches the complaint.' },
  { k: 'blockade', title: 'CLOSE THE EXIT', what: 'Tap the exit that car will take.' },
];

const cut = (pts: number, hint: HintLevel, wrong: number): number =>
  Math.max(0, Math.round(pts * (hint === 1 ? 1 - CONFIG.hintPenalty[1] : 1)) - Math.round(wrong * wrongCost * pts));

/* ---------------- small drawings ---------------- */

/** Document (PUC tag), shield (insurance) and zig-zag (weaving) icons for the evidence cards. */
function Icon({ kind }: { kind: 'puc' | 'ins' | 'drive' }) {
  return (
    <svg viewBox="0 0 32 32" className="ws3-icon" aria-hidden="true" focusable="false">
      {kind === 'puc' && (
        <>
          <path d="M8 3h12l6 6v20H8z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M20 3v6h6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M12 16h10M12 21h10M12 26h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {kind === 'ins' && (
        <>
          <path d="M16 3l11 4v8c0 7-4.5 11.5-11 14C9.5 26.5 5 22 5 15V7z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M11 15.500l4 4 7-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'drive' && <path d="M6 5l9 7-9 7 9 7 9-7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
const complaintIcon = (c: Complaint): 'puc' | 'ins' | 'drive' => (c === 'EXPIRED_PUC' ? 'puc' : c === 'UNINSURED' ? 'ins' : 'drive');

/** A tiny 4-lane road with a car dot in the lane the camera saw it in. */
function MiniRoad({ lane }: { lane: number }) {
  const cx = 14 + (lane - 1) * 28;
  return (
    <svg viewBox="0 0 112 30" className="ws3-miniroad" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="112" height="30" fill="#05070c" />
      {[28, 56, 84].map((x) => (
        <line key={x} x1={x} x2={x} y1="2" y2="28" stroke="#475569" strokeWidth="2" strokeDasharray="5 5" />
      ))}
      <rect x={cx - 7} y="4" width="14" height="22" rx="4" fill="#cbd5e1" stroke="#0b1424" strokeWidth="1.5" />
      <rect x={cx - 5} y="8" width="10" height="6" rx="1.5" fill="#334155" />
    </svg>
  );
}

/** A sighting card: reads like a sentence, shows the partial plate as a plate-style pill, and a mini road with the car's lane. */
function Card({ s, tone, className = '', ...rest }: { s: Sighting; tone?: 0 | 1 } & React.HTMLAttributes<HTMLDivElement>) {
  const read = Array.from({ length: 10 }, (_, i) => s.reads[i] ?? '');
  return (
    <div className={`ws3-sight ${tone !== undefined ? `tw${tone}` : ''} ${className}`} {...rest}>
      <div className="ws3-sight-sent">
        Seen at <b>CAM {s.gantry}</b> - <b>LANE {s.lane}</b>
      </div>
      <div className="ws3-pill" role="img" aria-label={`Partial plate: ${read.map((c) => (c ? plateLabel(c) : 'unread')).join(' ')}`}>
        {read.map((c, i) => (
          <i key={i} className={`${c ? 'is-read' : ''} ${i === 1 || i === 3 || i === 5 ? 'gap' : ''}`}>
            {c ? <Glyph ch={c} /> : '·'}
          </i>
        ))}
      </div>
      <MiniRoad lane={s.lane} />
    </div>
  );
}

/** Module D · BLOCKADE: follow the cars, find the offender, close the exit. Uses whatever shift time is left. */
export default function ModuleD({
  cas,
  seed,
  timeLeft,
  onScore,
  onDone,
  fx,
  onStat,
}: {
  cas: CaseFile;
  seed: number;
  /** Shift seconds left; Module D ends when this reaches 0 (points already earned stay). */
  timeLeft: number;
  onScore: (total: number) => void;
  /** Called once with the bonus earned and whether the blockade was set before time ran out. */
  onDone: (total: number, success: boolean) => void;
  fx: Fx;
  /** Reports a wrong try or a hint for the end-of-run diagnostic. */
  onStat: (kind: 'wrong' | 'hint') => void;
}) {
  const { chase } = cas;
  const sg = chase.sightings;
  const [g2a, g2b] = gantryCards(sg, 2);
  const [g3a, g3b] = gantryCards(sg, 3);
  const anchor = anchors(sg);
  const truth = useMemo(() => trueSwaps(sg), [sg]);
  const byId = useMemo(() => Object.fromEntries(sg.map((s) => [s.id, s])), [sg]);
  const trayOrder = useMemo(() => seededShuffle([g2a, g2b, g3a, g3b].map((c) => c.id), seed + 31), [g2a, g2b, g3a, g3b, seed]);

  const [stage, setStage] = useState<Stage>('chain');
  const [cells, setCells] = useState<Record<string, string>>({}); // "row-camera" -> sighting id
  const [lockedCells, setLockedCells] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<ItemKey, HintLevel>>({ chain: 0, offender: 0, blockade: 0 });
  const [wrongs, setWrongs] = useState({ chain: 0, offender: 0, blockade: 0 });
  const [pts, setPts] = useState({ chain: 0, offender: 0, blockade: 0 });
  const [chainOk, setChainOk] = useState(false);
  const [pickedTwin, setPickedTwin] = useState<number | null>(null);
  const [badTwin, setBadTwin] = useState<number[]>([]);
  const [badExit, setBadExit] = useState<number[]>([]);
  const [okExit, setOkExit] = useState<number | null>(null);
  const [hintExit, setHintExit] = useState<number | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [fb, setFb] = useState<{ kind: 'ok' | 'bad'; text: string; n: number } | null>(null);
  const say = (kind: 'ok' | 'bad', text: string) => setFb((f) => ({ kind, text, n: (f?.n ?? 0) + 1 }));

  const total = pts.chain + pts.offender + pts.blockade;
  const totalRef = useRef(total);
  const live = useRef({ onScore, onDone, onStat });
  const done = useRef(false);
  useEffect(() => {
    totalRef.current = total;
    live.current = { onScore, onDone, onStat };
  });
  useEffect(() => {
    live.current.onScore(total);
  }, [total]);

  const finish = useCallback((ok: boolean) => {
    if (done.current) return;
    done.current = true;
    setSuccess(ok);
    setStage('end');
    window.setTimeout(() => live.current.onDone(totalRef.current, ok), ENDING_MS);
  }, []);

  // Module D ends when the shift clock reaches 0: points already earned stay
  useEffect(() => {
    if (timeLeft <= 0) finish(false);
  }, [timeLeft, finish]);

  const offenderTwin = chase.offender;
  const offenderLane = lastLane(sg, offenderTwin, truth);
  const stat = (k: 'wrong' | 'hint') => live.current.onStat(k);

  /* ---------------- step 1 · follow the cars ---------------- */
  const cellKey = (row: number, g: number) => `${row}-${g}`;
  const placedIds = Object.values(cells);
  const chainFilled = [0, 1].every((r) => [2, 3].every((g) => cells[cellKey(r, g)]));

  const placeCard = (id: string, key: string) => {
    if (stage !== 'chain' || chainOk || lockedCells.includes(key)) return;
    const g = Number(key.split('-')[1]);
    if (byId[id].gantry !== g) {
      say('bad', `That card was seen at CAM ${byId[id].gantry}. Drop it in the CAM ${byId[id].gantry} column.`);
      fx.shake();
      return;
    }
    setCells((c) => {
      const next = { ...c };
      for (const k of Object.keys(next)) if (next[k] === id) delete next[k];
      next[key] = id;
      return next;
    });
    setFb(null);
    setSelected(null);
  };
  const takeBack = (key: string) => {
    if (stage !== 'chain' || chainOk || lockedCells.includes(key)) return;
    setCells((c) => {
      const next = { ...c };
      delete next[key];
      return next;
    });
    setFb(null);
  };
  const { drag, start: startDrag } = useDrag(
    (id, slot) => {
      if (slot?.dataset.slot) placeCard(id, slot.dataset.slot);
    },
    (id) => setSelected((s) => (s === id ? null : id)),
  );
  const onCell = (key: string) => {
    if (stage !== 'chain' || chainOk || lockedCells.includes(key)) return;
    if (selected) placeCard(selected, key);
    else if (cells[key]) takeBack(key);
  };

  const advanceFromChain = () => window.setTimeout(() => setStage((s) => (s === 'chain' ? 'offender' : s)), 1100);
  const confirmChains = () => {
    if (!chainFilled || stage !== 'chain' || chainOk) return;
    const missed = [2, 3].filter((g) => [0, 1].some((r) => byId[cells[cellKey(r, g)]].truth !== r)).length;
    if (missed === 0) {
      const earned = cut(ITEM_PTS.chain, hints.chain, wrongs.chain);
      setPts((p) => ({ ...p, chain: earned }));
      setChainOk(true);
      say('ok', `BOTH CARS FOLLOWED · +${earned} PTS`);
      fx.flash();
      advanceFromChain();
    } else {
      setWrongs((w) => ({ ...w, chain: w.chain + 1 }));
      stat('wrong');
      say('bad', `${missed} CAMERA${missed > 1 ? 'S HAVE' : ' HAS'} A CARD UNDER THE WRONG TWIN · −${Math.round(wrongCost * ITEM_PTS.chain)} PTS. Check the plate characters and the lanes.`);
      fx.shake();
    }
  };
  const solveChains = () => {
    const full: Record<string, string> = {};
    ([0, 1] as const).forEach((r) => {
      full[cellKey(r, 2)] = (truth[0] ? (r === 0 ? g2b : g2a) : r === 0 ? g2a : g2b).id;
      full[cellKey(r, 3)] = (truth[1] ? (r === 0 ? g3b : g3a) : r === 0 ? g3a : g3b).id;
    });
    setCells(full);
    setLockedCells(Object.keys(full));
    setPts((p) => ({ ...p, chain: 0 }));
    setChainOk(true);
    say('ok', 'CHAINS BUILT FOR YOU · 0 PTS');
    fx.flash();
    advanceFromChain();
  };
  const lockOneHop = () => {
    const g = [2, 3].find((gg) => [0, 1].some((r) => byId[cells[cellKey(r, gg)]]?.truth !== r)) ?? 2;
    const swap = g === 2 ? truth[0] : truth[1];
    const [ca, cb] = g === 2 ? [g2a, g2b] : [g3a, g3b];
    const row0 = swap ? cb : ca;
    const row1 = swap ? ca : cb;
    setCells((c) => ({ ...c, [cellKey(0, g)]: row0.id, [cellKey(1, g)]: row1.id }));
    setLockedCells((l) => [...l, cellKey(0, g), cellKey(1, g)]);
  };

  /* ---------------- step 2 · find the offender ---------------- */
  const evidence = (i: 0 | 1) => {
    const plate = cas.twins[i];
    const flag = registryRow(cas, plate).flag;
    const weave = sg.filter((s) => s.truth === i && s.note === 'WEAVING').length;
    const rows = [
      { kind: 'puc' as const, label: 'PUC TAG', value: flag === 'EXPIRED_PUC' ? 'EXPIRED' : 'VALID', bad: flag === 'EXPIRED_PUC', match: flag === 'EXPIRED_PUC' && chase.complaint === 'EXPIRED_PUC' },
      { kind: 'ins' as const, label: 'INSURANCE', value: flag === 'UNINSURED' ? 'NONE' : 'VALID', bad: flag === 'UNINSURED', match: flag === 'UNINSURED' && chase.complaint === 'UNINSURED' },
      { kind: 'drive' as const, label: 'DRIVING', value: weave > 0 ? `LANE WEAVING ×${weave}` : 'STEADY', bad: weave > 0, match: weave > 0 && chase.complaint === 'WEAVING' },
    ];
    return { plate, rows };
  };
  const pickTwin = (i: number) => {
    if (stage !== 'offender' || badTwin.includes(i) || pickedTwin !== null) return;
    if (i === offenderTwin) {
      const earned = cut(ITEM_PTS.offender, hints.offender, wrongs.offender);
      setPickedTwin(i);
      setPts((p) => ({ ...p, offender: earned }));
      say('ok', `${TWIN[i]} IS THE OFFENDER · +${earned} PTS`);
      fx.flash();
      window.setTimeout(() => setStage((s) => (s === 'offender' ? 'blockade' : s)), 1100);
    } else {
      setBadTwin((b) => [...b, i]);
      setWrongs((w) => ({ ...w, offender: w.offender + 1 }));
      stat('wrong');
      say('bad', `${TWIN[i]} DOES NOT MATCH THE COMPLAINT · −${Math.round(wrongCost * ITEM_PTS.offender)} PT`);
      fx.shake();
    }
  };

  /* ---------------- step 3 · close the exit ---------------- */
  const pickExit = (lane: number) => {
    if (stage !== 'blockade' || okExit !== null || badExit.includes(lane)) return;
    if (lane === offenderLane) {
      const earned = cut(ITEM_PTS.blockade, hints.blockade, wrongs.blockade);
      setOkExit(lane);
      setPts((p) => ({ ...p, blockade: earned }));
      say('ok', `EXIT ${lane} CLOSED · +${earned} PTS`);
      fx.flash();
      window.setTimeout(() => finish(true), 900);
    } else {
      setBadExit((b) => [...b, lane]);
      setWrongs((w) => ({ ...w, blockade: w.blockade + 1 }));
      stat('wrong');
      say('bad', `EXIT ${lane} IS WRONG · THE OFFENDER'S LANE AFTER CAM 3 LEADS ELSEWHERE · −${Math.round(wrongCost * ITEM_PTS.blockade)} PT`);
      fx.shake();
    }
  };

  /* ---------------- hints (one dock, current step) ---------------- */
  const item: ItemKey = stage === 'chain' ? 'chain' : stage === 'offender' ? 'offender' : 'blockade';
  const requestHint = (next: 1 | 2) => {
    if (hints[item] >= next || stage === 'end') return;
    setHints((h) => ({ ...h, [item]: next }));
    stat('hint');
    if (item === 'chain') {
      if (next === 1) lockOneHop();
      else solveChains();
    } else if (item === 'offender') {
      if (next === 2) {
        setPickedTwin(offenderTwin);
        setPts((p) => ({ ...p, offender: 0 }));
        say('ok', `${TWIN[offenderTwin]} PICKED FOR YOU · 0 PTS`);
        window.setTimeout(() => setStage((s) => (s === 'offender' ? 'blockade' : s)), 1100);
      }
    } else if (next === 1) {
      const wrongExit = LANES.find((l) => l !== offenderLane && !badExit.includes(l));
      if (wrongExit) setHintExit(wrongExit);
    } else {
      setOkExit(offenderLane);
      setPts((p) => ({ ...p, blockade: 0 }));
      say('ok', `EXIT ${offenderLane} CLOSED FOR YOU · 0 PTS`);
      window.setTimeout(() => finish(true), 900);
    }
  };
  const hintText: Record<ItemKey, [string, string]> = {
    chain: ['One camera hop was placed and locked for you. This step now pays 60%.', 'The chains were built for you. This step scores 0.'],
    offender: ['The evidence line that matches the complaint is lit up. This step now pays 60%.', 'The offender was picked for you. This step scores 0.'],
    blockade: ['One exit that cannot be right was crossed out. This step now pays 60%.', 'The exit was closed for you. This step scores 0.'],
  };

  const stepIdx = ['chain', 'offender', 'blockade'].indexOf(stage === 'end' ? 'blockade' : stage);
  const dragCard = drag?.moved ? byId[drag.id] : undefined;
  const offEv = evidence(offenderTwin as 0 | 1);
  const lowTime = timeLeft <= 30;
  const fill = stage === 'end' && success ? 100 : ((stepIdx + 0.5) / 3) * 100;
  const rowOf = (id: string): 0 | 1 | undefined => {
    for (const k of Object.keys(cells)) if (cells[k] === id) return Number(k[0]) as 0 | 1;
    return undefined;
  };

  /* ---------- road diagram for step 3 ---------- */
  const laneX = (lane: number) => 100 + (lane - 1) * 140;
  const camY = (g: number) => 96 + (g - 1) * 92;
  const path = (row: 0 | 1) =>
    [1, 2, 3].map((g) => {
      const c = anchor[row];
      const card = g === 1 ? c : byId[cells[cellKey(row, g)]];
      return { g, lane: card?.lane ?? c.lane };
    });

  return (
    <>
      <main className="ws3-main ws3-modD">
        <section className="ws3-panel ws3-chase">
          <div className="ws3-panel-tag">MOD_D // BLOCKADE · BONUS</div>

          <ol className="ws3-dsteps" aria-label="Steps">
            {STEPS.map((st, i) => {
              const state = i < stepIdx || (stage === 'end' && success) ? 'is-done' : i === stepIdx ? 'is-live' : '';
              return (
                <li key={st.k} className={state} aria-current={i === stepIdx ? 'step' : undefined}>
                  <span className="ws3-dstep-n">{state === 'is-done' ? '✔' : i + 1}</span>
                  <span className="ws3-dstep-t">{i + 1} {st.title}</span>
                </li>
              );
            })}
          </ol>
          <div className="ws3-drail" aria-hidden="true">
            <i style={{ width: `${fill}%` }} />
          </div>
          <div className="ws3-dwhat" role="status">
            <small>WHAT TO DO</small>
            <p>{STEPS[Math.min(stepIdx, 2)].what}</p>
          </div>

          <div className={`ws3-complaint ${stage === 'offender' ? 'ws3-complaint--big' : ''}`} role="note">
            <Icon kind={complaintIcon(chase.complaint)} />
            <small>COMPLAINT</small>
            <b>{COMPLAINT_TEXT[chase.complaint]}</b>
            <span>One of the two silver coupes (TWIN 1 or TWIN 2).</span>
          </div>

          {fb && (
            <div key={fb.n} className={`ws3-fb ws3-fb--${fb.kind}`} role="status" aria-live="polite">
              {fb.kind === 'ok' ? '✔ ' : '✖ '}
              {fb.text}
            </div>
          )}

          {/* step 1: the board - two twins across three cameras */}
          {stage === 'chain' && (
            <>
              <div className="ws3-chain" role="group" aria-label="Chain board">
                <div className="ws3-chain-head">
                  <span />
                  {[1, 2, 3].map((g) => (
                    <b key={g}>CAM {g} <small>km {chase.kms[g - 1]}</small></b>
                  ))}
                </div>
                {([0, 1] as const).map((r) => (
                  <div key={r} className={`ws3-chain-row tw${r}`}>
                    <b className="ws3-chain-label">{TWIN[r]}</b>
                    <Card s={anchor[r]} tone={r} className="is-anchor" />
                    {[2, 3].map((g) => {
                      const key = cellKey(r, g);
                      const id = cells[key];
                      return id ? (
                        <button
                          key={key}
                          type="button"
                          className={`ws3-cell is-filled ${lockedCells.includes(key) ? 'is-locked' : ''} ${chainOk ? 'is-ok' : ''}`}
                          data-slot={key}
                          onClick={() => onCell(key)}
                          aria-label={`${TWIN[r]}, CAM ${g}, tap to take back`}
                        >
                          <Card s={byId[id]} tone={r} />
                        </button>
                      ) : (
                        <button key={key} type="button" className={`ws3-cell ${selected ? 'is-target' : ''}`} data-slot={key} onClick={() => onCell(key)} aria-label={`${TWIN[r]}, CAM ${g}, empty`}>
                          <span>DROP A CAM {g} CARD HERE</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="ws3-tray-label">SIGHTING CARDS · {placedIds.length}/4 PLACED</div>
              <div className="ws3-sight-tray" role="group" aria-label="Sighting cards">
                {trayOrder.map((id) => {
                  const s = byId[id];
                  const used = placedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ws3-sight-btn ${used ? 'is-used' : ''} ${selected === id ? 'is-sel' : ''} ${drag?.id === id && drag.moved ? 'is-drag' : ''}`}
                      onPointerDown={(e) => !used && !chainOk && startDrag(e, id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!used) setSelected((x) => (x === id ? null : id));
                        }
                      }}
                      disabled={used || chainOk}
                      aria-label={`Sighting at CAM ${s.gantry}, lane ${s.lane}${selected === id ? ', selected' : ''}`}
                    >
                      <Card s={s} />
                    </button>
                  );
                })}
              </div>
              <button type="button" className={`ws3-btn ws3-btn--primary ws3-btn--big ${chainFilled && !chainOk ? 'ws3-pulse' : ''}`} onClick={confirmChains} disabled={!chainFilled || chainOk}>
                [CHECK MY MATCHES]
              </button>
            </>
          )}

          {/* step 2: evidence per twin */}
          {stage === 'offender' && (
            <div className="ws3-evidence" role="group" aria-label="Evidence per twin">
              {([0, 1] as const).map((i) => {
                const ev = evidence(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`ws3-ev tw${i} ${badTwin.includes(i) ? 'is-bad' : ''} ${pickedTwin === i ? 'is-ok' : ''}`}
                    onClick={() => pickTwin(i)}
                    disabled={badTwin.includes(i) || pickedTwin !== null}
                  >
                    <span className="ws3-ev-head">
                      <b>{TWIN[i]}</b>
                      <span className="ws3-ev-plate"><PlateText text={formatPlate(ev.plate)} /></span>
                    </span>
                    {ev.rows.map((r) => (
                      <span key={r.kind} className={`ws3-ev-row ${r.bad ? 'is-flag' : ''} ${hints.offender >= 1 && r.match ? 'is-hint' : ''}`}>
                        <Icon kind={r.kind} />
                        <span className="ws3-ev-k">{r.label}</span>
                        <span className="ws3-ev-v">{r.value}</span>
                      </span>
                    ))}
                    <span className="ws3-ev-cta">{badTwin.includes(i) ? '✖ NOT A MATCH' : pickedTwin === i ? '✔ OFFENDER' : 'TAP IF THIS IS THE OFFENDER'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* step 3: the expressway */}
          {(stage === 'blockade' || (stage === 'end' && okExit !== null)) && (
            <>
              <p className="ws3-d-line">
                <b className={`tw${offenderTwin}-t`}>{TWIN[offenderTwin]}</b> <PlateText text={formatPlate(offEv.plate)} className="ws3-d-plate" /> is the offender. Look where it ends at CAM 3, then close that lane's exit.
              </p>
              <svg viewBox="0 0 720 450" className="ws3-road" role="group" aria-label="Expressway with four lanes, three cameras and four exits">
                <defs>
                  <pattern id="ws3-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="16" height="16" fill="#1c1608" />
                    <rect width="8" height="16" fill="#f59e0b" />
                  </pattern>
                </defs>
                <rect x="30" y="40" width="560" height="296" fill="#0a0f1b" stroke="#1e3a4a" strokeWidth="2" />
                {LANES.map((l) => (
                  <text key={l} x={laneX(l)} y="30" textAnchor="middle" className="ws3-road-lane-t">LANE {l}</text>
                ))}
                {[1, 2, 3].map((n) => (
                  <line key={n} x1={30 + n * 140} x2={30 + n * 140} y1="40" y2="336" className="ws3-road-lane" />
                ))}
                {[1, 2, 3].map((g) => (
                  <g key={g}>
                    <rect x="14" y={camY(g) - 8} width="592" height="16" className="ws3-road-gantry" />
                    {LANES.map((l) => (
                      <rect key={l} x={laneX(l) - 15} y={camY(g) - 24} width="30" height="14" rx="3" className="ws3-road-cam" />
                    ))}
                    <text x="616" y={camY(g) - 2} className="ws3-road-cam-t">CAM {g}</text>
                    <text x="616" y={camY(g) + 18} className="ws3-road-km-t">km {chase.kms[g - 1]}</text>
                  </g>
                ))}
                {([0, 1] as const).map((r) => {
                  const p = path(r);
                  const last = p[2];
                  const isOff = r === offenderTwin;
                  return (
                    <g key={r} className={`ws3-road-car tw${r}-s ${isOff ? 'is-offender' : 'is-other'}`}>
                      <polyline fill="none" points={p.map((q) => `${laneX(q.lane)},${camY(q.g)}`).join(' ')} />
                      {p.map((q) => (
                        <circle key={q.g} cx={laneX(q.lane)} cy={camY(q.g)} r={isOff ? 12 : 9} />
                      ))}
                      {isOff && <circle cx={laneX(last.lane)} cy={camY(3)} r="22" className="ws3-road-halo" />}
                      <text x={laneX(last.lane)} y={camY(3) + (isOff ? 44 : 34)} textAnchor="middle" className="ws3-road-tag">
                        {TWIN[r]}{isOff ? ' · OFFENDER' : ''}
                      </text>
                    </g>
                  );
                })}
                {LANES.map((l) => (
                  <line key={l} x1={laneX(l)} x2={laneX(l)} y1={camY(3) + 60} y2="336" className="ws3-road-fade" />
                ))}
                {okExit !== null && (
                  <g>
                    <rect x={laneX(okExit) - 62} y="300" width="124" height="28" fill="url(#ws3-stripes)" stroke="#f59e0b" strokeWidth="2" />
                    <text x={laneX(okExit)} y="292" textAnchor="middle" className="ws3-road-closed">LANE CLOSED</text>
                  </g>
                )}
                {LANES.map((l) => {
                  const bad = badExit.includes(l);
                  const crossed = hintExit === l;
                  const off = bad || crossed;
                  const x = laneX(l);
                  return (
                    <g
                      key={l}
                      className={`ws3-exit ${off ? 'is-bad' : ''} ${okExit === l ? 'is-ok' : ''}`}
                      role="button"
                      tabIndex={off || okExit !== null ? -1 : 0}
                      aria-label={`Exit ${l}${off ? ', ruled out' : ''}`}
                      onClick={() => !crossed && pickExit(l)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !crossed) {
                          e.preventDefault();
                          pickExit(l);
                        }
                      }}
                    >
                      <rect x={x - 68} y="338" width="136" height="104" fill="transparent" />
                      <line x1={x - 36} x2={x - 36} y1="336" y2="364" className="ws3-exit-pole" />
                      <line x1={x + 36} x2={x + 36} y1="336" y2="364" className="ws3-exit-pole" />
                      <rect x={x - 58} y="360" width="116" height="62" rx="6" className="ws3-exit-sign" />
                      <rect x={x - 53} y="365" width="106" height="52" rx="4" className="ws3-exit-edge" />
                      <text x={x} y="390" textAnchor="middle" className="ws3-exit-n">EXIT {l}</text>
                      <text x={x} y="410" textAnchor="middle" className="ws3-exit-s">{okExit === l ? 'CLOSED' : off ? '✕ NO' : '▼ TAP'}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="ws3-legend" aria-hidden="true">
                <span className="tw0-t">● TWIN 1</span>
                <span className="tw1-t">● TWIN 2</span>
                <span>▮ camera gantry</span>
              </div>
            </>
          )}

          {stage === 'end' && (
            <div className={`ws3-d-end ${success ? 'is-ok' : 'is-bad'}`} role="status">
              {success ? `BLOCKADE HOLDS · ${formatPlate(offEv.plate)} PULLED OVER` : 'TIME UP · THE OFFENDER SLIPPED THROUGH'}
            </div>
          )}
        </section>

        <aside className="ws3-side">
          <div className="ws3-panel ws3-rulesD">
            <div className="ws3-panel-tag">THE 3 RULES</div>
            <div className="ws3-ruleD"><b>1</b><p>A car never shows two different characters in the same plate position.</p></div>
            <div className="ws3-ruleD"><b>2</b><p>A car moves at most 1 lane between cameras.</p></div>
            <div className="ws3-ruleD"><b>3</b><p>After CAM 3 a car keeps its lane to that lane's exit.</p></div>
          </div>
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">SHIFT CLOCK</div>
            <div className={`ws3-dclock ${lowTime ? 'is-low' : ''}`} role="timer" aria-label={`Shift time left ${fmtClock(timeLeft)}`}>{fmtClock(timeLeft)}</div>
            <p className="ws3-dnote">The bonus ends when the clock reaches 00:00. Points you earned stay.</p>
            <Readout label="BONUS_SO_FAR" value={`${total} / ${CONFIG.moduleD.max}`} tone={total ? 'ok' : undefined} />
            <Readout label="1 FOLLOW" value={`${pts.chain} / ${ITEM_PTS.chain}`} />
            <Readout label="2 OFFENDER" value={`${pts.offender} / ${ITEM_PTS.offender}`} />
            <Readout label="3 EXIT" value={`${pts.blockade} / ${ITEM_PTS.blockade}`} />
          </div>
        </aside>
      </main>

      {dragCard && (
        <div className="ws3-sight-ghost" style={{ left: drag?.x, top: drag?.y }} aria-hidden="true">
          <Card s={dragCard} tone={rowOf(dragCard.id)} />
        </div>
      )}

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_D</span>
          <span>STEP {Math.min(stepIdx, 2) + 1}/3 · {STEPS[Math.min(stepIdx, 2)].title}</span>
          <span>BONUS UP TO +{CONFIG.moduleD.max}</span>
        </div>
        <span className="ws3-bar-note">{stage === 'chain' ? 'DRAG A CARD INTO A CELL · TAP A PLACED CARD TO TAKE IT BACK' : stage === 'offender' ? 'TAP THE TWIN THAT MATCHES THE COMPLAINT' : 'TAP THE EXIT SIGN TO CLOSE IT'}</span>
      </ActionBar>
      {stage !== 'end' && (
        <HintDock
          level={hints[item]}
          itemLabel={`BONUS · STEP ${item === 'chain' ? 1 : item === 'offender' ? 2 : 3}`}
          hint1Text={hintText[item][0]}
          hint2Text={hintText[item][1]}
          cost1={CONFIG.hintPenalty[1]}
          disabled={(item === 'chain' && chainOk) || (item === 'offender' && pickedTwin !== null) || (item === 'blockade' && okExit !== null)}
          onHint={requestHint}
        />
      )}
    </>
  );
}
