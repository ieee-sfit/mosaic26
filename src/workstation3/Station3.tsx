import { speedBonus } from '../core/scoring';
import { useCallback, useEffect, useRef, useState } from 'react';
import './station3.css';
import { useSession } from '../session/sessionContext';
import { CONFIG, caseFor } from './mockStation3Data';
import { clamp, type Fx, type Station3Summary } from './utils';
import { StationHeader, StationTimer } from './components/Hud';
import StartScreen from './components/StartScreen';
import ModuleA from './components/ModuleA';
import ModuleB from './components/ModuleB';
import ModuleC from './components/ModuleC';
import ModuleD from './components/ModuleD';
import SummaryScreen, { type Breakdown, type Outcome } from './components/SummaryScreen';

type Phase = 'start' | 'A' | 'B' | 'C' | 'offer' | 'D' | 'done';
interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

const CAPS: Scores = { a: 15, b: 40, c: 45, d: CONFIG.moduleD.max };
const NO_SCORES: Scores = { a: 0, b: 0, c: 0, d: 0 };

/** Everything fixed at the moment Module C ends: the speed bonus and time_left do not change while D is played. */
interface Frozen {
  scores: Scores;
  base: number;
  bonus: number;
  left: number;
}
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
  const [scores, setScores] = useState<Scores>(NO_SCORES);
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const cas = caseFor(seed);
  const [dDeadline, setDDeadline] = useState(0);
  const [result, setResult] = useState<Breakdown | null>(null);
  const [shake, setShake] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const timeRef = useRef<number>(CONFIG.totalSeconds);
  const scoresRef = useRef<Scores>(NO_SCORES);
  const frozenRef = useRef<Frozen | null>(null);
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

  /** Hands the run to the host exactly once. raw = base (A+B+C) + speed bonus (frozen when C ended) + D; time_left is the value at C's end. */
  const commit = (outcome: Outcome, f: Frozen, d: number, dPlayed: boolean, dSuccess: boolean) => {
    if (emittedRef.current) return;
    emittedRef.current = true;
    const s = { ...f.scores, d };
    const { p1, p2 } = idsRef.current;

    scoresRef.current = s;
    setScores(s);
    setTimeLeft(f.left);
    setResult({ a: s.a, b: s.b, c: s.c, d, dPlayed, dSuccess, base: f.base, bonus: f.bonus, timeLeft: f.left, outcome, p1, p2 });
    setPhase('done');

    const summary: Station3Summary = { p1_id: p1, p2_id: p2, game_id: 'station3', raw_score: f.base + f.bonus + d, time_left: f.left };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
    } catch {
      /* storage unavailable — ignore */
    }
    window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }));
    onCompleteRef.current?.(summary);
  };

  /** The run ended without a bonus round: time ran out, or all pursuit pips were burned. */
  const finish = (outcome: Outcome) => {
    if (emittedRef.current) return;
    if (outcome === 'forfeit') scoresRef.current = { ...scoresRef.current, c: 0 };
    const s = { ...scoresRef.current, d: 0 };
    const left = outcome === 'timeout' ? 0 : timeRef.current;
    const base = s.a + s.b + s.c;
    commit(outcome, { scores: s, base, bonus: speedBonus(left, false, base), left }, 0, false, false);
  };

  /** Module C is complete: freeze the base score, speed bonus and time_left, then offer the bonus round if there is shift time left. */
  const completeC = () => {
    if (emittedRef.current || frozenRef.current) return;
    const s = { ...scoresRef.current, d: 0 };
    const left = timeRef.current;
    const base = s.a + s.b + s.c;
    const f: Frozen = { scores: s, base, bonus: speedBonus(left, true, base), left };
    frozenRef.current = f;
    if (left > 0) {
      setTimeLeft(left);
      setPhase('offer');
    } else {
      commit('complete', f, 0, false, false);
    }
  };
  const skipD = () => {
    const f = frozenRef.current;
    if (f && phase === 'offer') commit('complete', f, 0, false, false);
  };
  const playD = () => {
    const f = frozenRef.current;
    if (!f || phase !== 'offer') return;
    // the shift clock picks up where Module C left it and keeps running while D is played
    timeRef.current = f.left;
    setDDeadline(Date.now() + Math.min(CONFIG.moduleD.maxSeconds, f.left) * 1000);
    setPhase('D');
  };
  const doneD = (d: number, success: boolean) => {
    const f = frozenRef.current;
    if (f && phase === 'D') commit('complete', f, d, true, success);
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

  // the shift clock keeps running during D (D ends itself at its own deadline; the frozen bonus and time_left never change)
  useEffect(() => {
    if (phase !== 'D') return undefined;
    const id = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1);
      setTimeLeft(timeRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // an unanswered BONUS card auto-skips so an idle kiosk still saves the run
  const skipRef = useRef(skipD);
  useEffect(() => {
    skipRef.current = skipD;
  });
  useEffect(() => {
    if (phase !== 'offer') return undefined;
    const t = setTimeout(() => skipRef.current(), CONFIG.moduleD.offerSeconds * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  const start = (p1: string, p2: string) => {
    const next = { p1, p2 };
    idsRef.current = next;
    setIds(next);
    setPhase('A');
  };

  const restart = () => {
    // Replays go back through the launcher so the attempt cap is checked
    if (onOpenStationChooser) {
      onOpenStationChooser();
      return;
    }
    emittedRef.current = false;
    timeRef.current = CONFIG.totalSeconds;
    scoresRef.current = NO_SCORES;
    frozenRef.current = null;
    setTimeLeft(CONFIG.totalSeconds);
    setScores(NO_SCORES);
    setResult(null);
    const next = sessionIds ?? { p1: '', p2: '' };
    setIds(next);
    idsRef.current = next;
    setPhase(sessionIds ? 'A' : 'start');
  };

  const total = scores.a + scores.b + scores.c + scores.d;
  const inD = phase === 'offer' || phase === 'D';

  return (
    <div className={`ws3-shell ${shake ? 'is-shaking' : ''}`}>
      <div className="ws3-bg" aria-hidden="true" />
      <StationTimer timeLeft={timeLeft} />
      <StationHeader
        active={phase === 'A' || phase === 'B' || phase === 'C' || phase === 'D' ? phase : null}
        showD={inD}
        score={total}
        onOpenStationChooser={onOpenStationChooser}
      />

      {phase === 'start' && <StartScreen onStart={start} />}
      {phase === 'A' && <ModuleA fx={fx} onScore={(d) => addScore('a', d)} onDone={() => setPhase('B')} />}
      {phase === 'B' && <ModuleB cas={cas} seed={seed} fx={fx} onScore={(d) => addScore('b', d)} onDone={() => setPhase('C')} />}
      {phase === 'C' && (
        <ModuleC
          cas={cas}
          fx={fx}
          onScore={(d) => addScore('c', d)}
          onDone={completeC}
          onForfeit={() => finish('forfeit')}
        />
      )}
      {phase === 'offer' && (
        <main className="ws3-main ws3-start">
          <section className="ws3-panel ws3-start-card ws3-offer" role="dialog" aria-label="Bonus round offer">
            <div className="ws3-panel-tag">BONUS // FINAL PUSH</div>
            <h2 className="ws3-start-title">BLOCKADE <span>+{CONFIG.moduleD.max}</span></h2>
            <p className="ws3-start-lede">
              Two suspects left. Find the offender and close its exit. Up to {Math.min(CONFIG.moduleD.maxSeconds, timeLeft)} s. Your speed bonus is already locked in.
            </p>
            <div className="ws3-summary-actions">
              <button type="button" className="ws3-btn ws3-btn--primary" onClick={playD} autoFocus>
                [PLAY]
              </button>
              <button type="button" className="ws3-btn ws3-btn--ghost" onClick={skipD}>
                [SKIP]
              </button>
            </div>
          </section>
        </main>
      )}
      {phase === 'D' && (
        <ModuleD
          cas={cas}
          seed={seed}
          fx={fx}
          deadline={dDeadline}
          onScore={(d) => {
            scoresRef.current = { ...scoresRef.current, d };
            setScores((x) => ({ ...x, d }));
          }}
          onDone={doneD}
        />
      )}
      {phase === 'done' && result && (
        <SummaryScreen result={result} onRestart={restart} onOpenStationChooser={onOpenStationChooser} />
      )}

      {flashKey > 0 && <div key={flashKey} className="ws3-flash" aria-hidden="true" />}
    </div>
  );
}
