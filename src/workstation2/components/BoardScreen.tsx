import { useEffect, useMemo, useRef } from 'react';
import { Flag } from 'lucide-react';
import { buildBoard, fmtLap } from '../race';
import type { BoardKind } from '../race';
import Cars from './Cars';
import LeMansMap from './LeMansMap';
import Panel from './Panel';

export interface BoardData {
  kind: BoardKind;
  /** The player's best lap in seconds (null if none was set). */
  best: number | null;
  /** Race total in seconds (null on a DNF). */
  total: number | null;
  grid: number | null;
  /** Points behind this board: Module B for qualifying, Module C for the race. */
  points: number;
  pointsMax: number;
  /** DNF only: base score so far, out of 100. */
  partial?: number;
  /** Qualifying only: the practice lap, for reference. */
  practice?: number | null;
}

interface Props {
  data: BoardData;
  onContinue: () => void;
}

/** Longest a board stays up before it moves on by itself. */
export const DWELL_MS = 8000;

const TITLE: Record<BoardKind, string> = { quali: 'QUALIFYING', race: 'RACE FINISHED', dnf: 'RACE · DNF' };
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Timing-table board with invented drivers: position, code, best lap and gap, the player's row lit, and a short car reveal. */
export default function BoardScreen({ data, onContinue }: Props) {
  const { kind } = data;
  const board = useMemo(() => buildBoard(kind, { best: data.best, total: data.total }), [kind, data.best, data.total]);
  const cars = useMemo(
    () => board.rows.map((r) => ({ id: r.key, label: r.you ? 'YOU' : String(r.num), frac: r.frac, you: r.you, hue: r.hue })),
    [board],
  );

  const go = useRef(onContinue);
  useEffect(() => { go.current = onContinue; });
  useEffect(() => {
    const t = window.setTimeout(() => go.current(), DWELL_MS);
    return () => window.clearTimeout(t);
  }, []);

  const delta = data.grid !== null && board.youPos !== null ? data.grid - board.youPos : null;
  const showTotal = kind !== 'quali';

  return (
    <div className={`ws2-board ws2-in is-${kind}`} role="region" aria-label={TITLE[kind]}>
      <section className="ws2-board__table">
        <header className="ws2-board__head"><Flag size={22} aria-hidden /><b>{TITLE[kind]}</b></header>
        <div className={`ws2-board__cols ${showTotal ? 'has-total' : ''}`} aria-hidden>
          <span>POS</span><span>CODE</span><span>BEST LAP</span>{showTotal && <span>TOTAL</span>}<span>GAP</span>
        </div>
        <ol className="ws2-board__rows">
          {board.rows.map((r) => (
            <li key={r.key} className={`${r.you ? 'is-you' : ''} ${showTotal ? 'has-total' : ''}`}>
              <b className="ws2-board__pos">{r.pos ?? 'DNF'}</b>
              <span className="ws2-board__code"><i style={{ background: r.hue }} aria-hidden />{r.code}</span>
              <span className="ws2-board__time">{r.best !== null ? fmtLap(r.best) : '--'}</span>
              {showTotal && <span className="ws2-board__time">{r.total !== null ? fmtLap(r.total) : r.pos === null ? 'DNF' : '--'}</span>}
              <span className="ws2-board__gap">{r.gap}</span>
            </li>
          ))}
        </ol>
      </section>

      <aside className="ws2-board__side">
        <Panel title="TRACK" tag={kind === 'quali' ? 'GRID' : 'FINISH'} className="ws2-board__map">
          <LeMansMap names={false} faintLabels={false} label="Cars on the circuit">
            <Cars cars={cars} />
          </LeMansMap>
        </Panel>

        <div className="ws2-board__card">
          {kind === 'quali' && (
            <>
              <div className="ws2-board__big"><small>GRID</small><b>P{data.grid}</b></div>
              <dl>
                <div><dt>QUALI LAP</dt><dd>{data.best !== null ? fmtLap(data.best) : '--'}</dd></div>
                {data.practice != null && <div><dt>PRACTICE</dt><dd>{fmtLap(data.practice)}</dd></div>}
                <div><dt>ROUTES</dt><dd>{r1(data.points)}/{data.pointsMax}</dd></div>
              </dl>
            </>
          )}
          {kind === 'race' && (
            <>
              <div className="ws2-board__big"><small>FINISH</small><b>P{board.youPos}</b>{delta !== null && delta !== 0 && <em className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'}{Math.abs(delta)}</em>}</div>
              <dl>
                <div><dt>BEST LAP</dt><dd>{data.best !== null ? fmtLap(data.best) : '--'}</dd></div>
                <div><dt>TOTAL</dt><dd>{data.total !== null ? fmtLap(data.total) : '--'}</dd></div>
                <div><dt>POINTS</dt><dd>{r1(data.points)}/{data.pointsMax}</dd></div>
              </dl>
            </>
          )}
          {kind === 'dnf' && (
            <>
              <div className="ws2-board__big is-dnf"><small>RESULT</small><b>DNF</b></div>
              <dl>
                <div><dt>BEST LAP</dt><dd>{data.best !== null ? fmtLap(data.best) : '--'}</dd></div>
                <div><dt>PARTIAL SCORE</dt><dd>{r1(data.partial ?? 0)}/100</dd></div>
              </dl>
            </>
          )}
        </div>

        <div className="ws2-board__go">
          <button type="button" className="ws2-btn ws2-btn--go" onClick={onContinue} autoFocus>CONTINUE</button>
          <span className="ws2-board__dwell" aria-hidden><i /></span>
        </div>
      </aside>
    </div>
  );
}
