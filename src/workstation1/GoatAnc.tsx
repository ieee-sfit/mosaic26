import { useSession } from '../session/sessionContext';
import { useState } from 'react';
import './goatAnc.css';
import { QUESTION_BANK, SCORING } from './mockStation1Data';
import { ShakeContext, useScreenShake } from './hooks/useScreenShake';
import { useCountdown } from './hooks/useCountdown';
import { pickRandom } from './utils/pick';
import { maxTotals, sum } from './utils/scoring';
import type { EndReason, McqQuestion, Phase, QuestionResult, RoundResult, Station1Result, StepResult } from './types';
import { Launcher } from './components/Launcher';
import { ModuleA } from './components/ModuleA';
import { ModuleB } from './components/ModuleB';
import { ModuleC } from './components/ModuleC';
import { SummaryScreen } from './components/SummaryScreen';
import { TimerBadge } from './components/TimerBadge';

interface HostProps {
  /** Fired once when the run ends (complete, timed out, or hull breach). */
  onComplete?: (result: Station1Result) => void;
}

/** Station 1 · GOAT ANC. Flow: Launcher → Module A → Module B → Module C → Summary. */
export default function GoatAnc({ onComplete }: HostProps) {
  const [run, setRun] = useState(0);
  return <Session key={run} onComplete={onComplete} onRestart={() => setRun((n) => n + 1)} />;
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
  const { ref, shake } = useScreenShake();

  const clockRunning = phase === 'moduleA' || phase === 'moduleB' || phase === 'moduleC';
  const seconds = useCountdown(SCORING.totalSeconds, clockRunning, () => finish('TIME_EXPIRED', hull));

  function finish(endReason: EndReason, hullLeft: number) {
    if (result) return;
    const scoreA = sum(a);
    const scoreB = sum(b);
    const scoreC = sum(c);
    const final: Station1Result = {
      operators,
      endReason,
      secondsRemaining: endReason === 'TIME_EXPIRED' ? 0 : seconds,
      hullPips: hullLeft,
      moduleA: a,
      moduleB: b,
      moduleC: c,
      scoreA,
      scoreB,
      scoreC,
      total: scoreA + scoreB + scoreC,
      maxTotal: maxTotals(SCORING).total,
    };
    setHull(hullLeft);
    setResult(final);
    setPhase('summary');
    onComplete?.(final);
  }

  const launch = (ops: [string, string]) => {
    setOperators(ops);
    setQuestions(pickRandom(QUESTION_BANK, SCORING.moduleA.questionCount));
    setPhase('moduleA');
  };

  return (
    <ShakeContext.Provider value={shake}>
      <div ref={ref} className="goat-root">
        <TimerBadge seconds={seconds} total={SCORING.totalSeconds} armed={clockRunning} />
        {phase === 'launcher' && <Launcher onLaunch={launch} preset={preset} />}
        {phase === 'moduleA' && (
          <ModuleA questions={questions} operators={operators} onRecord={(r) => setA((x) => [...x, r])} onComplete={() => setPhase('moduleB')} />
        )}
        {phase === 'moduleB' && (
          <ModuleB operators={operators} onRecord={(r) => setB((x) => [...x, r])} onComplete={() => setPhase('moduleC')} />
        )}
        {phase === 'moduleC' && (
          <ModuleC operators={operators} onRecord={(r) => setC((x) => [...x, r])} onHullChange={setHull} onFinish={finish} />
        )}
        {phase === 'summary' && result && <SummaryScreen result={result} onRestart={onRestart} />}
      </div>
    </ShakeContext.Provider>
  );
}
