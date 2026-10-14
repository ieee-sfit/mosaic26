import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPLAINT_TEXT,
  CONFIG,
  FLAG_TEXT,
  formatPlate,
  registryRow,
  type CaseFile,
  type Sighting,
} from '../mockStation3Data';
import { anchors, gantryCards, seededShuffle, trueSwaps, lastLane } from '../logic';
import { fmtClock, type Fx } from '../utils';
import { useDrag } from '../useDrag';
import { ActionBar, Readout } from './Hud';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';

const { items: ITEM_PTS, wrongCost } = CONFIG.moduleD;
type Stage = 'chain' | 'offender' | 'blockade' | 'end';
const ENDING_MS = 1700;
const LANES = [1, 2, 3, 4] as const;

const cut = (pts: number, hint: HintLevel, wrong: number): number =>
  Math.max(0, Math.round(pts * (hint === 1 ? 1 - CONFIG.hintPenalty[1] : 1)) - Math.round(wrong * wrongCost * pts));

/** A sighting card: gantry, lane and the plate characters that camera managed to read. */
function Card({ s, className = '', ...rest }: { s: Sighting } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`ws3-sight ${className}`} {...rest}>
      <div className="ws3-sight-head">
        <b>G{s.gantry}</b>
        <span>LANE {s.lane}</span>
      </div>
      <div className="ws3-sight-plate" aria-label="Partial plate read">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={`${s.reads[i] ? 'is-read' : ''} ${i === 1 || i === 3 || i === 5 ? 'gap' : ''}`}>
            {s.reads[i] ?? '·'}
          </i>
        ))}
      </div>
    </div>
  );
}

