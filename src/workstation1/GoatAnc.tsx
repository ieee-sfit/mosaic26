import { useSession } from '../session/sessionContext';
import { CockpitBackdrop } from './components/CockpitBackdrop';
import { useRef, useState } from 'react';
import './goatAnc.css';
import { QUESTION_BANK, SCORING } from './mockStation1Data';
import { ShakeContext, useScreenShake } from './hooks/useScreenShake';
import { useCountdown } from './hooks/useCountdown';
import { pickRandom } from './utils/pick';
import { maxTotals, sum } from './utils/scoring';
import type { EndReason, HandshakeResult, McqQuestion, Phase, QuestionResult, RoundResult, Station1Result, StepResult } from './types';
import { Launcher } from './components/Launcher';
import { ModuleA } from './components/ModuleA';
import { ModuleB } from './components/ModuleB';
import { ModuleC } from './components/ModuleC';
import { ModuleD } from './components/ModuleD';
import { BonusOffer } from './components/BonusOffer';
import { SummaryScreen } from './components/SummaryScreen';
import { StoryScreen } from './components/StoryScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { TimerBadge } from './components/TimerBadge';
import { BEATS, D_ENDING_LINE, type StoryBeat } from './story/story';

interface HostProps {
  /** Fired once when the run ends (complete or timed out). */
  onComplete?: (result: Station1Result) => void;
  /** Back to the launcher, so a replay is re-verified and counted against the attempt cap. */
  onOpenStationChooser?: () => void;
}

/** Story and tutorial screens in play order. Every one of them runs with the shift clock paused. */
const STORY_PHASES: Partial<Record<Phase, { beat: keyof typeof BEATS; next: Phase }>> = {
  opening: { beat: 'opening', next: 'tutA' },
  story1: { beat: 'story1', next: 'tutB' },
  story2: { beat: 'story2', next: 'tutC' },
  story3: { beat: 'story3', next: 'tutD' },
};
const TUTORIAL_PHASES: Partial<Record<Phase, { module: 'A' | 'B' | 'C' | 'D'; next: Phase }>> = {
  tutA: { module: 'A', next: 'moduleA' },
  tutB: { module: 'B', next: 'moduleB' },
  tutC: { module: 'C', next: 'moduleC' },
  tutD: { module: 'D', next: 'moduleD' },
};

/**
 * Station 1 · GOAT ANC.
 * Flow: [launch countdown] → opening → tutorial A → Module A → story 1 → tutorial B → Module B → story 2 → tutorial C → Module C →
 * bonus offer → (story 3 → tutorial D → Module D) → ending → debrief. The shift clock runs only inside Modules A–D.
 */
export default function GoatAnc({ onComplete, onOpenStationChooser }: HostProps) {
  const [run, setRun] = useState(0);
  return <Session key={run} onComplete={onComplete} onRestart={onOpenStationChooser ?? (() => setRun((n) => n + 1))} />;
}

