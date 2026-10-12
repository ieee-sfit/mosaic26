import { useEffect, useRef, useState } from 'react';
import { BALANCER_DEFAULTS, QUALITY_PROFILES, STATION2_CONFIG, STINTS } from '../mockStation2Data';
import { simulate } from '../logic';
import type { Controls } from '../logic';
import { SteamOverlay, Tachometer, Waveform } from './HudBits';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import type { Stint } from '../types';

interface Props {
  onProgress: (total: number) => void;
  onForfeit: () => void;
  onFinish: () => void;
  onShake: () => void;
}

const PER_STINT = STATION2_CONFIG.moduleMax.C / STINTS.length;

/** Finds any control setting that locks the stint (used by Hint 2, which solves it for 0 points). */
function solveStint(stint: Stint): Controls | null {
  for (const divert of [false, true]) {
    for (let qualityIdx = 0; qualityIdx < QUALITY_PROFILES.length; qualityIdx++) {
      for (let split = 0; split <= 100; split++) {
        const c = { split, qualityIdx, divert };
        if (simulate(stint, c).locked) return c;
      }
    }
  }
  return null;
}

export default function ModuleC({ onProgress, onForfeit, onFinish, onShake }: Props) {
  const [stintIdx, setStintIdx] = useState(0);
  const [controls, setControls] = useState<Controls>({ ...BALANCER_DEFAULTS, split: BALANCER_DEFAULTS.split });
  const [pips, setPips] = useState(STATION2_CONFIG.gasketPips);
  const [idleMs, setIdleMs] = useState(0);
  const [steam, setSteam] = useState(false);
  const [slam, setSlam] = useState(false);
  const [cleared, setCleared] = useState(0);
  const [earnedPts, setEarnedPts] = useState(0);
  const [stintHints, setStintHints] = useState<Record<string, HintLevel>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string }>({
    kind: 'info', text: 'BALANCE THE NODES, THEN COMMIT. IDLE TOO LONG AND THE ENGINE OVERHEATS.',
  });
  const [finished, setFinished] = useState(false);

  const stint = STINTS[stintIdx];
  const sim = simulate(stint, controls);

  // Mutable mirrors for the interval callback (written only in handlers / effects)
  const idleRef = useRef(0);
  const pipsRef = useRef(STATION2_CONFIG.gasketPips);
  const lockedRef = useRef(false);
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);
  const cb = useRef({ onForfeit, onShake });

  useEffect(() => {
    lockedRef.current = sim.locked;
    cb.current = { onForfeit, onShake };
  });
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const overheat = (reason: string) => {
    if (doneRef.current) return;
    pipsRef.current -= 1;
    setPips(pipsRef.current);
    idleRef.current = 0;
    setIdleMs(0);
    setSteam(true);
    setSlam(true);
    later(() => setSlam(false), 900);
    later(() => setSteam(false), 2800);
    cb.current.onShake();
    if (pipsRef.current <= 0) {
      doneRef.current = true;
      setFinished(true);
      setMsg({ kind: 'bad', text: 'ALL 3 GASKETS BLOWN // ENGINE SEIZED // MODULE C POINTS FORFEITED' });
      later(() => cb.current.onForfeit(), 2600);
    } else {
      setMsg({ kind: 'bad', text: `${reason} // TACHOMETER AT REDLINE // GASKET BLOWN // ${pipsRef.current}/${STATION2_CONFIG.gasketPips} REMAIN` });
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      if (doneRef.current) return;
      if (lockedRef.current) {
        idleRef.current = 0;
        setIdleMs(0);
        return;
      }
      idleRef.current += 200;
      if (idleRef.current >= STATION2_CONFIG.idleLimitMs) overheat('IDLE TIMEOUT');
      else setIdleMs(idleRef.current);
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const touch = (patch: Partial<Controls>) => {
    if (finished) return;
    idleRef.current = 0;
    setIdleMs(0);
    setControls({ ...controls, ...patch });
  };

  const hintLevel: HintLevel = stintHints[stint.id] ?? 0;

  /** Banks the current stint. Hint 1 keeps 60% of the stint's points, Hint 2 (auto-solve) keeps none. */
  const advance = (level: HintLevel) => {
    const gain = level >= 2 ? 0 : level === 1 ? PER_STINT * (1 - STATION2_CONFIG.hintPenalty.hint1) : PER_STINT;
    const pts = Math.round((earnedPts + gain) * 100) / 100;
    setCleared(cleared + 1);
    setEarnedPts(pts);
    onProgress(pts);
    idleRef.current = 0;
    setIdleMs(0);
    if (stintIdx === STINTS.length - 1) {
      doneRef.current = true;
      setFinished(true);
      setMsg({ kind: 'ok', text: 'CHEQUERED FLAG // ALL STINTS BALANCED' });
      later(() => onFinish(), 1500);
    } else {
      setStintIdx(stintIdx + 1);
      setControls({ ...BALANCER_DEFAULTS });
      setMsg({ kind: 'ok', text: `${stint.name} ${level >= 2 ? 'AUTO-BALANCED' : 'CLEARED'} +${Math.round(gain * 100) / 100} PTS // ${STINTS[stintIdx + 1].name} INBOUND` });
    }
  };

  const commit = () => {
    if (finished) return;
    if (!sim.locked) {
      overheat('UNBALANCED SUBMIT');
      return;
    }
    advance(hintLevel);
  };

  const requestHint = (next: 1 | 2) => {
    if (finished) return;
    setStintHints({ ...stintHints, [stint.id]: next });
    if (next === 2) {
      const sol = solveStint(stint);
      if (sol) {
        setControls(sol);
        advance(2);
      }
    }
  };

  const hint1Text = !sim.capacityOk
    ? 'A node is above 80% load. Shift SLIDER 1 toward the emptier node, or divert the spike to the Arnage relay.'
    : !sim.latencyOk
      ? 'Total latency is over 1500 ms. A lower quality profile encodes faster, and easing the busiest node cuts queueing.'
      : !sim.qualityOk
        ? 'Quality is below the broadcast contract. Raise SLIDER 2 (but watch the latency and load checks).'
        : 'All three checks pass right now. Hold steady and commit.';

  const heat = sim.locked ? 0.12 : Math.max(idleMs / STATION2_CONFIG.idleLimitMs, sim.severity * 0.6);
  const rpm = 2400 + heat * 6200;
  const signal = sim.locked ? 100 : Math.max(5, Math.round((1 - sim.severity) * 90));
  const prof = QUALITY_PROFILES[controls.qualityIdx];
  const idleLeft = Math.max(0, Math.ceil((STATION2_CONFIG.idleLimitMs - idleMs) / 1000));

  return (
    <section className={`ws2-mod ws2-mod-c ${steam ? 'is-steaming' : ''}`} aria-label="Module C Pit Wall Load and Quality Balancer">
      <SteamOverlay active={steam} />
      <div className="ws2-mod-head">
        <span className="ws2-tag">MODULE C</span>
        <h2>PIT WALL 3-NODE LOAD &amp; QUALITY BALANCER</h2>
        <span className="ws2-mod-pts">{earnedPts} / {STATION2_CONFIG.moduleMax.C} PTS</span>
      </div>

      <div className="ws2-c-top">
        <ol className="ws2-stints">
          {STINTS.map((s, i) => (
            <li key={s.id} className={i < cleared ? 'is-done' : i === stintIdx ? 'is-active' : ''}>
              <b>{i + 1}. {s.name}</b><span>{s.tag}</span>
            </li>
          ))}
        </ol>
        <div className="ws2-pips" aria-label={`${pips} of ${STATION2_CONFIG.gasketPips} gaskets intact`}>
          <span>GASKETS</span>
          {Array.from({ length: STATION2_CONFIG.gasketPips }, (_, i) => (
            <i key={i} className={i < pips ? 'ok' : 'blown'} title={i < pips ? 'Intact' : 'Blown'} />
          ))}
        </div>
      </div>
      <p className="ws2-briefing">&gt; {stint.briefing}</p>

      <div className="ws2-c-grid">
        <div className="ws2-nodes">
          {sim.nodes.map((n) => {
            const pct = Math.round(n.util * 100);
            const over = n.active && n.util >= STATION2_CONFIG.utilLimit;
            return (
              <div key={n.id} className={`ws2-node ws2-chamfer ${n.active ? '' : 'is-standby'} ${over ? 'is-over' : ''}`}>
                <div className="ws2-node-head"><b>{n.label}</b><span>{n.active ? (over ? 'OVERLOAD' : 'ONLINE') : 'STANDBY'}</span></div>
                <div className="ws2-node-bar" role="meter" aria-valuenow={n.active ? pct : 0} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${Math.min(100, n.active ? pct : 0)}%` }} />
                  <em style={{ left: `${STATION2_CONFIG.utilLimit * 100}%` }} />
                </div>
                <div className="ws2-node-read">
                  <span>{n.active ? `${pct}%` : '--'}</span>
                  <span>{n.active ? n.load.toFixed(1) : '0.0'} / {n.cap} Tbps</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ws2-c-center ws2-chamfer">
          <div className={`ws2-signal ${sim.locked ? 'is-locked' : ''}`} role="status">
            {sim.locked ? '[TELEMETRY LOCKED / SIGNAL 100%]' : `[SIGNAL DEGRADED / ${signal}%]`}
          </div>
          <Waveform locked={sim.locked} severity={sim.severity} />
          <div className="ws2-c-dials">
            <Tachometer rpm={rpm} slam={slam} />
            <div className="ws2-readouts">
              <div className={`ws2-lat ${sim.latencyOk ? 'ok' : 'bad'}`}>
                <span>TOTAL LATENCY</span>
                <b>{sim.latency.toLocaleString('en-US')} ms</b>
                <div className="ws2-node-bar"><i style={{ width: `${Math.min(100, (sim.latency / (STATION2_CONFIG.latencyLimitMs * 1.4)) * 100)}%` }} />
                  <em style={{ left: `${(1 / 1.4) * 100}%` }} /></div>
                <small>LIMIT &lt; {STATION2_CONFIG.latencyLimitMs} ms</small>
              </div>
              <ul className="ws2-checks">
                <li className={sim.latencyOk ? 'ok' : 'bad'}>LATENCY &lt; 1500 ms</li>
                <li className={sim.capacityOk ? 'ok' : 'bad'}>ALL NODES &lt; 80%</li>
                <li className={sim.qualityOk ? 'ok' : 'bad'}>CONTRACT ≥ {QUALITY_PROFILES[stint.worstQualityIdx].label}</li>
              </ul>
              <div className={`ws2-idle ${idleLeft <= 8 && !sim.locked ? 'warn' : ''}`}>
                {sim.locked ? 'HOLD // READY TO COMMIT' : `ENGINE HEAT IN ${idleLeft}s IF IDLE`}
              </div>
            </div>
          </div>
        </div>

        <div className="ws2-controls ws2-chamfer">
          <div className="ws2-ctl">
            <label htmlFor="ws2-split">SLIDER 1 // TRACK LOAD BALANCE</label>
            <input id="ws2-split" type="range" min={0} max={100} step={1} value={controls.split} disabled={finished}
              onChange={(e) => touch({ split: Number(e.target.value) })} />
            <div className="ws2-ctl-scale"><span>MULSANNE {controls.split}%</span><span>PIT STRAIGHT {100 - controls.split}%</span></div>
          </div>
          <div className="ws2-ctl">
            <label htmlFor="ws2-quality">SLIDER 2 // QUALITY PROFILE</label>
            <input id="ws2-quality" type="range" min={0} max={QUALITY_PROFILES.length - 1} step={1} value={controls.qualityIdx} disabled={finished}
              onChange={(e) => touch({ qualityIdx: Number(e.target.value) })} />
            <div className="ws2-ctl-scale ws2-ctl-ticks">
              {QUALITY_PROFILES.map((p, i) => <span key={p.id} className={i === controls.qualityIdx ? 'on' : ''}>{p.label}</span>)}
            </div>
            <small className="ws2-dim">{prof.mbps} Mbps/viewer // +{prof.latencyMs} ms encode</small>
          </div>
          <div className="ws2-ctl">
            <label id="ws2-divert-lbl">TOGGLE // EMERGENCY ARNAGE RELAY</label>
            <button type="button" role="switch" aria-checked={controls.divert} aria-labelledby="ws2-divert-lbl" disabled={finished}
              className={`ws2-switch ${controls.divert ? 'on' : ''}`} onClick={() => touch({ divert: !controls.divert })}>
              <span className="ws2-switch-knob" />
              <span className="ws2-switch-txt">{controls.divert ? 'DIVERTING SPIKE' : 'RELAY OFF'}</span>
            </button>
            <small className="ws2-dim">SPIKE +{stint.spikeM}M viewers hits {stint.spikeTarget.toUpperCase()} (+{STATION2_CONFIG.relayHopMs} ms if diverted)</small>
          </div>
          <button type="button" className="ws2-btn ws2-btn-red ws2-btn-wide" onClick={commit} disabled={finished}>
            [COMMIT STINT BALANCE]
          </button>
        </div>
      </div>

      <div className={`ws2-flash ws2-flash-${msg.kind === 'info' ? 'info' : msg.kind}`} role="status">{msg.text}</div>
      <HintDock
        level={hintLevel}
        itemLabel={`STINT ${stintIdx + 1}/${STINTS.length}`}
        hint1Text={hint1Text}
        hint2Text="The balancer was set for you and the stint committed. It scores 0."
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={finished}
        onHint={requestHint}
      />
    </section>
  );
}
