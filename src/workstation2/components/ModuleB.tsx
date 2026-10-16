import { useEffect, useMemo, useRef, useState } from 'react';
import { LAP_LABEL, POINTS_PER_SECTION, SECTIONS_PER_LAP, STATION2_CONFIG } from '../mockStation2Data';
import { fmt, fmtLoss, fmtMbps, itemPoints, metricsOf, neighbours, solveSection, verdictOf } from '../logic';
import { fmtLap, secondsFor, speedFor } from '../race';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import LeMansMap from './LeMansMap';
import { pillPositions, pillSize } from '../pills';
import Panel from './Panel';
import type { LapId, Section } from '../types';
import type { Track } from '../Station2';

export interface RouteSummary {
  practice: { pts: number; sec: number };
  qualifying: { pts: number; sec: number };
}

interface Props {
  /** The four runs of this attempt: 2 practice then 2 qualifying (logic.ts `pickSections`). */
  sections: readonly Section[];
  onScore: (total: number) => void;
  onDone: (summary: RouteSummary) => void;
  onShake: () => void;
  track: Track;
}

interface Tries { wrong: number; hint: HintLevel }
const LAPS: LapId[] = ['practice', 'qualifying'];
const PTS = POINTS_PER_SECTION;
const labelOf = (id: string) => (id === 'T' ? 'TWR' : id === 'P' ? 'PIT' : id);

const lapOf = (sections: readonly Section[], lap: LapId) => sections.filter((s) => s.lap === lap);
/** Lap time = sum over its sections of (km / speed earned by that section's points). Points only, never the clock. */
function lapSummary(sections: readonly Section[], lap: LapId, pts: Record<string, number>) {
  const secs = lapOf(sections, lap);
  const total = secs.reduce((n, s) => n + (pts[s.id] ?? 0), 0);
  const sec = secs.reduce((n, s) => n + secondsFor(s.km, (pts[s.id] ?? 0) / PTS), 0);
  return { pts: total, sec };
}

