import { useEffect, useRef, useState } from 'react';
import { BALANCER_DEFAULTS, QUALITY_PROFILES, STATION2_CONFIG, STINTS } from '../mockStation2Data';
import { fmt, itemPoints, pctOf, simulate, solveStint } from '../logic';
import type { Controls } from '../logic';
import { fmtLap, lapSeconds } from '../race';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import Gauge from './Gauge';
import Panel from './Panel';
import type { Track } from '../Station2';

interface Props {
  /** Grid slot earned in qualifying, shown as a badge. */
  grid: number | null;
  onScore: (total: number) => void;
  /** Called each time a lap is banked, with that lap's points. */
  onLap: (lapPoints: number) => void;
  onGaskets: (left: number) => void;
  onForfeit: () => void;
  onFinish: () => void;
  onShake: () => void;
  onFlash: () => void;
  track: Track;
}

const PER_STINT = STATION2_CONFIG.moduleMax.C / STINTS.length;
const GASKETS = STATION2_CONFIG.gasketPips;
const IDLE_S = STATION2_CONFIG.idleLimitMs / 1000;
const LIMIT = STATION2_CONFIG.utilLimit;
const STOPS = QUALITY_PROFILES.length;
const HOP = STATION2_CONFIG.relayHopMs;

/** Module C: three race laps. Meet the CONTRACT (latency, worst node, quality) on each lap, then commit. */
export default function ModuleC({ grid, onScore, onLap, onGaskets, onForfeit, onFinish, onShake, onFlash, track }: Props) {
  const [idx, setIdx] = useState(0);
  const [ctl, setCtl] = useState<Controls>({ ...BALANCER_DEFAULTS });
  const [gaskets, setGaskets] = useState(GASKETS);
  const [idle, setIdle] = useState(0);
  const [earned, setEarned] = useState(0);
  const [laps, setLaps] = useState<{ pts: number; sec: number }[]>([]);
  const [wrongs, setWrongs] = useState<Record<string, number>>({});
  const [hints, setHints] = useState<Record<string, HintLevel>>({});
  const [solving, setSolving] = useState(false);
  const [over, setOver] = useState<'none' | 'won' | 'lost'>('none');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({ kind: 'info', text: '' });
  const [slam, setSlam] = useState(0);

  const stint = STINTS[idx];
  const sim = simulate(stint, ctl);
  const level: HintLevel = hints[stint.id] ?? 0;
  const busy = solving || over !== 'none';

  // mirrors for the 1s idle timer (written in effects only)
  const live = useRef({ locked: false, busy: false, idle: 0, gaskets: GASKETS });
  const cb = useRef({ onForfeit, onShake, onFlash, onGaskets, track, idx });
  useEffect(() => {
    live.current.locked = sim.locked;
    live.current.busy = busy;
    cb.current = { onForfeit, onShake, onFlash, onGaskets, track, idx };
  });

  const blow = (why: string, wrongTry: boolean) => {
    const l = live.current;
    const id = STINTS[cb.current.idx].id;
    l.gaskets -= 1;
    l.idle = 0;
    setGaskets(l.gaskets);
    setIdle(0);
    setSlam((n) => n + 1);
    if (wrongTry) setWrongs((w) => ({ ...w, [id]: (w[id] ?? 0) + 1 }));
    cb.current.onGaskets(l.gaskets);
    cb.current.onShake();
    cb.current.onFlash();
    cb.current.track('C', 'wrong', `L${cb.current.idx + 1} ${why}`);
    if (l.gaskets <= 0) {
      setOver('lost');
      setMsg({ kind: 'bad', text: 'ALL GASKETS BLOWN' });
    } else {
      setMsg({ kind: 'bad', text: `${why} · GASKET BLOWN · ${l.gaskets} LEFT${wrongTry ? ' · -20%' : ''}` });
    }
  };

  useEffect(() => {
    const t = window.setInterval(() => {
      const l = live.current;
      if (l.busy) return;
      if (l.locked) { l.idle = 0; setIdle(0); return; }
      l.idle += 1;
      if (l.idle >= IDLE_S) blow('OVERHEAT', false);
      else setIdle(l.idle);
    }, 1000);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (over !== 'lost') return undefined;
    const t = window.setTimeout(() => cb.current.onForfeit(), 2200);
    return () => window.clearTimeout(t);
  }, [over]);

  const touch = (p: Partial<Controls>) => {
    if (busy) return;
    live.current.idle = 0;
    setIdle(0);
    setCtl({ ...ctl, ...p });
  };

  const bank = (lv: HintLevel) => {
    const gain = itemPoints(PER_STINT, lv, wrongs[stint.id] ?? 0);
    const total = Math.round((earned + gain) * 100) / 100;
    const sec = lapSeconds(gain / PER_STINT);
    setEarned(total);
    setLaps((l) => [...l, { pts: gain, sec }]);
    onScore(total);
    onLap(gain);
    live.current.idle = 0;
    setIdle(0);
    setSolving(false);
    if (idx === STINTS.length - 1) {
      setOver('won');
      setMsg({ kind: 'ok', text: `LAP ${idx + 1} ${fmtLap(sec)} · CHEQUERED FLAG` });
      window.setTimeout(onFinish, 1500);
    } else {
      setIdx(idx + 1);
      setCtl({ ...BALANCER_DEFAULTS });
      setMsg({ kind: 'ok', text: `LAP ${idx + 1} ${fmtLap(sec)} · +${fmt(gain, 1)}` });
    }
  };

  // Hint 2: let the player watch the needles settle, then commit
  useEffect(() => {
    if (!solving) return undefined;
    const t = window.setTimeout(() => bank(2), 1300);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solving]);

  const commit = () => {
    if (busy) return;
    if (!sim.locked) { blow('NOT MET', true); return; }
    bank(level);
  };

  const hint = (next: 1 | 2) => {
    if (busy || level >= next) return;
    setHints({ ...hints, [stint.id]: next });
    track('C', 'hint', `L${idx + 1} H${next}`);
    if (next === 2) {
      const sol = solveStint(stint);
      if (sol) { setCtl(sol); setSolving(true); setMsg({ kind: 'info', text: 'AUTO-SET · 0 PTS' }); }
    }
  };

  const hint1 = !sim.capacityOk
    ? 'Block 6: a node is over 80%. Move the split, or send the spike to BACKUP RELAY.'
    : !sim.latencyOk
      ? 'Block 6: latency is over the limit. Step quality down or turn the relay off.'
      : !sim.qualityOk
        ? 'Block 6: quality is under the contract. Step it up, then recheck load.'
        : 'Block 6: all three lines pass. Commit.';

  const heat = sim.locked ? 0 : Math.min(1, idle / IDLE_S);
  const spikeNode = ctl.divert ? 'arnage' : stint.spikeTarget;
  const okCount = [sim.latencyOk, sim.capacityOk, sim.qualityOk].filter(Boolean).length;
  const prof = QUALITY_PROFILES[ctl.qualityIdx];
  const worstProf = QUALITY_PROFILES[stint.worstQualityIdx];
  const rows = [
    { id: 'lat', label: 'LATENCY', now: `${sim.latency} ms`, need: `< ${stint.latencyLimitMs} ms`, ok: sim.latencyOk },
    { id: 'load', label: 'WORST NODE', now: `${sim.worstPct}%`, need: `< ${Math.round(LIMIT * 100)}%`, ok: sim.capacityOk },
    { id: 'q', label: 'QUALITY', now: prof.label, need: `≥ ${worstProf.label}`, ok: sim.qualityOk },
  ];
  const bestLap = laps.length ? Math.min(...laps.map((l) => l.sec)) : null;
  // Allowed zone on the quality slider: stops 0..worst are allowed. The thumb centre travels 10px..(W-10px).
  const zoneF = stint.worstQualityIdx / (STOPS - 1);
  const zoneEdge = `calc(${zoneF * 100}% + ${20 - 20 * zoneF}px)`;

  return (
    <section className={`ws2-modC ws2-in ${slam ? 'is-slam' : ''}`} aria-label="Module C race">
      <div className="ws2-modhead">
        <b>MODULE C</b><span>RACE</span>
        <em>{fmt(earned, 1)} / {STATION2_CONFIG.moduleMax.C}</em>
      </div>

      <div className="ws2-cstrip">
        <ol className="ws2-stints">
          {STINTS.map((s, i) => {
            const done = i < laps.length;
            const best = done && bestLap !== null && laps[i].sec === bestLap && laps.length > 1;
            const now = !done && i === idx && over !== 'won';
            return (
              <li key={s.id} className={done ? 'is-done' : now ? 'is-now' : ''}>
                <b>LAP {i + 1} · {s.name}</b>
                <span>{done ? `${fmtLap(laps[i].sec)}${best ? ' ★' : ''}` : now ? 'LIVE' : '--:--.---'}</span>
              </li>
            );
          })}
        </ol>
        <div className="ws2-grid-badge" aria-label={grid ? `Grid position ${grid}` : 'No grid position'}>
          <small>GRID</small><b>{grid ? `P${grid}` : '--'}</b>
        </div>
        <div className={`ws2-gaskets ${gaskets <= 1 && over === 'none' ? 'is-last' : ''}`} aria-label={`${gaskets} of ${GASKETS} gaskets left`}>
          <small>GASKETS</small>
          {Array.from({ length: GASKETS }, (_, i) => (
            <svg key={i} viewBox="0 0 32 32" className={i < gaskets ? 'is-ok' : 'is-blown'}>
              <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" />
              <circle cx="16" cy="16" r="6" />
              {i >= gaskets && <path d="M 8 8 L 24 24 M 24 8 L 8 24" />}
            </svg>
          ))}
        </div>
      </div>

      <div className="ws2-cgrid">
        <div className="ws2-cleft">
          <Panel title="NODES" tag={stint.tag} className="ws2-cluster">
            <div className="ws2-cluster__row">
              {sim.nodes.map((n) => (
                <Gauge
                  key={n.id} value={n.util} limitAt={LIMIT} limitLines={['80%', 'LIMIT']} label={n.label}
                  readout={`${pctOf(n.util)}%`} active={n.active} alert={n.active && n.util >= LIMIT}
                  badge={spikeNode === n.id ? `SPIKE +${stint.spikeM}M` : undefined}
                />
              ))}
            </div>
          </Panel>

          <Panel className="ws2-ctrl">
            <div className="ws2-ctrl__row">
              <div className="ws2-ctl">
                <label htmlFor="ws2-split">LOAD SPLIT</label>
                <input id="ws2-split" type="range" min={0} max={100} step={1} value={ctl.split} disabled={busy}
                  onChange={(e) => touch({ split: Number(e.target.value) })} />
                <div className="ws2-ctl__scale"><span>MULSANNE {ctl.split}</span><span>{100 - ctl.split} PIT</span></div>
              </div>

              <div className="ws2-ctl">
                <label htmlFor="ws2-quality">QUALITY</label>
                <div className="ws2-qz">
                  <i className="ws2-qz__ok" style={{ width: zoneEdge }} aria-hidden />
                  <i className="ws2-qz__no" style={{ left: zoneEdge }} aria-hidden />
                  <input id="ws2-quality" type="range" min={0} max={STOPS - 1} step={1} value={ctl.qualityIdx} disabled={busy}
                    onChange={(e) => touch({ qualityIdx: Number(e.target.value) })} />
                </div>
                <div className="ws2-ctl__scale ws2-ctl__ticks">
                  {QUALITY_PROFILES.map((p, i) => (
                    <button key={p.id} type="button" disabled={busy} className={`${i === ctl.qualityIdx ? 'on' : ''} ${i > stint.worstQualityIdx ? 'is-no' : ''}`} onClick={() => touch({ qualityIdx: i })}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="ws2-ctl ws2-ctl--sw">
                <span id="ws2-relay-lbl">BACKUP RELAY</span>
                <button type="button" role="switch" aria-checked={ctl.divert} aria-labelledby="ws2-relay-lbl" disabled={busy}
                  className={`ws2-switch ${ctl.divert ? 'on' : ''}`} onClick={() => touch({ divert: !ctl.divert })}>
                  <i /><b>{ctl.divert ? 'ON' : 'OFF'}</b>
                </button>
                <small className="ws2-ctl__cost">+{HOP} ms</small>
              </div>
            </div>

            <div className="ws2-ctrl__foot">
              <span className="ws2-heat" aria-label="Engine heat"><small>HEAT</small><span className="ws2-heat__bar"><i style={{ transform: `scaleX(${heat})` }} /></span></span>
              <span className={`ws2-ctrl__msg is-${msg.kind}`} role="status">{msg.text || ' '}</span>
              <button type="button" className={`ws2-btn ws2-btn--commit ${sim.locked ? 'is-ready' : ''}`} onClick={commit} disabled={busy}>
                COMMIT
              </button>
            </div>
          </Panel>
        </div>

        <Panel title="CONTRACT" tag={stint.tag} className={`ws2-contract ${sim.locked ? 'is-met' : ''}`}>
          <ul className="ws2-crows">
            <li className="ws2-crows__head" aria-hidden><span /><span>NOW</span><span>NEED</span><span /></li>
            {rows.map((r) => (
              <li key={r.id} className={r.ok ? 'ok' : 'bad'}>
                <span className="ws2-crows__lbl">{r.label}</span>
                <b className="ws2-crows__now">{r.now}</b>
                <span className="ws2-crows__need">{r.need}</span>
                <span className="ws2-crows__tick" role="img" aria-label={r.ok ? 'met' : 'not met'}>{r.ok ? '✓' : '✕'}</span>
              </li>
            ))}
          </ul>
          <div className="ws2-cdial">
            <Gauge
              value={sim.latency / (stint.latencyLimitMs * 1.5)} limitAt={1 / 1.5}
              limitLines={['LIMIT', String(stint.latencyLimitMs)]} label="LATENCY" readout={`${sim.latency} ms`}
              alert={!sim.latencyOk} ends={['0', String(Math.round(stint.latencyLimitMs * 1.5))]}
            />
            <div className={`ws2-cstate ${sim.locked ? 'ok' : 'bad'}`}>
              <b>{okCount}/3</b>
              <span>{sim.locked ? 'COMMIT' : 'FIX'}</span>
            </div>
          </div>
        </Panel>
      </div>

      <HintDock
        level={level}
        itemLabel={`LAP ${idx + 1}/${STINTS.length}`}
        hint1Text={hint1}
        hint2Text="The balancer was set for you and committed. This lap scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={busy}
        onHint={hint}
      />
    </section>
  );
}
