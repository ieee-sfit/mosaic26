import { useEffect, useRef, useState } from 'react';
import { CIRCUITS, STATION2_CONFIG } from '../mockStation2Data';
import { anchorsOf, checkLock, fmt, itemPoints, neighbours, solveTower } from '../logic';
import type { Plan } from '../logic';
import type { Tower } from '../types';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import Panel from './Panel';
import LeMansMap from './LeMansMap';
import type { Track } from '../Station2';

interface Props {
  onScore: (total: number) => void;
  onDone: () => void;
  onShake: () => void;
  track: Track;
}

interface TState { ch: string | null; wrong: number; struck: string[]; hint: HintLevel; pts: number }
const fresh = (): TState => ({ ch: null, wrong: 0, struck: [], hint: 0, pts: 0 });

const SCORED = CIRCUITS.reduce((n, c) => n + c.towers.filter((t) => !t.anchor).length, 0);
const PER_TOWER = STATION2_CONFIG.moduleMax.B / SCORED;
const short = (ch: string) => ch.replace('CH-', '');

const REASON = {
  unsupported: (ch: string) => `${ch} IS NOT ON THE SHEET`,
  clash: (_ch: string, w?: string) => `CLASH WITH ${w}`,
  dead: () => 'DEAD END: BLOCKS ANOTHER TOWER',
} as const;