/** Module B: build the route from the trackside tower to the pit wall that meets every NEED line. 4 runs x 10 points. */
export default function ModuleB({ sections, onScore, onDone, onShake, track }: Props) {
  const PILLS = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, pillPositions(s)])), [sections]);
  const [si, setSi] = useState(0);
  const [route, setRoute] = useState<string[]>(['T']);
  const [pts, setPts] = useState<Record<string, number>>({});
  const [tries, setTries] = useState<Record<string, Tries>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({ kind: 'info', text: '' });
  const [bad, setBad] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const cb = useRef({ onDone, onScore });
  useEffect(() => { cb.current = { onDone, onScore }; });
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const sec: Section = sections[si];
  const lap = sec.lap;
  const pill = pillSize(sec);
  const t = tries[sec.id] ?? { wrong: 0, hint: 0 as HintLevel };
  const last = route[route.length - 1];
  const complete = last === 'P';
  const m = metricsOf(sec, route);
  const v = verdictOf(sec, m);
  const started = route.length > 1;
  const open = !busy && !complete ? neighbours(sec, last).filter((n) => !route.includes(n)) : [];
  const total = Object.values(pts).reduce((n, x) => n + x, 0);
  const onRoute = (a: string, b: string) => route.some((r, i) => i > 0 && ((route[i - 1] === a && r === b) || (route[i - 1] === b && r === a)));

  const patchTries = (p: Partial<Tries>) => setTries((all) => ({ ...all, [sec.id]: { ...t, ...p } }));

  const pick = (id: string) => {
    if (busy) return;
    const at = route.indexOf(id);
    if (at > 0) { setRoute(route.slice(0, at)); setMsg({ kind: 'info', text: '' }); return; }
    if (at === 0) { setRoute(['T']); return; }
    if (complete) return;
    if (!neighbours(sec, last).includes(id)) { setMsg({ kind: 'info', text: `NO BEAM ${labelOf(last)} TO ${labelOf(id)}` }); return; }
    setRoute([...route, id]);
    setMsg({ kind: 'info', text: '' });
  };

  const advance = (nextPts: Record<string, number>) => {
    const nextIdx = si + 1;
    if (nextIdx >= sections.length) {
      cb.current.onDone({ practice: lapSummary(sections, 'practice', nextPts), qualifying: lapSummary(sections, 'qualifying', nextPts) });
      return;
    }
    const reset = () => { setSi(nextIdx); setRoute(['T']); setMsg({ kind: 'info', text: '' }); setBusy(false); };
    if (sections[nextIdx].lap !== lap) {
      setBanner(`${LAP_LABEL[lap]} ${fmtLap(lapSummary(sections, lap, nextPts).sec)}`);
      later(() => { setBanner(null); reset(); }, 1700);
      return;
    }
    reset();
  };

  const commit = (hint: HintLevel, wrong: number) => {
    const earned = itemPoints(PTS, hint, wrong);
    const nextPts = { ...pts, [sec.id]: earned };
    setPts(nextPts);
    cb.current.onScore(Object.values(nextPts).reduce((n, x) => n + x, 0));
    setBusy(true);
    setMsg({ kind: 'ok', text: `+${fmt(earned, 1)} · ${Math.round(speedFor(earned / PTS))} km/h` });
    later(() => advance(nextPts), 1100);
  };

  const send = () => {
    if (busy || !complete) return;
    if (v.ok) { commit(t.hint, t.wrong); return; }
    patchTries({ wrong: t.wrong + 1 });
    const why = [
      !v.lat && `LATENCY ${Math.round(m.ms)} > ${sec.need.ms}`,
      !v.loss && `LOSS ${fmtLoss(m.loss)} > ${fmtLoss(sec.need.loss)}`,
      !v.bw && `BANDWIDTH ${fmtMbps(m.mbps)} < ${sec.need.mbps}`,
    ].filter(Boolean)[0] as string;
    setMsg({ kind: 'bad', text: `${why} · -${STATION2_CONFIG.wrongAnswerPenalty * 100}%` });
    setBad((n) => n + 1);
    track('B', 'wrong', `${sec.id} ${!v.lat ? 'LAT' : !v.loss ? 'LOSS' : 'BW'}`);
    onShake();
  };

  const hint = (next: 1 | 2) => {
    if (busy || t.hint >= next) return;
    track('B', 'hint', `${sec.id} H${next}`);
    if (next === 1) { patchTries({ hint: 1 }); return; }
    const sol = solveSection(sec);
    if (!sol) return;
    patchTries({ hint: 2 });
    setRoute(sol);
    setBusy(true);
    setMsg({ kind: 'info', text: 'AUTO-SENT · 0 PTS' });
    later(() => commit(2, t.wrong), 1000);
  };

  const hint1 = !complete
    ? 'Block 5: latency adds, loss compounds, bandwidth is the narrowest beam. Pick a route, then read the ticks.'
    : !v.lat
      ? 'Block 5: latency adds along the route. Use fewer or faster beams.'
      : !v.loss
        ? 'Block 5: loss compounds beam after beam. Avoid the lossy beam.'
        : !v.bw
          ? 'Block 5: bandwidth is the narrowest beam on the route. Raise the weakest one.'
          : 'Block 5: every NEED line passes. Send it.';

  const rows = [
    { id: 'lat', label: 'LATENCY', now: started ? `${Math.round(m.ms)} ms` : '--', need: `≤ ${sec.need.ms} ms`, ok: v.lat },
    { id: 'loss', label: 'LOSS', now: started ? fmtLoss(m.loss) : '--', need: `≤ ${fmtLoss(sec.need.loss)}`, ok: v.loss },
    ...(sec.need.mbps !== null ? [{ id: 'bw', label: 'BANDWIDTH', now: started ? `${fmtMbps(m.mbps)} M` : '--', need: `≥ ${sec.need.mbps} M`, ok: v.bw }] : []),
  ];
  const okCount = rows.filter((r) => r.ok).length;

  return (
    <section className="ws2-modB ws2-in" aria-label="Module B route builder">
      <div className="ws2-modhead">
        <b>MODULE B</b><span>ROUTES</span>
        <em>{fmt(total, 1)} / {STATION2_CONFIG.moduleMax.B}</em>
      </div>

      <div className="ws2-laptabs" role="list">
        {LAPS.map((l) => (
          <div key={l} role="listitem" className={`ws2-laptab ${l === lap ? 'is-now' : ''} ${lapOf(sections, l).every((s) => s.id in pts) ? 'is-done' : ''}`}>
            <b>{LAP_LABEL[l]}</b>
            <span className="ws2-laptab__pips" aria-label={`${lapOf(sections, l).filter((s) => s.id in pts).length} of ${SECTIONS_PER_LAP} runs done`}>
              {lapOf(sections, l).map((s) => <i key={s.id} className={s.id in pts ? 'on' : s.id === sec.id ? 'now' : ''} />)}
            </span>
          </div>
        ))}
      </div>

      <div className="ws2-bgrid">
        <div className="ws2-bmain">
          <Panel title="TOWER → PIT WALL" tag={`${LAP_LABEL[lap]} · RUN ${sec.index}`} className="ws2-bmap">
            <LeMansMap className={`ws2-map ${banner ? 'is-dim' : ''}`} label={`Route map, ${LAP_LABEL[lap]} run ${sec.index}`} names={false} faintLabels={false}>
              <g className="ws2-rb">
                {sec.beams.map((b) => {
                  const A = sec.nodes[b.a]; const B = sec.nodes[b.b];
                  const live = onRoute(b.a, b.b);
                  const next = (b.a === last && open.includes(b.b)) || (b.b === last && open.includes(b.a));
                  return (
                    <line key={`${b.a}${b.b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className={`ws2-beam ${live ? 'is-route' : ''} ${next ? 'is-next' : ''}`} />
                  );
                })}
                {sec.beams.map((b) => {
                  const at = PILLS[sec.id][`${b.a}${b.b}`];
                  const live = onRoute(b.a, b.b);
                  const oneLine = sec.need.mbps === null;
                  return (
                    <g key={`p${b.a}${b.b}`} transform={`translate(${at.x} ${at.y})`} className={`ws2-pill ${live ? 'is-route' : ''}`} aria-hidden>
                      <rect x={-pill.w / 2} y={-pill.h / 2} width={pill.w} height={pill.h} />
                      {oneLine ? (
                        <text y="5" textAnchor="middle">{b.ms}ms · {b.loss}%</text>
                      ) : (
                        <>
                          <text y="-3" textAnchor="middle">{b.ms}ms · {b.loss}%</text>
                          <text y="14" textAnchor="middle">{b.mbps}M</text>
                        </>
                      )}
                    </g>
                  );
                })}
                {Object.entries(sec.nodes).map(([id, p]) => {
                  const inRoute = route.includes(id);
                  const isNext = open.includes(id);
                  const w = id === 'T' || id === 'P' ? 58 : 38;
                  return (
                    <g
                      key={`${sec.id}${id}`} transform={`translate(${p.x} ${p.y})`}
                      className={`ws2-node ${inRoute ? 'is-route' : ''} ${isNext ? 'is-next' : ''} ${id === 'T' ? 'is-tower' : ''} ${id === 'P' ? 'is-pit' : ''} ${complete && id === 'P' ? 'is-hit' : ''}`}
                      role="button" tabIndex={busy ? -1 : 0}
                      aria-label={`${id === 'T' ? `Tower ${sec.name}` : id === 'P' ? 'Pit wall' : `Relay ${id}`}${inRoute ? ', on route' : isNext ? ', next' : ''}`}
                      onClick={() => pick(id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id); } }}
                    >
                      <rect x={-w / 2 - 5} y="-23" width={w + 10} height="46" className="ws2-node__hit" />
                      {isNext && <rect x={-w / 2 - 5} y="-22" width={w + 10} height="44" className="ws2-node__ring" />}
                      <rect x={-w / 2} y="-17" width={w} height="34" className="ws2-node__box" />
                      <text y="5.5" textAnchor="middle" className="ws2-node__txt">{labelOf(id)}</text>
                    </g>
                  );
                })}
              </g>
            </LeMansMap>
            {banner && <div className="ws2-lapbanner" role="status"><small>LAP DONE</small><b>{banner}</b></div>}
          </Panel>

          <div className="ws2-bact">
            <button type="button" className="ws2-btn ws2-btn--ghost" onClick={() => pick('T')} disabled={busy || !started}>CLEAR</button>
            <button type="button" className={`ws2-btn ws2-btn--send ${complete && v.ok ? 'is-ready' : ''}`} onClick={send} disabled={busy || !complete}>SEND</button>
            <span className={`ws2-bact__msg is-${msg.kind}`} role="status" key={bad}>{msg.text || ' '}</span>
          </div>
        </div>

        <aside className="ws2-bside">
          <Panel title="NOW vs NEED" tag={complete ? 'ROUTE' : started ? 'SO FAR' : 'PICK A BEAM'} className={`ws2-btotals ${complete && v.ok ? 'is-met' : ''}`}>
            <div className="ws2-route" aria-label="Route">
              {route.map((id, i) => (
                <span key={id} className={id === 'P' ? 'is-end' : ''}>{i > 0 && <i aria-hidden>→</i>}{labelOf(id)}</span>
              ))}
            </div>
            <ul className="ws2-crows" key={bad}>
              <li className="ws2-crows__head" aria-hidden><span>NOW</span><span>NEED</span><span /></li>
              {rows.map((r) => (
                <li key={r.id} className={started ? (r.ok ? 'ok' : 'bad') : 'idle'}>
                  <span className="ws2-crows__cell"><small>{r.label}</small><b className="ws2-crows__now">{r.now}</b></span>
                  <span className="ws2-crows__need">{r.need}</span>
                  <span className="ws2-crows__tick" role="img" aria-label={!started ? 'no route yet' : r.ok ? 'met' : 'not met'}>{!started ? '·' : r.ok ? '✓' : '✕'}</span>
                </li>
              ))}
            </ul>
            <div className={`ws2-bstate ${complete && v.ok ? 'ok' : 'bad'}`}>
              <b>{started ? `${okCount}/${rows.length}` : `0/${rows.length}`}</b>
              <span>{complete && v.ok ? 'SEND' : complete ? 'FIX' : 'BUILD'}</span>
            </div>
          </Panel>
        </aside>
      </div>

      <HintDock
        level={t.hint}
        itemLabel={`${LAP_LABEL[lap]} run ${sec.index}`}
        hint1Text={hint1}
        hint2Text="A valid route was sent for you. This section scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={busy}
        onHint={hint}
      />
    </section>
  );
}
