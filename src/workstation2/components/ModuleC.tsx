import { useEffect, useRef, useState } from 'react';
import { BALANCER_DEFAULTS, QUALITY_PROFILES, STATION2_CONFIG } from '../mockStation2Data';
import { fmt, itemPoints, pctOf, relayBreaks, safeBands, simulate, solveStint } from '../logic';
import type { Controls } from '../logic';
import { fmtLap, lapSeconds } from '../race';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import Gauge from './Gauge';
import Panel from './Panel';
import { QualityControl, RelayControl, SplitControl } from './BalancerControls';
import type { Stint } from '../types';
import type { Track } from '../Station2';

interface Props {
  /** The three laps of this run (one authored variant per lap, picked by the run's seed). */
  stints: Stint[];
  /** Grid slot earned in qualifying, shown as a badge. */
  grid: number | null;
  onScore: (total: number) => void;
  /** Called each time a lap is banked, with that lap's points. */
  onLap: (lapPoints: number) => void;
  /** Called the moment the last lap is banked, so the shift clock stops there (the speed bonus is frozen at this instant). */
  onCleared: () => void;
  onFinish: () => void;
  onShake: () => void;
  onFlash: () => void;
  track: Track;
}

const LIMIT = STATION2_CONFIG.utilLimit;
const HOP = STATION2_CONFIG.relayHopMs;
const WRONG_PCT = Math.round(STATION2_CONFIG.wrongAnswerPenalty * 100);

/**
 * Module C: three race laps. Meet the CONTRACT (latency, worst node, quality) on each lap, then commit.
 * No gaskets and no heat: a COMMIT that does not meet the contract just costs 20% of the lap and you try again.
 * Only the shared shift clock can end this module badly.
 */
export default function ModuleC({ stints, grid, onScore, onLap, onCleared, onFinish, onShake, onFlash, track }: Props) {
  const [idx, setIdx] = useState(0);
  const [ctl, setCtl] = useState<Controls>({ ...BALANCER_DEFAULTS });
  const [earned, setEarned] = useState(0);
  const [laps, setLaps] = useState<{ pts: number; sec: number }[]>([]);
  const [wrongs, setWrongs] = useState<Record<string, number>>({});
  const [hints, setHints] = useState<Record<string, HintLevel>>({});
  const [solving, setSolving] = useState(false);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({ kind: 'info', text: '' });
  const [slam, setSlam] = useState(0);
  const finishTimer = useRef<number | null>(null);
  useEffect(() => () => { if (finishTimer.current) window.clearTimeout(finishTimer.current); }, []);

  const perStint = STATION2_CONFIG.moduleMax.C / stints.length;
  const stint = stints[idx];
  const sim = simulate(stint, ctl);
  const level: HintLevel = hints[stint.id] ?? 0;
  const busy = solving || over;
  const rb = relayBreaks(stint, ctl);

  const touch = (p: Partial<Controls>) => {
    if (busy) return;
    setCtl({ ...ctl, ...p });
  };

  const bank = (lv: HintLevel) => {
    const gain = itemPoints(perStint, lv, wrongs[stint.id] ?? 0);
    const total = Math.round((earned + gain) * 100) / 100;
    const sec = lapSeconds(gain / perStint);
    setEarned(total);
    setLaps((l) => [...l, { pts: gain, sec }]);
    onScore(total);
    onLap(gain);
    setSolving(false);
    if (idx === stints.length - 1) {
      setOver(true);
      setMsg({ kind: 'ok', text: `LAP ${idx + 1} ${fmtLap(sec)} · CHEQUERED FLAG` });
      onCleared();
      finishTimer.current = window.setTimeout(onFinish, 1500);
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

  /** Which lines fail, as one short phrase. A relay that makes it fail is named first. */
  const whyNot = () => {
    if (rb === 'latency') return `RELAY ADDS ${HOP} MS`;
    if (rb === 'load') return 'RELAY OVER 80%';
    const bad = [!sim.latencyOk && 'LATENCY', !sim.capacityOk && 'LOAD', !sim.qualityOk && 'QUALITY'].filter(Boolean);
    return bad.join(' + ');
  };

  const commit = () => {
    if (busy) return;
    if (!sim.locked) {
      setWrongs((w) => ({ ...w, [stint.id]: (w[stint.id] ?? 0) + 1 }));
      setSlam((n) => n + 1);
      onShake();
      onFlash();
      track('C', 'wrong', `L${idx + 1} NOT MET`);
      setMsg({ kind: 'bad', text: `NOT MET · ${whyNot()} · -${WRONG_PCT}%` });
      return;
    }
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

  const hint1 = rb === 'latency'
    ? `The relay is what breaks it: it adds ${HOP} ms and is optional. Switch it off.`
    : rb === 'load'
      ? 'The relay mast is over 80%. It is optional: switch it off, or move the split.'
      : !sim.capacityOk
        ? 'A node is over 80%. Move the split. The backup relay can take the spike, but it is optional.'
        : !sim.latencyOk
          ? `Latency is over the limit. Step quality down${ctl.divert ? `, or switch the relay off (it adds ${HOP} ms)` : ''}.`
          : !sim.qualityOk
            ? 'Quality is under the contract. Step it up, then recheck load.'
            : 'All three lines pass. Commit.';

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
  // Green band on the load-split slider: every split that meets the WHOLE contract for the quality and relay setting chosen now.
  const bands = safeBands(stint, ctl.qualityIdx, ctl.divert);

  return (
    <section className={`ws2-modC ws2-in ${slam ? 'is-slam' : ''}`} aria-label="Module C race">
      <div className="ws2-modhead">
        <b>MODULE C</b><span>RACE</span>
        <em>{fmt(earned, 1)} / {STATION2_CONFIG.moduleMax.C}</em>
      </div>

      <div className="ws2-cstrip">
        <ol className="ws2-stints">
          {stints.map((s, i) => {
            const done = i < laps.length;
            const best = done && bestLap !== null && laps[i].sec === bestLap && laps.length > 1;
            const now = !done && i === idx && !over;
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
              <SplitControl ctl={ctl} bands={bands} qualityOk={sim.qualityOk} busy={busy} onChange={(split) => touch({ split })} />
              <QualityControl stint={stint} ctl={ctl} busy={busy} onChange={(qualityIdx) => touch({ qualityIdx })} />
              <RelayControl ctl={ctl} busy={busy} onToggle={() => touch({ divert: !ctl.divert })} />
            </div>

            <div className="ws2-ctrl__foot">
              <span className={`ws2-ctrl__msg is-${msg.kind}`} role="status">{msg.text || ' '}</span>
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
          <p className={`ws2-relaynote ${rb ? 'on' : ''}`} role="status" data-relay-break={rb ?? ''}>
            {rb === 'latency' ? `RELAY ADDS ${HOP} MS` : rb === 'load' ? 'RELAY MAST OVER 80%' : ' '}
          </p>
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
        itemLabel={`LAP ${idx + 1}/${stints.length}`}
        hint1Text={hint1}
        hint2Text="The balancer was set for you and committed. This lap scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={busy}
        onHint={hint}
      />
    </section>
  );
}
