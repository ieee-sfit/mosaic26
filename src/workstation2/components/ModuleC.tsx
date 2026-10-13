import { useEffect, useRef, useState } from 'react';
import { BALANCER_DEFAULTS, QUALITY_PROFILES, STATION2_CONFIG, STINTS } from '../mockStation2Data';
import { fmt, itemPoints, simulate, solveStint } from '../logic';
import type { Controls } from '../logic';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import Gauge from './Gauge';
import Panel from './Panel';
import type { Track } from '../Station2';

interface Props {
  onScore: (total: number) => void;
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

/** Module C: balance three nodes with sliders and a relay switch. Blown gaskets end the run. */
export default function ModuleC({ onScore, onGaskets, onForfeit, onFinish, onShake, onFlash, track }: Props) {
  const [idx, setIdx] = useState(0);
  const [ctl, setCtl] = useState<Controls>({ ...BALANCER_DEFAULTS });
  const [gaskets, setGaskets] = useState(GASKETS);
  const [idle, setIdle] = useState(0);
  const [earned, setEarned] = useState(0);
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

  const blow = (why: string) => {
    const l = live.current;
    l.gaskets -= 1;
    l.idle = 0;
    setGaskets(l.gaskets);
    setIdle(0);
    setSlam((n) => n + 1);
    cb.current.onGaskets(l.gaskets);
    cb.current.onShake();
    cb.current.onFlash();
    cb.current.track('C', 'wrong', `S${cb.current.idx + 1} ${why}`);
    if (l.gaskets <= 0) {
      setOver('lost');
      setMsg({ kind: 'bad', text: 'ALL GASKETS BLOWN' });
    } else {
      setMsg({ kind: 'bad', text: `${why} · GASKET BLOWN · ${l.gaskets} LEFT` });
    }
  };

  useEffect(() => {
    const t = window.setInterval(() => {
      const l = live.current;
      if (l.busy) return;
      if (l.locked) { l.idle = 0; setIdle(0); return; }
      l.idle += 1;
      if (l.idle >= IDLE_S) blow('OVERHEAT');
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
    const gain = itemPoints(PER_STINT, lv, 0);
    const total = Math.round((earned + gain) * 100) / 100;
    setEarned(total);
    onScore(total);
    live.current.idle = 0;
    setIdle(0);
    setSolving(false);
    if (idx === STINTS.length - 1) {
      setOver('won');
      setMsg({ kind: 'ok', text: 'ALL STINTS BALANCED' });
      window.setTimeout(onFinish, 1400);
    } else {
      setIdx(idx + 1);
      setCtl({ ...BALANCER_DEFAULTS });
      setMsg({ kind: 'ok', text: `${stint.name} CLEARED · +${fmt(gain, 1)}` });
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
    if (!sim.locked) { blow('NOT BALANCED'); return; }
    bank(level);
  };

  const hint = (next: 1 | 2) => {
    if (busy || level >= next) return;
    setHints({ ...hints, [stint.id]: next });
    track('C', 'hint', `S${idx + 1} H${next}`);
    if (next === 2) {
      const sol = solveStint(stint);
      if (sol) { setCtl(sol); setSolving(true); setMsg({ kind: 'info', text: 'AUTO-BALANCING · 0 PTS' }); }
    }
  };

  const hint1 = !sim.capacityOk
    ? 'A node is over 80%. Move the split, or send the spike to the relay.'
    : !sim.latencyOk
      ? 'Latency is over the limit. Step the quality down.'
      : !sim.qualityOk
        ? 'Quality is under the contract. Step it up, then recheck load.'
        : 'All lamps are green. Commit.';

  const heat = sim.locked ? 0 : Math.min(1, idle / IDLE_S);
  const spikeNode = ctl.divert ? 'arnage' : stint.spikeTarget;

  return (
    <section className={`ws2-modC ws2-in ${slam ? 'is-slam' : ''}`} aria-label="Module C load balancer">
      <div className="ws2-modhead">
        <b>MODULE C</b><span>BALANCER</span>
        <em>{fmt(earned, 1)} / {STATION2_CONFIG.moduleMax.C}</em>
      </div>

      <div className="ws2-cstrip">
        <ol className="ws2-stints">
          {STINTS.map((s, i) => (
            <li key={s.id} className={i < idx || over === 'won' ? 'is-done' : i === idx ? 'is-now' : ''}>
              <b>{i + 1} {s.name}</b><span>{s.tag}</span>
            </li>
          ))}
        </ol>
        <div className="ws2-gaskets" aria-label={`${gaskets} of ${GASKETS} gaskets left`}>
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
        <Panel title="NODES" tag={stint.goal} className="ws2-cluster">
          <div className="ws2-cluster__row">
            {sim.nodes.map((n) => (
              <Gauge
                key={n.id} value={n.util} limitAt={STATION2_CONFIG.utilLimit} label={n.label}
                readout={`${Math.round(n.util * 100)}%`} active={n.active} alert={n.active && n.util >= STATION2_CONFIG.utilLimit}
                badge={spikeNode === n.id ? `SPIKE +${stint.spikeM}M` : undefined}
              />
            ))}
          </div>
        </Panel>

        <Panel title="LINK" tag={`LIMIT ${STATION2_CONFIG.latencyLimitMs} ms`} className="ws2-linkpanel">
          <Gauge
            value={sim.latency / (STATION2_CONFIG.latencyLimitMs * 1.5)} limitAt={1 / 1.5} limitLines={['LIMIT', String(STATION2_CONFIG.latencyLimitMs)]} label="LATENCY"
            readout={`${sim.latency} ms`} alert={!sim.latencyOk} ends={['0', `${STATION2_CONFIG.latencyLimitMs * 1.5}`]}
          />
          <ul className="ws2-lamps">
            <li className={sim.latencyOk ? 'ok' : 'bad'}><i />LATENCY</li>
            <li className={sim.capacityOk ? 'ok' : 'bad'}><i />LOAD</li>
            <li className={sim.qualityOk ? 'ok' : 'bad'}><i />QUALITY</li>
          </ul>
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
            <input id="ws2-quality" type="range" min={0} max={QUALITY_PROFILES.length - 1} step={1} value={ctl.qualityIdx} disabled={busy}
              onChange={(e) => touch({ qualityIdx: Number(e.target.value) })} />
            <div className="ws2-ctl__scale ws2-ctl__ticks">
              {QUALITY_PROFILES.map((p, i) => (
                <button key={p.id} type="button" disabled={busy} className={i === ctl.qualityIdx ? 'on' : ''} onClick={() => touch({ qualityIdx: i })}>{p.label}</button>
              ))}
            </div>
          </div>

          <div className="ws2-ctl ws2-ctl--sw">
            <span id="ws2-relay-lbl">ARNAGE RELAY</span>
            <button type="button" role="switch" aria-checked={ctl.divert} aria-labelledby="ws2-relay-lbl" disabled={busy}
              className={`ws2-switch ${ctl.divert ? 'on' : ''}`} onClick={() => touch({ divert: !ctl.divert })}>
              <i /><b>{ctl.divert ? 'ON' : 'OFF'}</b>
            </button>
          </div>

          <button type="button" className={`ws2-btn ws2-btn--commit ${sim.locked ? 'is-ready' : ''}`} onClick={commit} disabled={busy}>
            COMMIT
          </button>
        </div>

        <div className="ws2-ctrl__foot">
          <span className="ws2-heat" aria-label="Engine heat"><small>HEAT</small><span className="ws2-heat__bar"><i style={{ transform: `scaleX(${heat})` }} /></span></span>
          <span className={`ws2-ctrl__msg is-${msg.kind}`} role="status">{msg.text || '\u00a0'}</span>
        </div>
      </Panel>
      </div>

      <HintDock
        level={level}
        itemLabel={`STINT ${idx + 1}/${STINTS.length}`}
        hint1Text={hint1}
        hint2Text="The balancer was set for you and committed. This stint scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={busy}
        onHint={hint}
      />
    </section>
  );
}
