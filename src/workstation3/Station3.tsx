import { speedBonus } from '../core/scoring';
import { useCallback, useEffect, useRef, useState } from 'react';
import './station3.css';
import { useSession } from '../session/sessionContext';
import { CONFIG, caseFor } from './mockStation3Data';
import { clamp, fmtClock, type Fx, type Station3Summary } from './utils';
import { StationHeader, StationTimer } from './components/Hud';
import ModuleA from './components/ModuleA';
import ModuleB from './components/ModuleB';
import ModuleC from './components/ModuleC';
import ModuleD from './components/ModuleD';
import SummaryScreen, { type Breakdown, type ModId, type ModStat, type Outcome } from './components/SummaryScreen';
import StoryScreen from './story/StoryScreen';
import TutorialScreen from './story/TutorialScreen';
import { BEATS, D_LOST, D_STOPPED } from './story/story';

/**
 * Flow: opening -> tutorial A -> A -> story 1 -> tutorial B -> B -> story 2 -> tutorial C -> C
 *       -> bonus offer -> (PLAY) story 3 -> tutorial D -> D -> ending (story) -> debrief.
 * The shift clock runs ONLY in A, B, C and D. It is paused on every story, tutorial and the bonus offer.
 */
type Phase =
  | 'story-opening'
  | 'tut-A'
  | 'A'
  | 'story-1'
  | 'tut-B'
  | 'B'
  | 'story-2'
  | 'tut-C'
  | 'C'
  | 'offer'
  | 'story-3'
  | 'tut-D'
  | 'D'
  | 'ending'
  | 'done';
interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

const CAPS: Scores = { a: 15, b: 40, c: 45, d: CONFIG.moduleD.max };
const NO_SCORES: Scores = { a: 0, b: 0, c: 0, d: 0 };
const noStats = (): Record<ModId, ModStat> => ({
  A: { seconds: 0, wrong: 0, hints: 0 },
  B: { seconds: 0, wrong: 0, hints: 0 },
  C: { seconds: 0, wrong: 0, hints: 0 },
  D: { seconds: 0, wrong: 0, hints: 0 },
});
const PLAYING: Phase[] = ['A', 'B', 'C', 'D'];

/** Everything fixed at the moment Module C ends: the speed bonus and time_left do not change while D is played. */
interface Frozen {
  scores: Scores;
  base: number;
  bonus: number;
  left: number;
}
const STORAGE_KEY = 'ws3_last_session';
const ID_RE = /^\d{4}$/;

interface Station3Props {
  onNavigateStation?: (stNum: number) => void;
  onOpenStationChooser?: () => void;
  /** Receives `{ player_id, game_id: 'station3', raw_score, time_left, hints_used, wrong_attempts }` once, when the session ends. */
  onComplete?: (summary: Station3Summary) => void;
}

