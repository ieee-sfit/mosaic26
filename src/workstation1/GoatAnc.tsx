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
import { ColorMapCard } from './components/ColorMapCard';
import { BonusOffer } from './components/BonusOffer';
import { SummaryScreen } from './components/SummaryScreen';
import { TimerBadge } from './components/TimerBadge';

interface HostProps {
  /** Fired once when the run ends (complete, timed out, or hull breach). */
  onComplete?: (result: Station1Result) => void;
  /** Back to the launcher, so a replay is re-verified and counted against the attempt cap. */
  onOpenStationChooser?: () => void;
}

/** Station 1 · GOAT ANC. Flow: Launcher → Module A → Module B → colour key → Module C → (bonus offer → Module D) → Summary. */
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
  const [phase, setPhase] = useState<Phase>('launcher');
  const [operators, setOperators] = useState<[string, string]>(['', '']);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [a, setA] = useState<QuestionResult[]>([]);
  const [b, setB] = useState<StepResult[]>([]);
  const [c, setC] = useState<RoundResult[]>([]);
  const [hull, setHull] = useState(SCORING.moduleC.hullPips);
  const [result, setResult] = useState<Station1Result | null>(null);
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const [dDeadline, setDDeadline] = useState(0);
  const { ref, shake } = useScreenShake();

  const phaseRef = useRef<Phase>(phase);
  /** Fixed the moment Module C ends: the speed bonus and time left do not change while Module D is played. */
  const frozen = useRef<{ endReason: EndReason; hull: number; seconds: number } | null>(null);
  const emitted = useRef(false);
  const times = useRef({ A: 0, B: 0, C: 0, D: 0 });
  const mark = useRef<{ p: Phase; at: number }>({ p: 'launcher', at: Date.now() });
  const MODULE_OF: Partial<Record<Phase, 'A' | 'B' | 'C' | 'D'>> = { moduleA: 'A', moduleB: 'B', moduleC: 'C', moduleD: 'D' };

  /** Every phase change goes through here so the debrief can show the time spent in each module. */
  const go = (next: Phase) => {
    const m = MODULE_OF[mark.current.p];
    if (m) times.current[m] += Math.round((Date.now() - mark.current.at) / 1000);
    mark.current = { p: next, at: Date.now() };
    phaseRef.current = next;
    setPhase(next);
  };

  const clockRunning = phase === 'moduleA' || phase === 'moduleB' || phase === 'mapC' || phase === 'moduleC' || phase === 'moduleD';
  // Module D ends itself at its own deadline (never later than the shift clock), so the shift clock's expiry must not end the run there.
  const seconds = useCountdown(SCORING.totalSeconds, clockRunning, () => {
    if (phaseRef.current !== 'moduleD') finish('TIME_EXPIRED', hull);
  });

  // Red emergency lighting when the clock is nearly out or the hull is down to its last pip
  const alarm = clockRunning && (seconds <= 120 || hull <= 1);

  /** Builds the result and hands it to the host exactly once. */
  function emit(endReason: EndReason, hullLeft: number, secondsRemaining: number, d: HandshakeResult[] = [], ending: 'success' | 'fail' | null = null) {
    if (emitted.current) return;
    emitted.current = true;
    const m = MODULE_OF[mark.current.p];
    if (m) times.current[m] += Math.round((Date.now() - mark.current.at) / 1000);
    mark.current = { p: 'summary', at: Date.now() };
    const scoreA = sum(a);
    const scoreB = sum(b);
    const scoreC = sum(c);
    const scoreD = Math.round(d.reduce((n, x) => n + x.points, 0) * 100) / 100;
    const final: Station1Result = {
      operators,
      endReason,
      secondsRemaining,
      hullPips: hullLeft,
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
    setHull(hullLeft);
    setResult(final);
    phaseRef.current = 'summary';
    setPhase('summary');
    onComplete?.(final);
  }

  /**
   * The run is over, or Module C just ended. A completed Module C with shift time left is NOT emitted yet: the speed bonus and
   * time left are frozen here and the bonus is offered first. Everything else ends exactly as before.
   */
  function finish(endReason: EndReason, hullLeft: number) {
    if (result || emitted.current || frozen.current) return;
    const left = endReason === 'TIME_EXPIRED' ? 0 : seconds;
    if (endReason === 'COMPLETE' && left > 0) {
      frozen.current = { endReason, hull: hullLeft, seconds: left };
      setHull(hullLeft);
      go('offer');
      return;
    }
    emit(endReason, hullLeft, left);
  }

  const skipD = () => {
    const f = frozen.current;
    if (f && phaseRef.current === 'offer') emit(f.endReason, f.hull, f.seconds);
  };
  const playD = () => {
    const f = frozen.current;
    if (!f || phaseRef.current !== 'offer') return;
    setDDeadline(Date.now() + Math.min(SCORING.moduleD.maxSeconds, f.seconds) * 1000);
    go('moduleD');
  };
  const doneD = (results: HandshakeResult[], _total: number, ending: 'success' | 'fail') => {
    const f = frozen.current;
    if (f && phaseRef.current === 'moduleD') emit(f.endReason, f.hull, f.seconds, results, ending);
  };

  const launch = (ops: [string, string]) => {
    setOperators(ops);
    setQuestions(pickRandom(QUESTION_BANK, SCORING.moduleA.questionCount));
    go('moduleA');
  };

  return (
    <ShakeContext.Provider value={shake}>
      <div ref={ref} className={`goat-root ${alarm ? 'goat-alarm' : ''}`}>
        <CockpitBackdrop />
        <TimerBadge seconds={seconds} total={SCORING.totalSeconds} armed={clockRunning} />
        {phase === 'launcher' && <Launcher onLaunch={launch} preset={preset} />}
        {phase === 'moduleA' && (
          <ModuleA questions={questions} operators={operators} onRecord={(r) => setA((x) => [...x, r])} onComplete={() => go('moduleB')} />
        )}
        {phase === 'moduleB' && (
          <ModuleB operators={operators} onRecord={(r) => setB((x) => [...x, r])} onComplete={() => go('mapC')} />
        )}
        {phase === 'mapC' && <ColorMapCard operators={operators} onContinue={() => go('moduleC')} />}
        {phase === 'moduleC' && (
          <ModuleC operators={operators} onRecord={(r) => setC((x) => [...x, r])} onHullChange={setHull} onFinish={finish} />
        )}
        {phase === 'offer' && <BonusOffer secondsLeft={frozen.current?.seconds ?? 0} onPlay={playD} onSkip={skipD} />}
        {phase === 'moduleD' && <ModuleD seed={seed} operators={operators} deadline={dDeadline} onDone={doneD} />}
        {phase === 'summary' && result && <SummaryScreen result={result} onRestart={onRestart} />}
      </div>
    </ShakeContext.Provider>
  );
}