/** Module D · BLOCKADE: chain the sightings into two cars, pin the offender, close the right exit. */
export default function ModuleD({
  cas,
  seed,
  deadline,
  onScore,
  onDone,
  fx,
}: {
  cas: CaseFile;
  seed: number;
  /** Epoch ms when the round must end: min(180 s, shift time left). */
  deadline: number;
  onScore: (total: number) => void;
  /** Called once with the bonus earned and whether the blockade was set before time ran out. */
  onDone: (total: number, success: boolean) => void;
  fx: Fx;
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
  const [secLeft, setSecLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [cells, setCells] = useState<Record<string, string>>({}); // "row-gantry" -> sighting id
  const [lockedCells, setLockedCells] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<'chain' | 'offender' | 'blockade', HintLevel>>({ chain: 0, offender: 0, blockade: 0 });
  const [wrongs, setWrongs] = useState({ chain: 0, offender: 0, blockade: 0 });
  const [pts, setPts] = useState({ chain: 0, offender: 0, blockade: 0 });
  const [chainMiss, setChainMiss] = useState<number | null>(null);
  const [pickedTwin, setPickedTwin] = useState<number | null>(null);
  const [badTwin, setBadTwin] = useState<number[]>([]);
  const [badExit, setBadExit] = useState<number[]>([]);
  const [okExit, setOkExit] = useState<number | null>(null);
  const [hintExit, setHintExit] = useState<number | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  const total = pts.chain + pts.offender + pts.blockade;
  const totalRef = useRef(total);
  const live = useRef({ onScore, onDone });
  const done = useRef(false);
  useEffect(() => {
    totalRef.current = total;
    live.current = { onScore, onDone };
  });
  useEffect(() => {
    onScore(total);
  }, [total, onScore]);

  const finish = useCallback((ok: boolean) => {
    if (done.current) return;
    done.current = true;
    setSuccess(ok);
    setStage('end');
    window.setTimeout(() => live.current.onDone(totalRef.current, ok), ENDING_MS);
  }, []);

  // own deadline: timestamp-driven, points already earned stay
  useEffect(() => {
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecLeft(left);
      if (left <= 0) finish(false);
    }, 250);
    return () => window.clearInterval(t);
  }, [deadline, finish]);

  const offenderTwin = chase.offender;
  const offenderLane = lastLane(sg, offenderTwin, truth);

  /* ---------------- stage 1 · chains ---------------- */
  const cellKey = (row: number, g: number) => `${row}-${g}`;
  const placedIds = Object.values(cells);
  const chainFilled = [0, 1].every((r) => [2, 3].every((g) => cells[cellKey(r, g)]));
  const chainBusy = stage !== 'chain';

  const placeCard = (id: string, key: string) => {
    if (stage !== 'chain' || lockedCells.includes(key)) return;
    const g = Number(key.split('-')[1]);
    if (byId[id].gantry !== g) {
      fx.shake();
      return;
    }
    setCells((c) => {
      const next = { ...c };
      for (const k of Object.keys(next)) if (next[k] === id) delete next[k];
      next[key] = id;
      return next;
    });
    setChainMiss(null);
    setSelected(null);
  };
  const takeBack = (key: string) => {
    if (stage !== 'chain' || lockedCells.includes(key)) return;
    setCells((c) => {
      const next = { ...c };
      delete next[key];
      return next;
    });
    setChainMiss(null);
  };
  const { drag, start: startDrag } = useDrag(
    (id, slot) => {
      if (slot?.dataset.slot) placeCard(id, slot.dataset.slot);
    },
    (id) => setSelected((s) => (s === id ? null : id)),
  );
  const onCell = (key: string) => {
    if (stage !== 'chain' || lockedCells.includes(key)) return;
    if (selected) placeCard(selected, key);
    else if (cells[key]) takeBack(key);
  };

  const confirmChains = () => {
    if (!chainFilled || stage !== 'chain') return;
    const missed = [2, 3].filter((g) => [0, 1].some((r) => byId[cells[cellKey(r, g)]].truth !== r)).length;
    if (missed === 0) {
      setPts((p) => ({ ...p, chain: cut(ITEM_PTS.chain, hints.chain, wrongs.chain) }));
      setStage('offender');
      fx.flash();
    } else {
      setWrongs((w) => ({ ...w, chain: w.chain + 1 }));
      setChainMiss(missed);
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
    setStage('offender');
    fx.flash();
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

  /* ---------------- stage 2 · offender ---------------- */
  const evidence = (i: 0 | 1) => {
    const plate = cas.twins[i];
    const flag = registryRow(cas, plate).flag;
    const weave = sg.filter((s) => s.truth === i && s.note === 'WEAVING').length;
    const lines: { text: string; match: boolean }[] = [{ text: FLAG_TEXT[flag], match: flag === chase.complaint }];
    if (weave > 0) lines.push({ text: `LANE WEAVING ×${weave}`, match: chase.complaint === 'WEAVING' });
    return { plate, lines };
  };
  const pickTwin = (i: number) => {
    if (stage !== 'offender' || badTwin.includes(i) || pickedTwin !== null) return;
    if (i === offenderTwin) {
      setPickedTwin(i);
      setPts((p) => ({ ...p, offender: cut(ITEM_PTS.offender, hints.offender, wrongs.offender) }));
      fx.flash();
      window.setTimeout(() => setStage((s) => (s === 'offender' ? 'blockade' : s)), 900);
    } else {
      setBadTwin((b) => [...b, i]);
      setWrongs((w) => ({ ...w, offender: w.offender + 1 }));
      fx.shake();
    }
  };

  /* ---------------- stage 3 · blockade ---------------- */
  const pickExit = (lane: number) => {
    if (stage !== 'blockade' || okExit !== null || badExit.includes(lane)) return;
    if (lane === offenderLane) {
      setOkExit(lane);
      setPts((p) => ({ ...p, blockade: cut(ITEM_PTS.blockade, hints.blockade, wrongs.blockade) }));
      fx.flash();
      window.setTimeout(() => finish(true), 700);
    } else {
      setBadExit((b) => [...b, lane]);
      setWrongs((w) => ({ ...w, blockade: w.blockade + 1 }));
      fx.shake();
    }
  };

  /* ---------------- hints (one dock, current item) ---------------- */
  const item: 'chain' | 'offender' | 'blockade' = stage === 'chain' ? 'chain' : stage === 'offender' ? 'offender' : 'blockade';
  const requestHint = (next: 1 | 2) => {
    if (hints[item] >= next || stage === 'end') return;
    setHints((h) => ({ ...h, [item]: next }));
    if (item === 'chain') {
      if (next === 1) lockOneHop();
      else solveChains();
    } else if (item === 'offender') {
      if (next === 2) {
        setPickedTwin(offenderTwin);
        setPts((p) => ({ ...p, offender: 0 }));
        window.setTimeout(() => setStage((s) => (s === 'offender' ? 'blockade' : s)), 900);
      }
    } else if (next === 1) {
      const wrongExit = LANES.find((l) => l !== offenderLane && !badExit.includes(l));
      if (wrongExit) setHintExit(wrongExit);
    } else {
      setOkExit(offenderLane);
      setPts((p) => ({ ...p, blockade: 0 }));
      window.setTimeout(() => finish(true), 700);
    }
  };
  const hintText: Record<typeof item, [string, string]> = {
    chain: ['One gantry hop was placed and locked for you. The chains now pay 60%.', 'The chains were built for you. This item scores 0.'],
    offender: ['The evidence line that matches the complaint is lit up. This item now pays 60%.', 'The offender was picked for you. This item scores 0.'],
    blockade: ['One exit that cannot be right was crossed out. This item now pays 60%.', 'The blockade was placed for you. This item scores 0.'],
  };

  const itemLabel = item === 'chain' ? 'CHAINS' : item === 'offender' ? 'OFFENDER' : 'BLOCKADE';
  const dragCard = drag?.moved ? byId[drag.id] : undefined;
  const offenderEvidence = evidence(offenderTwin as 0 | 1);
  const lowTime = secLeft <= 30;

  /* ---------- road diagram for stage 3 ---------- */
  const roadX = (lane: number) => 70 + (lane - 1) * 70;
  const gantryY = (g: number) => 34 + (g - 1) * 52;
  const path = (row: 0 | 1) => [1, 2, 3].map((g) => {
    const c = anchors(sg)[row];
    const cards = g === 1 ? c : g === 2 ? byId[cells[cellKey(row, 2)]] : byId[cells[cellKey(row, 3)]];
    return { g, lane: cards?.lane ?? c.lane };
  });

  return (
    <>
      <main className="ws3-main ws3-modD">
        <section className="ws3-panel ws3-chase">
          <div className="ws3-panel-tag">MOD_D // BLOCKADE · BONUS</div>
          <div className="ws3-complaint" role="note">
            <small>COMPLAINT</small>
            <b>{COMPLAINT_TEXT[chase.complaint]}</b>
            <span>SILVER COUPE · ONE OF THE TWINS</span>
          </div>
          <ol className="ws3-steprail ws3-steprail--d">
            {(['chain', 'offender', 'blockade'] as const).map((k, i) => {
              const at = ['chain', 'offender', 'blockade'].indexOf(stage === 'end' ? 'blockade' : stage);
              return (
                <li key={k} className={i < at || stage === 'end' ? 'is-done' : i === at ? 'is-live' : ''}>
                  {i + 1} {k.toUpperCase()}
                </li>
              );
            })}
          </ol>

          {/* chain board: two cars across three gantries */}
          {(stage === 'chain' || stage === 'offender') && (
            <div className="ws3-chain" role="group" aria-label="Chain board">
              <div className="ws3-chain-head">
                <span />
                <b>G1</b>
                <b>G2</b>
                <b>G3</b>
              </div>
              {([0, 1] as const).map((r) => (
                <div key={r} className={`ws3-chain-row ${stage === 'offender' && pickedTwin === r ? 'is-picked' : ''}`}>
                  <b className="ws3-chain-label">TWIN {r + 1}</b>
                  <Card s={anchor[r]} className="is-anchor" />
                  {[2, 3].map((g) => {
                    const key = cellKey(r, g);
                    const id = cells[key];
                    const ok = stage === 'offender';
                    return id ? (
                      <button
                        key={key}
                        type="button"
                        className={`ws3-cell is-filled ${lockedCells.includes(key) ? 'is-locked' : ''} ${ok ? 'is-ok' : ''}`}
                        data-slot={key}
                        onClick={() => onCell(key)}
                        aria-label={`Row ${r + 1} gantry ${g}, tap to take back`}
                      >
                        <Card s={byId[id]} />
                      </button>
                    ) : (
                      <button
                        key={key}
                        type="button"
                        className={`ws3-cell ${selected ? 'is-target' : ''}`}
                        data-slot={key}
                        onClick={() => onCell(key)}
                        aria-label={`Row ${r + 1} gantry ${g}, empty`}
                      >
                        <span>G{g}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {stage === 'chain' && (
            <>
              <div className="ws3-sight-tray" role="group" aria-label="Sighting cards">
                {trayOrder.map((id) => {
                  const s = byId[id];
                  const used = placedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ws3-sight-btn ${used ? 'is-used' : ''} ${selected === id ? 'is-sel' : ''} ${drag?.id === id && drag.moved ? 'is-drag' : ''}`}
                      onPointerDown={(e) => !used && startDrag(e, id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!used) setSelected((x) => (x === id ? null : id));
                        }
                      }}
                      disabled={used}
                      aria-label={`Sighting at gantry ${s.gantry}, lane ${s.lane}${selected === id ? ', selected' : ''}`}
                    >
                      <Card s={s} />
                    </button>
                  );
                })}
              </div>
              <div className="ws3-qfeed" aria-live="polite">
                {chainMiss !== null && (
                  <div className="ws3-intel ws3-intel--red">
                    ▸ {chainMiss} GANTRY HOP{chainMiss > 1 ? 'S' : ''} BROKEN · −{Math.round(wrongCost * ITEM_PTS.chain)} PTS PER CHECK
                  </div>
                )}
              </div>
              <button type="button" className={`ws3-btn ws3-btn--primary ${chainFilled ? 'ws3-pulse' : ''}`} onClick={confirmChains} disabled={!chainFilled || chainBusy}>
                [LOCK CHAINS]
              </button>
            </>
          )}

          {stage === 'offender' && (
            <>
              <p className="ws3-qtext ws3-qtext--sm">Chains locked. Which twin matches the complaint? Tap it to pull it over.</p>
              <div className="ws3-evidence" role="group" aria-label="Evidence per twin">
                {([0, 1] as const).map((i) => {
                  const ev = evidence(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`ws3-ev ${badTwin.includes(i) ? 'is-bad' : ''} ${pickedTwin === i ? 'is-ok' : ''}`}
                      onClick={() => pickTwin(i)}
                      disabled={badTwin.includes(i) || pickedTwin !== null}
                    >
                      <b>TWIN {i + 1}</b>
                      <span className="ws3-ev-plate">{formatPlate(ev.plate)}</span>
                      {ev.lines.map((l) => (
                        <em key={l.text} className={hints.offender === 1 && l.match ? 'is-hint' : ''}>▸ {l.text}</em>
                      ))}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {(stage === 'blockade' || (stage === 'end' && okExit !== null)) && (
            <>
              <p className="ws3-qtext ws3-qtext--sm">
                {formatPlate(offenderEvidence.plate)} will hold its lane after G3 and leave by that lane's exit. Close it.
              </p>
              <svg viewBox="0 0 350 250" className="ws3-road" role="group" aria-label="Expressway with four exits">
                {LANES.map((l) => (
                  <line key={l} x1={roadX(l)} x2={roadX(l)} y1="10" y2="180" className="ws3-road-lane" />
                ))}
                {[1, 2, 3].map((g) => (
                  <g key={g}>
                    <rect x="38" y={gantryY(g) - 4} width="274" height="8" className="ws3-road-gantry" />
                    <text x="14" y={gantryY(g) + 4} className="ws3-road-label">G{g}</text>
                  </g>
                ))}
                {([0, 1] as const).map((r) => {
                  const pts2 = path(r);
                  return (
                    <g key={r} className={`ws3-road-car ws3-road-car--${r} ${r === offenderTwin ? 'is-offender' : ''}`}>
                      <polyline fill="none" points={pts2.map((p) => `${roadX(p.lane)},${gantryY(p.g)}`).join(' ')} />
                      {pts2.map((p) => (
                        <circle key={p.g} cx={roadX(p.lane)} cy={gantryY(p.g)} r="6" />
                      ))}
                      <text x={roadX(pts2[2].lane) + 9} y={gantryY(3) + 18} className="ws3-road-tag">T{r + 1}</text>
                    </g>
                  );
                })}
                {LANES.map((l) => {
                  const bad = badExit.includes(l);
                  const crossed = hintExit === l;
                  return (
                    <g
                      key={l}
                      className={`ws3-exit ${bad || crossed ? 'is-bad' : ''} ${okExit === l ? 'is-ok' : ''}`}
                      role="button"
                      tabIndex={bad || crossed || okExit !== null ? -1 : 0}
                      aria-label={`Exit ${l}${bad || crossed ? ', ruled out' : ''}`}
                      onClick={() => !crossed && pickExit(l)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !crossed) {
                          e.preventDefault();
                          pickExit(l);
                        }
                      }}
                    >
                      <rect x={roadX(l) - 30} y="196" width="60" height="40" />
                      <text x={roadX(l)} y="214" textAnchor="middle" className="ws3-exit-n">EXIT {l}</text>
                      <text x={roadX(l)} y="229" textAnchor="middle" className="ws3-exit-s">{okExit === l ? '■ CLOSED' : bad || crossed ? '✕' : 'TAP'}</text>
                    </g>
                  );
                })}
              </svg>
            </>
          )}

          {stage === 'end' && (
            <div className={`ws3-d-end ${success ? 'is-ok' : 'is-bad'}`} role="status">
              {success
                ? `BLOCKADE HOLDS · ${formatPlate(offenderEvidence.plate)} PULLED OVER`
                : 'TIME UP · THE OFFENDER SLIPPED THROUGH'}
            </div>
          )}
        </section>

        <aside className="ws3-side">
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">BONUS CLOCK</div>
            <div className={`ws3-dclock ${lowTime ? 'is-low' : ''}`} role="timer" aria-label={`Bonus time left ${fmtClock(secLeft)}`}>{fmtClock(secLeft)}</div>
            <Readout label="BONUS_SO_FAR" value={`${total} / ${CONFIG.moduleD.max}`} tone={total ? 'ok' : undefined} />
            <Readout label="CHAINS" value={`${pts.chain} / ${ITEM_PTS.chain}`} />
            <Readout label="OFFENDER" value={`${pts.offender} / ${ITEM_PTS.offender}`} />
            <Readout label="BLOCKADE" value={`${pts.blockade} / ${ITEM_PTS.blockade}`} />
          </div>
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">RULES</div>
            <div className="ws3-clue"><b>R1</b> One car never shows two different characters in the same position.</div>
            <div className="ws3-clue"><b>R2</b> A car moves at most 1 lane between gantries.</div>
            <div className="ws3-clue"><b>R3</b> After G3 a car keeps its lane to that lane's exit.</div>
          </div>
        </aside>
      </main>

      {dragCard && (
        <div className="ws3-sight-ghost" style={{ left: drag?.x, top: drag?.y }} aria-hidden="true">
          <Card s={dragCard} />
        </div>
      )}

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_D</span>
          <span>{itemLabel}</span>
          <span>BONUS UP TO +{CONFIG.moduleD.max}</span>
        </div>
        <span className="ws3-bar-note">
          {stage === 'chain' ? 'DRAG EACH CARD INTO ITS GANTRY CELL · TAP A PLACED CARD TO TAKE IT BACK' : stage === 'offender' ? 'TAP THE TWIN THAT MATCHES THE COMPLAINT' : 'TAP THE EXIT TO CLOSE'}
        </span>
      </ActionBar>
      {stage !== 'end' && (
        <HintDock
          level={hints[item]}
          itemLabel={`BONUS · ${itemLabel}`}
          hint1Text={hintText[item][0]}
          hint2Text={hintText[item][1]}
          cost1={CONFIG.hintPenalty[1]}
          disabled={(item === 'offender' && pickedTwin !== null) || okExit !== null}
          onHint={requestHint}
        />
      )}
    </>
  );
}