/** Module B: give every relay tower a channel. Linked towers may not share one. Any valid plan scores. */
export default function ModuleB({ onScore, onDone, onShake, track }: Props) {
  const [ci, setCi] = useState(0);
  const circuit = CIRCUITS[ci];
  const [tw, setTw] = useState<Record<string, TState>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({ kind: 'info', text: '' });
  const [bad, setBad] = useState<{ n: number; a: string; b?: string } | null>(null);
  const [cleared, setCleared] = useState(false);
  const timers = useRef<number[]>([]);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const key = (t: Tower) => `${circuit.id}:${t.id}`;
  const get = (t: Tower): TState => tw[key(t)] ?? fresh();
  const scored = circuit.towers.filter((t) => !t.anchor);
  const open = scored.filter((t) => !get(t).ch);
  const cur = open.find((t) => t.id === sel) ?? open[0] ?? null;
  const curState = cur ? get(cur) : null;
  const total = Object.values(tw).reduce((n, x) => n + x.pts, 0);

  const plan: Plan = { ...anchorsOf(circuit) };
  for (const t of scored) { const c = get(t).ch; if (c) plan[t.id] = c; }
  const lockedCount = scored.length - open.length;

  // advance to the next circuit (or finish) once everything is locked
  useEffect(() => {
    if (!cleared) return undefined;
    const t = window.setTimeout(() => {
      if (ci + 1 < CIRCUITS.length) { setCi(ci + 1); setSel(null); setCleared(false); setMsg({ kind: 'info', text: '' }); }
      else doneRef.current();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [cleared, ci]);

  const commit = (t: Tower, ch: string, hint: HintLevel, wrong: number) => {
    const pts = itemPoints(PER_TOWER, hint, wrong);
    setTw((all) => ({ ...all, [key(t)]: { ...(all[key(t)] ?? fresh()), ch, hint, wrong, pts } }));
    onScore(total + pts);
    setMsg({ kind: 'ok', text: `${t.id} LOCKED ${ch} · +${fmt(pts, 1)}` });
    setBad(null);
    const left = open.filter((o) => o.id !== t.id);
    setSel(left[0]?.id ?? null);
    if (!left.length) later(() => setCleared(true), 400);
  };

  const press = (ch: string) => {
    if (!cur || !curState || cleared) return;
    const res = checkLock(circuit, plan, cur.id, ch);
    if (res.ok) { commit(cur, ch, curState.hint, curState.wrong); return; }
    setTw((all) => ({ ...all, [key(cur)]: { ...curState, wrong: curState.wrong + 1, struck: [...curState.struck, ch] } }));
    setMsg({ kind: 'bad', text: res.reason === 'clash' ? REASON.clash(ch, res.with) : res.reason === 'dead' ? REASON.dead() : REASON.unsupported(ch) });
    setBad({ n: Date.now(), a: cur.id, b: res.reason === 'clash' ? res.with : undefined });
    track('B', 'wrong', `${cur.id} ${res.reason.toUpperCase()}`);
    onShake();
    later(() => setBad(null), 900);
  };

  const hint = (next: 1 | 2) => {
    if (!cur || !curState || cleared || curState.hint >= next) return;
    track('B', 'hint', `${cur.id} H${next}`);
    if (next === 1) { setTw((all) => ({ ...all, [key(cur)]: { ...curState, hint: 1 } })); return; }
    const ch = solveTower(circuit, plan, cur.id);
    if (ch) commit(cur, ch, 2, curState.wrong);
  };

  const linkedToCur = cur ? neighbours(circuit, cur.id) : [];
  const hinted = !!curState && curState.hint >= 1;
  const byId = (id: string) => circuit.towers.find((t) => t.id === id) as Tower;

  return (
    <section className="ws2-modB ws2-in" aria-label="Module B relay towers">
      <div className="ws2-modhead">
        <b>MODULE B</b><span>RELAY TOWERS</span>
        <em>{fmt(total, 1)} / {STATION2_CONFIG.moduleMax.B}</em>
      </div>

      <div className="ws2-modB__grid">
        <div className="ws2-modB__main">
          <Panel title={`CIRCUIT ${ci + 1}/${CIRCUITS.length}`} tag={`${lockedCount}/${scored.length} LOCKED`} className="ws2-mapplate">
            <LeMansMap className={`ws2-map ${cleared ? 'is-cleared' : ''}`} label="Relay tower map">

              {circuit.links.map(([a, b]) => {
                const A = byId(a); const B = byId(b);
                const both = !!plan[a] && !!plan[b];
                const focus = cur && (a === cur.id || b === cur.id);
                const flash = bad && bad.b && ((bad.a === a && bad.b === b) || (bad.a === b && bad.b === a));
                return (
                  <line
                    key={`${a}${b}${flash ? bad?.n : ''}`} x1={A.x} y1={A.y - 12} x2={B.x} y2={B.y - 12}
                    className={`ws2-link ${both ? 'is-both' : ''} ${focus ? 'is-focus' : ''} ${flash ? 'is-bad' : ''}`}
                  />
                );
              })}

              {circuit.towers.map((t) => {
                const s = t.anchor ? null : get(t);
                const ch = t.anchor ?? s?.ch ?? null;
                const isSel = cur?.id === t.id;
                const ring = hinted && linkedToCur.includes(t.id);
                const flash = bad && bad.a === t.id;
                return (
                  <g
                    key={`${t.id}${flash ? bad?.n : ''}`} transform={`translate(${t.x} ${t.y})`}
                    className={`ws2-tower ${ch ? 'is-lit' : ''} ${isSel ? 'is-sel' : ''} ${t.anchor ? 'is-anchor' : ''} ${ring ? 'is-ring' : ''} ${flash ? 'is-bad' : ''}`}
                    role="button" tabIndex={t.anchor || ch ? -1 : 0}
                    aria-label={`Tower ${t.id} ${t.label}${ch ? `, ${ch}` : ''}`}
                    onClick={() => { if (!t.anchor && !ch) setSel(t.id); }}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !t.anchor && !ch) setSel(t.id); }}
                  >
                    <rect x="-26" y="-52" width="52" height="52" className="ws2-tower__halo" />
                    <rect x="-30" y="-56" width="60" height="60" className="ws2-tower__pulse" />
                    <path d="M -9 12 L 0 -22 L 9 12 Z" className="ws2-tower__mast" />
                    <path d="M -6 2 L 6 2 M -4 -8 L 4 -8" className="ws2-tower__bars" />
                    <rect x="-8" y="-38" width="16" height="16" className="ws2-tower__lamp" />
                    <rect x="-40" y="16" width="80" height="24" className="ws2-tower__plate" />
                    <text y="33" textAnchor="middle" className="ws2-tower__txt">{t.id} · {ch ? short(ch) : '--'}</text>
                    {t.anchor && <text y="58" textAnchor="middle" className="ws2-tower__anchor">ANCHOR</text>}
                    <rect x="-44" y="-56" width="88" height="116" className="ws2-tower__hit" />
                  </g>
                );
              })}
            </LeMansMap>
          </Panel>

          <div className="ws2-keys" role="group" aria-label="Channel">
            <span className="ws2-keys__for">{cur ? <>TOWER <b>{cur.id}</b></> : 'DONE'}</span>
            {circuit.channels.map((ch) => {
              const struck = !!curState?.struck.includes(ch);
              return (
                <button key={ch} type="button" className={`ws2-key ${struck ? 'is-struck' : ''}`} disabled={!cur || struck || cleared} onClick={() => press(ch)}>
                  {ch}
                </button>
              );
            })}
            <span className={`ws2-keys__msg is-${msg.kind}`} role="status">{msg.text || ' '}</span>
          </div>
        </div>

        <aside className="ws2-modB__side">
          <div className="ws2-rule" aria-label="Rule: linked towers must use different channels">
            <div><span className="ws2-chip">03</span><i className="ws2-rule__link" /><span className="ws2-chip">03</span><b className="is-no">✕</b></div>
            <div><span className="ws2-chip">03</span><i className="ws2-rule__link" /><span className="ws2-chip">07</span><b className="is-yes">✓</b></div>
            <p>LINKED = DIFFERENT</p>
          </div>

          <div className="ws2-sheet ws2-sheet--tower">
            <header className="ws2-sheet__head"><b>TOWER SHEET</b><span>ALLOWED CHANNELS</span></header>
            <table>
              <tbody>
                {circuit.towers.map((t) => {
                  const s = t.anchor ? null : get(t);
                  const ch = t.anchor ?? s?.ch ?? null;
                  const isCur = cur?.id === t.id;
                  return (
                    <tr
                      key={t.id}
                      className={`${isCur ? 'is-cur' : ''} ${isCur && hinted ? 'is-hint' : ''} ${ch ? 'is-done' : ''}`}
                      onClick={() => { if (!t.anchor && !ch) setSel(t.id); }}
                    >
                      <th>{t.id}</th>
                      <td className="ws2-sheet__sector">{t.label}</td>
                      <td className="ws2-sheet__allowed">
                        {t.anchor
                          ? <span className="ws2-chip is-set">{short(t.anchor)} · LOCKED</span>
                          : t.allowed.map((a) => <span key={a} className={`ws2-chip ${ch === a ? 'is-set' : ''}`}>{short(a)}</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </aside>
      </div>

      <HintDock
        level={curState?.hint ?? 0}
        itemLabel={cur ? `${circuit.name} · ${cur.id}` : 'CIRCUIT CLEARED'}
        hint1Text={cur ? `Read the sheet row for ${cur.id}, then check the channels of the towers linked to it.` : ''}
        hint2Text="A valid channel was locked for you. This tower scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={!cur || cleared}
        onHint={hint}
      />
    </section>
  );
}
