import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG, SLOT_TYPES, formatPlate, type CaseFile } from '../mockStation3Data';
import { clueText, seededShuffle, wrongSlots } from '../logic';
import type { Fx } from '../utils';
import { ActionBar, Readout } from './Hud';
import { useDrag } from '../useDrag';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';

const { rounds: ROUND_COUNT, pointsPerRound, wrongCost } = CONFIG.moduleB;
const ADVANCE_MS = 1100;
const GROUP_AFTER = [1, 3, 5]; // visual gaps: SS DD LL DDDD

interface Tile {
  id: string;
  glyph: string;
}

/** Module B · PLATE REBUILD: finish a smudged plate using the letter/digit slot rule and the witness clues. */
export default function ModuleB({
  cas,
  seed,
  onScore,
  onDone,
  fx,
}: {
  cas: CaseFile;
  seed: number;
  onScore: (delta: number) => void;
  onDone: () => void;
  fx: Fx;
}) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<number, string>>({}); // smudge position -> tile id
  const [locked, setLocked] = useState<number[]>([]); // positions fixed by Hint 1
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [lastMiss, setLastMiss] = useState<number | null>(null);
  const [hint, setHint] = useState<HintLevel>(0);
  const [earned, setEarned] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);

  const round = cas.rebuild[idx];
  const tiles: Tile[] = useMemo(
    () => seededShuffle(round.smudges.flatMap((s, i) => s.pair.map((g, k) => ({ id: `${i}${k}`, glyph: g }))), seed + idx * 7919),
    [round, seed, idx],
  );
  const glyphOf = (id: string | undefined): string | undefined => tiles.find((t) => t.id === id)?.glyph;
  const placedIds = Object.values(picks);
  const resolved = earned !== null;
  const filled = round.smudges.every((s) => picks[s.idx] !== undefined);
  const value = Math.max(0, Math.round(pointsPerRound * (hint === 1 ? 1 - CONFIG.hintPenalty[1] : 1)) - Math.round(wrong * wrongCost * pointsPerRound));

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  /* ---- placing tiles (drag with mouse or touch, or tap a tile then a slot) ---- */
  const place = (tileId: string, pos: number) => {
    if (resolved || locked.includes(pos)) return;
    setPicks((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (next[Number(k)] === tileId) delete next[Number(k)];
      next[pos] = tileId; // a tile already in this slot simply drops back to the tray
      return next;
    });
    setLastMiss(null);
    setSelected(null);
  };
  const unplace = (pos: number) => {
    if (resolved || locked.includes(pos)) return;
    setPicks((p) => {
      const next = { ...p };
      delete next[pos];
      return next;
    });
    setLastMiss(null);
  };

  const { drag, start: startDrag } = useDrag(
    (tile, slot) => {
      if (slot) place(tile, Number(slot.dataset.slot));
    },
    (tile) => setSelected((s) => (s === tile ? null : tile)),
  );
  const onSlot = (pos: number) => {
    if (resolved || locked.includes(pos)) return;
    if (selected) place(selected, pos);
    else if (picks[pos] !== undefined) unplace(pos);
  };

  /* ---- resolving ---- */
  const resolve = (pts: number) => {
    setEarned(pts);
    onScore(pts);
    fx.flash();
  };
  const check = () => {
    if (!filled || resolved) return;
    const map: Record<number, string | undefined> = {};
    for (const s of round.smudges) map[s.idx] = glyphOf(picks[s.idx]);
    const miss = wrongSlots(round, map);
    if (miss === 0) {
      resolve(value);
    } else {
      setWrong((w) => w + 1);
      setLastMiss(miss);
      fx.shake();
    }
  };
  const requestHint = (next: 1 | 2) => {
    if (resolved || hint >= next) return;
    setHint(next);
    if (next === 1) {
      // lock one still-unsolved smudge onto its true glyph
      const open = round.smudges.find((s) => !locked.includes(s.idx) && glyphOf(picks[s.idx]) !== round.plate[s.idx]);
      if (!open) return;
      const tile = tiles.find((t) => t.id === `${round.smudges.indexOf(open)}0`);
      if (!tile) return;
      setPicks((p) => {
        const nx = { ...p };
        for (const k of Object.keys(nx)) if (nx[Number(k)] === tile.id) delete nx[Number(k)];
        nx[open.idx] = tile.id;
        return nx;
      });
      setLocked((l) => [...l, open.idx]);
    } else {
      // Hint 2 rebuilds the whole plate and submits it for 0 pts
      const full: Record<number, string> = {};
      round.smudges.forEach((s, i) => {
        full[s.idx] = `${i}0`;
      });
      setPicks(full);
      setLocked(round.smudges.map((s) => s.idx));
      resolve(0);
    }
  };

  // advance after a plate locks
  useEffect(() => {
    if (!resolved) return undefined;
    const t = setTimeout(() => {
      if (idx + 1 >= ROUND_COUNT) {
        setReveal(true);
      } else {
        setIdx(idx + 1);
        setPicks({});
        setLocked([]);
        setSelected(null);
        setWrong(0);
        setLastMiss(null);
        setHint(0);
        setEarned(null);
      }
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [resolved, idx]);

  /* ---- twin reveal after the last plate ---- */
  if (reveal) {
    const [a, b] = cas.twins;
    const differs = (i: number) => a[i] !== b[i];
    const row = (plate: string, label: string) => (
      <div className="ws3-twin-row">
        <span className="ws3-twin-tag">{label}</span>
        <div className="ws3-plate ws3-plate--final" aria-label={`${label} plate ${formatPlate(plate)}`}>
          {plate.split('').map((ch, i) => (
            <span key={i} className={`ws3-glyph ${differs(i) ? 'is-diff' : ''} ${GROUP_AFTER.includes(i - 1) ? 'ws3-glyph--gap' : ''}`}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    );
    return (
      <>
        <main className="ws3-main ws3-modB2">
          <section className="ws3-panel ws3-rebuild">
            <div className="ws3-panel-tag">MOD_B // PLATE REBUILD · TWIN CHECK</div>
            <h2 className="ws3-reveal-title">TWO SILVER COUPES · TWO DIFFERENT PLATES</h2>
            <p className="ws3-qtext ws3-qtext--sm">The plates looked the same on camera. Rebuilt, they are not. These are two different cars.</p>
            {row(a, 'TWIN 1')}
            {row(b, 'TWIN 2')}
            <p className="ws3-twin-note">▸ {[...a].filter((_, i) => differs(i)).length} GLYPHS DIFFER · BOTH CARS GO ON THE PURSUIT LIST</p>
            <button type="button" className="ws3-btn ws3-btn--primary" onClick={() => doneRef.current()}>
              [ENTER FILTER CONSOLE ➔]
            </button>
          </section>
        </main>
        <ActionBar>
          <div className="ws3-bar-info">
            <span>MOD_B</span>
            <span>ALL 4 PLATES REBUILT</span>
          </div>
        </ActionBar>
      </>
    );
  }

  const smudgeAt = (i: number) => round.smudges.find((s) => s.idx === i);
  const dragGlyph = drag?.moved ? glyphOf(drag.id) : undefined;

  return (
    <>
      <main className="ws3-main ws3-modB2">
        <section className="ws3-panel ws3-rebuild">
          <div className="ws3-panel-tag">MOD_B // PLATE REBUILD</div>
          <div className="ws3-qprogress" aria-label={`Plate ${idx + 1} of ${ROUND_COUNT}`}>
            {cas.rebuild.map((r, i) => (
              <span key={r.id} className={`ws3-qpip ${i < idx ? 'is-done' : i === idx ? 'is-live' : ''}`}>
                P{i + 1}
              </span>
            ))}
          </div>
          <div className="ws3-prob-head">
            <span className="ws3-prob-id">{round.label}</span>
            <span>{round.camera} · {round.smudges.length} SMUDGED GLYPHS</span>
          </div>

          <div className="ws3-plate" role="group" aria-label="Smudged plate. Drop a glyph tile on each smudge.">
            {round.plate.split('').map((ch, i) => {
              const sm = smudgeAt(i);
              const pickedId = sm ? picks[i] : undefined;
              const g = glyphOf(pickedId);
              const isLocked = locked.includes(i);
              const state = !sm
                ? ''
                : resolved
                  ? 'is-correct'
                  : isLocked
                    ? 'is-locked'
                    : g
                      ? 'is-filled'
                      : 'is-empty';
              return (
                <div key={i} className={`ws3-slotcell ${GROUP_AFTER.includes(i - 1) ? 'ws3-glyph--gap' : ''}`}>
                  {sm ? (
                    <button
                      type="button"
                      className={`ws3-glyph ws3-glyph--smudge ${state} ${selected && !resolved ? 'is-target' : ''}`}
                      data-slot={i}
                      onClick={() => onSlot(i)}
                      aria-label={`Smudged ${SLOT_TYPES[i] === 'D' ? 'digit' : 'letter'} slot ${i + 1}${g ? `, holds ${g}` : ', empty'}`}
                    >
                      {g ?? '▒'}
                    </button>
                  ) : (
                    <span className="ws3-glyph">{ch}</span>
                  )}
                  <i className="ws3-slottype" aria-hidden="true">{SLOT_TYPES[i] === 'D' ? '123' : 'ABC'}</i>
                </div>
              );
            })}
          </div>

          <div className="ws3-tray" role="group" aria-label="Glyph tiles">
            {tiles.map((t) => {
              const used = placedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`ws3-tile ${used ? 'is-used' : ''} ${selected === t.id ? 'is-sel' : ''} ${drag?.id === t.id && drag.moved ? 'is-drag' : ''}`}
                  onPointerDown={(e) => !used && !resolved && startDrag(e, t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!used) setSelected((s) => (s === t.id ? null : t.id));
                    }
                  }}
                  disabled={used || resolved}
                  aria-label={`Tile ${t.glyph}${selected === t.id ? ', selected' : ''}`}
                >
                  {t.glyph}
                </button>
              );
            })}
          </div>

          <div className="ws3-qfeed" aria-live="polite">
            {resolved && <div className="ws3-intel ws3-intel--ok">▸ PLATE LOCKED · +{earned} PTS</div>}
            {!resolved && lastMiss !== null && (
              <div className="ws3-intel ws3-intel--red">
                ▸ {lastMiss} SLOT{lastMiss > 1 ? 'S' : ''} STILL WRONG · −{Math.round(wrongCost * pointsPerRound)} PTS PER CHECK
              </div>
            )}
          </div>

          <button type="button" className={`ws3-btn ws3-btn--primary ${filled && !resolved ? 'ws3-pulse' : ''}`} onClick={check} disabled={!filled || resolved}>
            [CHECK PLATE]
          </button>
        </section>

        <aside className="ws3-side">
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">SLOT RULE</div>
            <p className="ws3-rule"><b>ABC</b> slot = letter · <b>123</b> slot = digit</p>
            <p className="ws3-rule ws3-rule--sub">0 / O, 8 / B, 2 / Z look alike. The slot type tells you which.</p>
          </div>
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">WITNESS CLUES</div>
            {round.clues.length === 0 && <p className="ws3-log-empty">NONE · THE SLOT RULE IS ENOUGH</p>}
            {round.clues.map((c, i) => (
              <div key={i} className="ws3-clue">
                <b>W{i + 1}</b> {clueText(c)}
              </div>
            ))}
          </div>
          <div className="ws3-panel ws3-sidebox">
            <div className="ws3-panel-tag">PLATE VALUE</div>
            <Readout label="THIS_PLATE" value={`${value} PTS`} tone={value < pointsPerRound ? 'warn' : 'ok'} />
            <Readout label="CHECKS_FAILED" value={wrong} tone={wrong ? 'bad' : undefined} />
          </div>
        </aside>
      </main>

      {drag?.moved && dragGlyph && (
        <div className="ws3-tile ws3-tile--ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {dragGlyph}
        </div>
      )}

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_B</span>
          <span>PLATE {idx + 1}/{ROUND_COUNT}</span>
          <span>{round.label}</span>
        </div>
        <span className="ws3-bar-note">DRAG A TILE ONTO A SMUDGE · TAP A FILLED SLOT TO TAKE IT BACK</span>
      </ActionBar>
      <HintDock
        level={hint}
        itemLabel={`PLATE ${idx + 1}/${ROUND_COUNT}`}
        hint1Text="One smudged glyph was locked onto its true character for you. This plate now pays 60%."
        hint2Text="The whole plate was rebuilt and submitted for you. This plate scores 0."
        cost1={CONFIG.hintPenalty[1]}
        disabled={resolved}
        onHint={requestHint}
      />
    </>
  );
}
