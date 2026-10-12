import { speedBonus } from '../core/scoring';
import { useCallback, useEffect, useRef, useState } from 'react';
import './station3.css';
import { useSession } from '../session/sessionContext';
import { CONFIG } from './mockStation3Data';
import { clamp, type Fx, type Station3Summary } from './utils';
import { StationHeader, StationTimer } from './components/Hud';
import StartScreen from './components/StartScreen';
import ModuleA from './components/ModuleA';
import ModuleB from './components/ModuleB';
import ModuleC from './components/ModuleC';
import SummaryScreen, { type Breakdown, type Outcome } from './components/SummaryScreen';

type Phase = 'start' | 'A' | 'B' | 'C' | 'done';
interface Scores {
  a: number;
  b: number;
  c: number;
}

const CAPS: Scores = { a: 15, b: 40, c: 45 };
const STORAGE_KEY = 'ws3_last_session';
const ID_RE = /^\d{6}$/;

/** Operator IDs handed over by the launcher's shared session (if any). */
interface LauncherSession {
  p1_id?: string;
  p2_id?: string;
}

interface Station3Props {
  onNavigateStation?: (stNum: number) => void;
  onOpenStationChooser?: () => void;
  /** Receives `{ p1_id, p2_id, game_id: 'station3', raw_score, time_left }` once, when the session ends. */
  onComplete?: (summary: Station3Summary) => void;
}

export default function Station3({ onOpenStationChooser, onComplete }: Station3Props) {
  // Launched via the arcade launcher → IDs already captured, skip the login screen.
  const session = useSession() as LauncherSession | null;
  const sessionIds =
    session && ID_RE.test(session.p1_id ?? '') && ID_RE.test(session.p2_id ?? '')
      ? { p1: session.p1_id as string, p2: session.p2_id as string }
      : null;

  const [phase, setPhase] = useState<Phase>(sessionIds ? 'A' : 'start');
  const [ids, setIds] = useState(sessionIds ?? { p1: '', p2: '' });
  const [timeLeft, setTimeLeft] = useState<number>(CONFIG.totalSeconds);
  const [scores, setScores] = useState<Scores>({ a: 0, b: 0, c: 0 });
  const [result, setResult] = useState<Breakdown | null>(null);
  const [shake, setShake] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const timeRef = useRef<number>(CONFIG.totalSeconds);
  const scoresRef = useRef<Scores>({ a: 0, b: 0, c: 0 });
  const idsRef = useRef(ids);
  const emittedRef = useRef(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const fx: Fx = {
    shake: useCallback(() => {
      setShake(true);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(false), 450);
    }, []),
    flash: useCallback(() => setFlashKey((k) => k + 1), []),
  };

  const addScore = (mod: keyof Scores, delta: number) => {
    const next = { ...scoresRef.current, [mod]: clamp(scoresRef.current[mod] + delta, 0, CAPS[mod]) };
    scoresRef.current = next;
    setScores(next);
  };

  const finish = (outcome: Outcome) => {
    if (emittedRef.current) return;
    emittedRef.current = true;
    if (outcome === 'forfeit') scoresRef.current = { ...scoresRef.current, c: 0 };
    const s = scoresRef.current;
    const left = outcome === 'timeout' ? 0 : timeRef.current;
    const base = s.a + s.b + s.c;
    const bonus = speedBonus(left, outcome === 'complete', base);
    const { p1, p2 } = idsRef.current;

    setScores(s);
    setTimeLeft(left);
    setResult({ ...s, base, bonus, timeLeft: left, outcome, p1, p2 });
    setPhase('done');

    const summary: Station3Summary = { p1_id: p1, p2_id: p2, game_id: 'station3', raw_score: base + bonus, time_left: left };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
    } catch {
      /* storage unavailable — ignore */
    }
    window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }));
    onCompleteRef.current?.(summary);
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  // unified 12-minute countdown — runs across all three modules
  const running = phase === 'A' || phase === 'B' || phase === 'C';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1);
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(id);
        finishRef.current('timeout');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = (p1: string, p2: string) => {
    const next = { p1, p2 };
    idsRef.current = next;
    setIds(next);
    setPhase('A');
  };

  const restart = () => {
    emittedRef.current = false;
    timeRef.current = CONFIG.totalSeconds;
    scoresRef.current = { a: 0, b: 0, c: 0 };
    setTimeLeft(CONFIG.totalSeconds);
    setScores({ a: 0, b: 0, c: 0 });
    setResult(null);
    const next = sessionIds ?? { p1: '', p2: '' };
    setIds(next);
    idsRef.current = next;
    setPhase(sessionIds ? 'A' : 'start');
  };

  const total = scores.a + scores.b + scores.c;

  return (
    <div className={`ws3-shell ${shake ? 'is-shaking' : ''}`}>
      <div className="ws3-bg" aria-hidden="true" />
      <StationTimer timeLeft={timeLeft} />
      <StationHeader
        active={phase === 'A' || phase === 'B' || phase === 'C' ? phase : null}
        score={total}
        onOpenStationChooser={onOpenStationChooser}
      />

      {phase === 'start' && <StartScreen onStart={start} />}
      {phase === 'A' && <ModuleA fx={fx} onScore={(d) => addScore('a', d)} onDone={() => setPhase('B')} />}
      {phase === 'B' && <ModuleB fx={fx} onScore={(d) => addScore('b', d)} onDone={() => setPhase('C')} />}
      {phase === 'C' && (
        <ModuleC
          fx={fx}
          onScore={(d) => addScore('c', d)}
          onDone={() => finish('complete')}
          onForfeit={() => finish('forfeit')}
        />
      )}
      {phase === 'done' && result && (
        <SummaryScreen result={result} onRestart={restart} onOpenStationChooser={onOpenStationChooser} />
      )}

      {flashKey > 0 && <div key={flashKey} className="ws3-flash" aria-hidden="true" />}
    </div>
  );
}
