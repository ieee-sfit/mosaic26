import { speedBonus } from '../core/scoring';
import { useSession } from '../session/sessionContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import ModuleA from './components/ModuleA';
import ModuleB from './components/ModuleB';
import ModuleC from './components/ModuleC';
import { HudTicker, TimerBadge } from './components/HudBits';
import { STATION2_CONFIG } from './mockStation2Data';
import { fmt, mmss } from './logic';
import './station2.css';

export interface Station2Summary {
  p1_id: string;
  p2_id: string;
  game_id: 'station2';
  raw_score: number;
  time_left: number;
}

interface Props {
  onNavigateStation?: (n: number) => void;
  onOpenStationChooser?: () => void;
  onComplete?: (summary: Station2Summary) => void;
}

type ModuleId = 'A' | 'B' | 'C';
type Reason = 'complete' | 'timeout' | 'forfeit';

const ID_RE = /^\d{6}$/;
const digits = (v: string) => v.replace(/\D/g, '').slice(0, STATION2_CONFIG.idDigits);

export default function Station2({ onNavigateStation, onOpenStationChooser, onComplete }: Props) {
  const [phase, setPhase] = useState<'id' | 'play' | 'done'>('id');
  const session = useSession() as { p1_id?: string; p2_id?: string } | null;
  const locked = !!session && ID_RE.test(session.p1_id ?? '') && ID_RE.test(session.p2_id ?? '');
  const [p1, setP1] = useState(locked ? (session?.p1_id as string) : '');
  const [p2, setP2] = useState(locked ? (session?.p2_id as string) : '');
  const [idError, setIdError] = useState('');
  const [mod, setMod] = useState<ModuleId>('A');
  const [done, setDone] = useState<Record<ModuleId, boolean>>({ A: false, B: false, C: false });
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [scoreC, setScoreC] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STATION2_CONFIG.totalSeconds);
  const [result, setResult] = useState<{ reason: Reason; timeLeft: number } | null>(null);
  const [shake, setShake] = useState({ n: 0, on: false });
  const startRef = useRef(0);
  const emittedRef = useRef(false);
  const shakeTimer = useRef<number | null>(null);

  const triggerShake = useCallback(() => {
    setShake((s) => ({ n: s.n + 1, on: true }));
    if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShake((s) => ({ ...s, on: false })), 520);
  }, []);

  const remaining = () =>
    Math.max(0, STATION2_CONFIG.totalSeconds - Math.floor((Date.now() - startRef.current) / 1000));

  const finish = useCallback((reason: Reason, left: number) => {
    setResult((r) => r ?? { reason, timeLeft: left });
    setPhase('done');
  }, []);

  // Countdown (timestamp-driven so it cannot drift)
  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, STATION2_CONFIG.totalSeconds - Math.floor((Date.now() - startRef.current) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        finish('timeout', 0);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  const rawScore = Math.round((scoreA + scoreB + scoreC) * 100) / 100;
  const bonusEarned = result ? speedBonus(result.timeLeft, result.reason === 'complete') : 0;

  // Emit the session summary exactly once on completion / timeout
  useEffect(() => {
    if (!result || emittedRef.current) return;
    emittedRef.current = true;
    const summary: Station2Summary = {
      p1_id: p1, p2_id: p2, game_id: 'station2', raw_score: Math.round((rawScore + bonusEarned) * 100) / 100, time_left: result.timeLeft,
    };
    onComplete?.(summary);
    window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }));
    console.info('[station2] session summary', summary);
  }, [result, p1, p2, rawScore, bonusEarned, onComplete]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ID_RE.test(p1) || !ID_RE.test(p2)) {
      setIdError('BOTH OPERATOR IDs MUST BE EXACTLY 6 DIGITS.');
      return;
    }
    if (p1 === p2) {
      setIdError('OPERATOR 1 AND OPERATOR 2 MUST HAVE DIFFERENT IDs.');
      return;
    }
    setIdError('');
    startRef.current = Date.now();
    setTimeLeft(STATION2_CONFIG.totalSeconds);
    setPhase('play');
  };

  const advance = (from: ModuleId, to: ModuleId) => {
    setDone((d) => ({ ...d, [from]: true }));
    setMod(to);
  };

  const sector = mod === 'A' ? 1 : mod === 'B' ? 2 : 3;
  const shakeCls = shake.on ? (shake.n % 2 ? 'ws2-shake-a' : 'ws2-shake-b') : '';

  const header = (
    <header className="ws2-header">
      <div className="ws2-brand">
        <span className="ws2-brand-mark">SHELBY-AMERICAN</span>
        <h1>F1 0-LAG STREAM <small>STATION 02 // PIT WALL TELEMETRY</small></h1>
      </div>
      <HudTicker sector={sector} />
      {onOpenStationChooser && (
        <button type="button" className="ws2-btn ws2-btn-ghost" onClick={onOpenStationChooser}>[STATIONS]</button>
      )}
    </header>
  );

  if (phase === 'id') {
    return (
      <div className="ws2-shell">
        {header}
        <main className="ws2-id-wrap">
          <form className="ws2-id-card ws2-chamfer" onSubmit={handleStart} noValidate>
            <span className="ws2-tag">CIRCUIT_DE_LA_SARTHE // 24H LE MANS 1966</span>
            <h2>PIT WALL OPERATOR LOGIN</h2>
            <p className="ws2-dim">
              Ford GT40 vs Ferrari. Keep the 0-lag stream alive for 12 minutes. 100 base points + up to {STATION2_CONFIG.speedBonusMax} speed bonus.
              No audio — watch the gauges.
            </p>
            <label htmlFor="ws2-p1">OPERATOR 1 ID</label>
            <input id="ws2-p1" className="ws2-input" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" readOnly={locked}
              value={p1} onChange={(e) => setP1(digits(e.target.value))} />
            <label htmlFor="ws2-p2">OPERATOR 2 ID</label>
            <input id="ws2-p2" className="ws2-input" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" readOnly={locked}
              value={p2} onChange={(e) => setP2(digits(e.target.value))} />
            {idError && <div className="ws2-flash ws2-flash-bad" role="alert">{idError}</div>}
            <button type="submit" className="ws2-btn ws2-btn-red ws2-btn-wide" disabled={!ID_RE.test(p1) || !ID_RE.test(p2)}>
              [START ENGINES // BEGIN 12:00]
            </button>
            <ul className="ws2-id-rules">
              <li>MODULE A — PIT TELEMETRY PROTOCOL — 15 PTS</li>
              <li>MODULE B — RELAY BEACON TOWER — 40 PTS</li>
              <li>MODULE C — 3-NODE BALANCER — 45 PTS</li>
            </ul>
          </form>
        </main>
      </div>
    );
  }

  if (phase === 'done' && result) {
    const bonus = bonusEarned;
    const title = result.reason === 'complete' ? 'CHEQUERED FLAG' : result.reason === 'timeout' ? 'TIME EXPIRED' : 'ENGINE SEIZED';
    return (
      <div className="ws2-shell">
        {header}
        <main className="ws2-id-wrap">
          <div className="ws2-id-card ws2-chamfer ws2-result">
            <span className="ws2-tag">{result.reason.toUpperCase()}</span>
            <h2>{title}</h2>
            <table className="ws2-score-table">
              <tbody>
                <tr><td>MODULE A — PIT TELEMETRY</td><td>{fmt(scoreA, 2)} / {STATION2_CONFIG.moduleMax.A}</td></tr>
                <tr><td>MODULE B — RELAY BEACONS</td><td>{fmt(scoreB, 2)} / {STATION2_CONFIG.moduleMax.B}</td></tr>
                <tr><td>MODULE C — BALANCER</td><td>{fmt(scoreC, 2)} / {STATION2_CONFIG.moduleMax.C}</td></tr>
                <tr className="ws2-total"><td>RAW SCORE</td><td>{fmt(rawScore, 2)} / 100</td></tr>
                <tr><td>SPEED BONUS (TIME LEFT {mmss(result.timeLeft)})</td><td>+{bonus} / {STATION2_CONFIG.speedBonusMax}</td></tr>
              </tbody>
            </table>
            <pre className="ws2-json">{JSON.stringify({ p1_id: p1, p2_id: p2, game_id: 'station2', raw_score: rawScore + bonus, time_left: result.timeLeft }, null, 2)}</pre>
            <button type="button" className="ws2-btn ws2-btn-blue ws2-btn-wide"
              onClick={() => (onNavigateStation ? onNavigateStation(2) : window.location.reload())}>
              [NEW SESSION]
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`ws2-shell ${shakeCls}`}>
      {header}
      <TimerBadge timeLeft={timeLeft} total={STATION2_CONFIG.totalSeconds} />
      <nav className="ws2-modbar" aria-label="Modules">
        {(['A', 'B', 'C'] as ModuleId[]).map((m) => (
          <span key={m} className={`${mod === m ? 'is-active' : ''} ${done[m] ? 'is-done' : ''}`}>
            {done[m] ? '✓' : m} {m === 'A' ? 'PIT TELEMETRY' : m === 'B' ? 'RELAY TOWERS' : 'BALANCER'}
          </span>
        ))}
        <span className="ws2-modbar-ids">OP1 {p1} · OP2 {p2}</span>
      </nav>
      <main className="ws2-main">
        {mod === 'A' && <ModuleA onScore={setScoreA} onShake={triggerShake} onDone={() => advance('A', 'B')} />}
        {mod === 'B' && <ModuleB onScore={setScoreB} onShake={triggerShake} onDone={() => advance('B', 'C')} />}
        {mod === 'C' && (
          <ModuleC
            onProgress={setScoreC}
            onShake={triggerShake}
            onForfeit={() => { setScoreC(0); finish('forfeit', remaining()); }}
            onFinish={() => { setDone((d) => ({ ...d, C: true })); finish('complete', remaining()); }}
          />
        )}
      </main>
    </div>
  );
}