export default function Station3({ onOpenStationChooser, onComplete }: Station3Props) {
  // Launched via the arcade launcher, which has already verified the player's single 4-digit ID.
  const session = useSession();
  const playerId = session && ID_RE.test(session.player_id) ? session.player_id : '';

  const [phase, setPhase] = useState<Phase>('story-opening');
  const [timeLeft, setTimeLeft] = useState<number>(CONFIG.totalSeconds);
  const [scores, setScores] = useState<Scores>(NO_SCORES);
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const cas = caseFor(seed);
  const [result, setResult] = useState<Breakdown | null>(null);
  const [shake, setShake] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const timeRef = useRef<number>(CONFIG.totalSeconds);
  const scoresRef = useRef<Scores>(NO_SCORES);
  const frozenRef = useRef<Frozen | null>(null);
  const emittedRef = useRef(false);
  const statsRef = useRef<Record<ModId, ModStat>>(noStats());
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
    scoresRef.current = s;
    setScores(s);
    setTimeLeft(f.left);
    setResult({
      a: s.a, b: s.b, c: s.c, d, dPlayed, dSuccess, base: f.base, bonus: f.bonus, timeLeft: f.left, outcome, playerId,
      stats: { A: { ...statsRef.current.A }, B: { ...statsRef.current.B }, C: { ...statsRef.current.C }, D: { ...statsRef.current.D } },
    });
    setPhase('ending');

    const all = Object.values(statsRef.current);
    const summary: Station3Summary = {
      player_id: playerId, game_id: 'station3', raw_score: f.base + f.bonus + d, time_left: f.left,
      hints_used: all.reduce((n, m) => n + m.hints, 0), wrong_attempts: all.reduce((n, m) => n + m.wrong, 0),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
    } catch {
      /* storage unavailable — ignore */
    }
    window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary }));
    onCompleteRef.current?.(summary);
  };

  /** The run ended without finishing Module C: the shift clock reached 0 in A, B or C. */
  const finish = (outcome: Outcome) => {
    if (emittedRef.current) return;
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
    // the bonus is only offered when enough shift time is left; otherwise the run goes straight to the ending
    if (left >= CONFIG.moduleD.minSecondsToOffer) {
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
    // the shift clock picks up where Module C left it once Module D starts (it stays paused on the story and tutorial)
    timeRef.current = f.left;
    setPhase('story-3');
  };
  const doneD = (d: number, success: boolean) => {
    const f = frozenRef.current;
    if (f && phase === 'D') commit('complete', f, d, true, success);
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  // the unified 12-minute shift clock runs only while Module A, B, C or D is being played
  const running = PLAYING.includes(phase);
  useEffect(() => {
    if (!running) return undefined;
    const mod = phase as ModId;
    const id = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1);
      statsRef.current[mod].seconds += 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(id);
        // in A, B or C this is a failed mission; in D the module itself ends and the run is still a success
        if (mod !== 'D') finishRef.current('timeout');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  const bump = (mod: ModId, kind: 'wrong' | 'hint') => {
    statsRef.current[mod][kind === 'wrong' ? 'wrong' : 'hints'] += 1;
  };

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
    statsRef.current = noStats();
    setTimeLeft(CONFIG.totalSeconds);
    setScores(NO_SCORES);
    setResult(null);
    setPhase('story-opening');
  };

  const total = scores.a + scores.b + scores.c + scores.d;
  const inD = phase === 'offer' || phase === 'story-3' || phase === 'tut-D' || phase === 'D' || (phase === 'done' && !!result?.dPlayed);
  const modOf = (p: Phase): 'A' | 'B' | 'C' | 'D' | null => {
    const m = p.startsWith('tut-') ? p.slice(4) : p;
    return m === 'A' || m === 'B' || m === 'C' || m === 'D' ? m : null;
  };
  const endBeat = result?.outcome === 'timeout' ? BEATS.fail : BEATS.success;
  const endExtra = result?.outcome === 'complete' && result.dPlayed ? [result.dSuccess ? D_STOPPED : D_LOST] : undefined;

  return (
    <div className={`ws3-shell ${shake ? 'is-shaking' : ''}`}>
      <div className="ws3-bg" aria-hidden="true" />
      <StationTimer timeLeft={timeLeft} paused={!running} />
      <StationHeader active={modOf(phase)} showD={inD} score={total} onOpenStationChooser={onOpenStationChooser} />

      {phase === 'story-opening' && <StoryScreen key="opening" beat={BEATS.opening} onContinue={() => setPhase('tut-A')} />}
      {phase === 'tut-A' && <TutorialScreen module="A" onContinue={() => setPhase('A')} />}
      {phase === 'A' && <ModuleA fx={fx} onScore={(d) => addScore('a', d)} onStat={(k) => bump('A', k)} onDone={() => setPhase('story-1')} />}

      {phase === 'story-1' && <StoryScreen key="story1" beat={BEATS.story1} onContinue={() => setPhase('tut-B')} />}
      {phase === 'tut-B' && <TutorialScreen module="B" onContinue={() => setPhase('B')} />}
      {phase === 'B' && <ModuleB cas={cas} seed={seed} fx={fx} onScore={(d) => addScore('b', d)} onStat={(k) => bump('B', k)} onDone={() => setPhase('story-2')} />}

      {phase === 'story-2' && <StoryScreen key="story2" beat={BEATS.story2} onContinue={() => setPhase('tut-C')} />}
      {phase === 'tut-C' && <TutorialScreen module="C" onContinue={() => setPhase('C')} />}
      {phase === 'C' && <ModuleC cas={cas} seed={seed} fx={fx} onScore={(d) => addScore('c', d)} onStat={(k) => bump('C', k)} onDone={completeC} />}

      {phase === 'offer' && (
        <main className="ws3-main ws3-start">
          <section className="ws3-panel ws3-start-card ws3-offer" role="dialog" aria-label="Bonus round offer">
            <div className="ws3-panel-tag">BONUS // FINAL PUSH · CLOCK PAUSED</div>
            <h2 className="ws3-start-title">BLOCKADE <span>+{CONFIG.moduleD.max}</span></h2>
            <p className="ws3-start-lede">
              Two silver coupes, one offender. Follow them through three cameras and close the right exit. You have {fmtClock(timeLeft)} of shift time left, and the
              bonus ends when it reaches 00:00. Your speed bonus is already locked in.
            </p>
            <div className="ws3-offer-actions">
              <button type="button" className="ws3-btn ws3-btn--primary ws3-btn--big" onClick={playD} autoFocus>
                [PLAY]
              </button>
              <button type="button" className="ws3-btn ws3-btn--ghost ws3-btn--big" onClick={skipD}>
                [SKIP]
              </button>
            </div>
          </section>
        </main>
      )}
      {phase === 'story-3' && <StoryScreen key="story3" beat={BEATS.story3} onContinue={() => setPhase('tut-D')} />}
      {phase === 'tut-D' && <TutorialScreen module="D" onContinue={() => setPhase('D')} />}
      {phase === 'D' && (
        <ModuleD
          cas={cas}
          seed={seed}
          fx={fx}
          timeLeft={timeLeft}
          onScore={(d) => {
            scoresRef.current = { ...scoresRef.current, d };
            setScores((x) => ({ ...x, d }));
          }}
          onStat={(k) => bump('D', k)}
          onDone={doneD}
        />
      )}

      {phase === 'ending' && result && <StoryScreen key={`end-${endBeat.id}`} beat={endBeat} extra={endExtra} onContinue={() => setPhase('done')} />}
      {phase === 'done' && result && <SummaryScreen result={result} twins={result.outcome === 'complete' ? cas.twins : undefined} onRestart={restart} />}

      {flashKey > 0 && <div key={flashKey} className="ws3-flash" aria-hidden="true" />}
    </div>
  );
}