function Session({ onComplete, onRestart }: HostProps & { onRestart: () => void }) {
  const session = useSession() as { p1_id?: string; p2_id?: string } | null;
  const preset: [string, string] | null =
    session && /^\d{6}$/.test(session.p1_id ?? '') && /^\d{6}$/.test(session.p2_id ?? '')
      ? [session.p1_id as string, session.p2_id as string]
      : null;
  // With both IDs already verified by the arcade launcher, Station 1's own ID screen is skipped; it stays only as a standalone fallback.
  const [phase, setPhase] = useState<Phase>(preset ? 'opening' : 'launcher');
  const [operators, setOperators] = useState<[string, string]>(preset ?? ['', '']);
  const [questions, setQuestions] = useState<McqQuestion[]>(() => (preset ? pickRandom(QUESTION_BANK, SCORING.moduleA.questionCount) : []));
  const [a, setA] = useState<QuestionResult[]>([]);
  const [b, setB] = useState<StepResult[]>([]);
  const [c, setC] = useState<RoundResult[]>([]);
  const [cCleared, setCCleared] = useState(false);
  const [result, setResult] = useState<Station1Result | null>(null);
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const { ref, shake } = useScreenShake();

  const phaseRef = useRef<Phase>(phase);
  /** Fixed the moment Module C ends: the speed bonus and time left do not change while Module D is played. */
  const frozen = useRef<{ seconds: number } | null>(null);
  const emitted = useRef(false);
  const times = useRef({ A: 0, B: 0, C: 0, D: 0 });
  const mark = useRef<{ p: Phase; at: number }>({ p: phase, at: Date.now() });
  const MODULE_OF: Partial<Record<Phase, 'A' | 'B' | 'C' | 'D'>> = { moduleA: 'A', moduleB: 'B', moduleC: 'C', moduleD: 'D' };

  /** Every phase change goes through here so the debrief can show the time spent in each module. */
  const go = (next: Phase) => {
    const m = MODULE_OF[mark.current.p];
    if (m) times.current[m] += Math.round((Date.now() - mark.current.at) / 1000);
    mark.current = { p: next, at: Date.now() };
    phaseRef.current = next;
    setPhase(next);
  };

  // The shared clock runs ONLY while a module is actually being played: never on story, tutorial or bonus-offer screens,
  // and not once the last Module C target is down (the speed bonus is frozen there).
  const clockRunning = phase === 'moduleA' || phase === 'moduleB' || (phase === 'moduleC' && !cCleared) || phase === 'moduleD';
  const seconds = useCountdown(SCORING.totalSeconds, clockRunning, () => {
    // Module D ends itself when it sees the clock at 0 (points already earned stay); A, B and C end the run as a failure.
    const p = phaseRef.current;
    if (p === 'moduleA' || p === 'moduleB' || p === 'moduleC') emit('TIME_EXPIRED', 0);
  });

  // Red emergency lighting when the clock is nearly out
  const alarm = clockRunning && seconds <= 120;

  /** Builds the result and hands it to the host exactly once, then shows the ending. */
  function emit(endReason: EndReason, secondsRemaining: number, d: HandshakeResult[] = [], ending: 'success' | 'fail' | null = null) {
    if (emitted.current) return;
    emitted.current = true;
    const m = MODULE_OF[mark.current.p];
    if (m) times.current[m] += Math.round((Date.now() - mark.current.at) / 1000);
    mark.current = { p: 'ending', at: Date.now() };
    const scoreA = sum(a);
    const scoreB = sum(b);
    const scoreC = sum(c);
    const scoreD = Math.round(d.reduce((n, x) => n + x.points, 0) * 100) / 100;
    const final: Station1Result = {
      operators,
      endReason,
      secondsRemaining,
      moduleA: a,
      moduleB: b,
      moduleC: c,
      moduleD: d,
      scoreA,
      scoreB,
      scoreC,
      scoreD,
      dPlayed: d.length > 0,
      dEnding: ending,
      moduleSeconds: { ...times.current },
      total: scoreA + scoreB + scoreC,
      maxTotal: maxTotals(SCORING).total,
    };
    setResult(final);
    phaseRef.current = 'ending';
    setPhase('ending');
    onComplete?.(final);
  }

  /** The last Module C target is down: freeze the time left (and with it the speed bonus) and stop the clock. */
  const clearedC = () => {
    if (frozen.current) return;
    frozen.current = { seconds };
    setCCleared(true);
  };

  /** Module C is finished. Offer the bonus only with at least 90 s of shift time left, otherwise go straight to the ending. */
  const finishC = () => {
    const f = frozen.current;
    if (!f || phaseRef.current !== 'moduleC') return;
    if (f.seconds >= SCORING.moduleD.offerMinSeconds) go('offer');
    else emit('COMPLETE', f.seconds);
  };

  const skipD = () => {
    const f = frozen.current;
    if (f && phaseRef.current === 'offer') emit('COMPLETE', f.seconds);
  };
  const playD = () => {
    if (phaseRef.current === 'offer') go('story3');
  };
  const doneD = (results: HandshakeResult[], _total: number, ending: 'success' | 'fail') => {
    const f = frozen.current;
    if (f && phaseRef.current === 'moduleD') emit('COMPLETE', f.seconds, results, ending);
  };

  const launch = (ops: [string, string]) => {
    setOperators(ops);
    setQuestions(pickRandom(QUESTION_BANK, SCORING.moduleA.questionCount));
    go('opening');
  };

  const story = STORY_PHASES[phase];
  const tutorial = TUTORIAL_PHASES[phase];
  const endingBeat: StoryBeat | null = phase === 'ending' && result ? (result.endReason === 'COMPLETE' ? BEATS.success : BEATS.fail) : null;
  const endingExtra = result && result.endReason === 'COMPLETE' && result.dPlayed ? [D_ENDING_LINE[result.dEnding === 'success' ? 'success' : 'fail']] : undefined;

  return (
    <ShakeContext.Provider value={shake}>
      <div ref={ref} className={`goat-root ${alarm ? 'goat-alarm' : ''}`}>
        <CockpitBackdrop />
        <TimerBadge seconds={seconds} total={SCORING.totalSeconds} armed={clockRunning} />
        {phase === 'launcher' && <Launcher onLaunch={launch} preset={preset} />}
        {story && <StoryScreen key={phase} beat={BEATS[story.beat]} onContinue={() => go(story.next)} />}
        {tutorial && <TutorialScreen key={phase} module={tutorial.module} onContinue={() => go(tutorial.next)} />}
        {phase === 'moduleA' && (
          <ModuleA questions={questions} operators={operators} onRecord={(r) => setA((x) => [...x, r])} onComplete={() => go('story1')} />
        )}
        {phase === 'moduleB' && (
          <ModuleB operators={operators} onRecord={(r) => setB((x) => [...x, r])} onComplete={() => go('story2')} />
        )}
        {phase === 'moduleC' && (
          <ModuleC operators={operators} onRecord={(r) => setC((x) => [...x, r])} onCleared={clearedC} onFinish={finishC} />
        )}
        {phase === 'offer' && <BonusOffer secondsLeft={frozen.current?.seconds ?? 0} onPlay={playD} onSkip={skipD} />}
        {phase === 'moduleD' && <ModuleD seed={seed} operators={operators} secondsLeft={seconds} onDone={doneD} />}
        {endingBeat && <StoryScreen key="ending" beat={endingBeat} extra={endingExtra} onContinue={() => go('summary')} />}
        {phase === 'summary' && result && <SummaryScreen result={result} onRestart={onRestart} />}
      </div>
    </ShakeContext.Provider>
  );
}
