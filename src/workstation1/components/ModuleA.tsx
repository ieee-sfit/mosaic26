import { useState } from 'react';
import { CHEAT_SHEET_COLUMNS, SCORING } from '../mockStation1Data';
import { useShake } from '../hooks/useScreenShake';
import { scoreQuestion } from '../utils/scoring';
import type { McqQuestion, QuestionResult } from '../types';
import HintDock from '../../core/HintDock';
import { HudPanel, TeleChip } from './HudPanel';
import { ModuleHeader } from './ModuleHeader';
import { StarshipWireframe } from './StarshipWireframe';

interface Props {
  questions: McqQuestion[];
  operators: [string, string];
  onRecord: (r: QuestionResult) => void;
  onComplete: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface QState {
  hints: 0 | 1 | 2;
  wrong: number[]; // locked-out option indexes
  picked: number | null; // correct (or auto-selected) option
}
const fresh = (): QState => ({ hints: 0, wrong: [], picked: null });

export function ModuleA({ questions, operators, onRecord, onComplete }: Props) {
  const cfg = SCORING.moduleA;
  const shake = useShake();
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState<QState>(fresh);
  const [flashKey, setFlashKey] = useState<{ kind: 'bad' | 'ok'; n: number } | null>(null);

  const question = questions[idx];
  const solved = q.picked !== null;
  const last = idx === questions.length - 1;
  const potential = scoreQuestion(cfg, q.hints, q.wrong.length);
  const column = CHEAT_SHEET_COLUMNS.find((c) => c.index === question.cheatSheetColumn);

  const record = (picked: number, hints: 0 | 1 | 2, wrongCount: number) => {
    onRecord({
      questionId: question.id,
      correct: true,
      hintsUsed: hints,
      wrongAttempts: wrongCount,
      points: scoreQuestion(cfg, hints, wrongCount),
      maxPoints: cfg.pointsPerQuestion,
    });
    setQ((s) => ({ ...s, picked }));
  };

  const choose = (i: number) => {
    if (solved || q.wrong.includes(i)) return;
    if (i === question.correctIndex) {
      record(i, q.hints, q.wrong.length);
      setFlashKey((f) => ({ kind: 'ok', n: (f?.n ?? 0) + 1 }));
    } else {
      setQ((s) => ({ ...s, wrong: [...s.wrong, i] }));
      setFlashKey((f) => ({ kind: 'bad', n: (f?.n ?? 0) + 1 }));
      shake('light');
    }
  };

  const requestIntel = (next: 1 | 2) => {
    if (solved || q.hints >= next) return;
    setQ((s) => ({ ...s, hints: next }));
    // Hint 2 submits the correct answer for the player (0 pts)
    if (next === 2) record(question.correctIndex, 2, q.wrong.length);
  };

  const advance = () => {
    if (!solved) return;
    if (last) {
      onComplete();
    } else {
      setIdx(idx + 1);
      setQ(fresh());
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ModuleHeader code="MODULE A" title="Flight Telemetry Checks" tag="SENSOR_BUS_ANOMALY" operators={operators} steps={3} active={0} />

      {flashKey && <div key={`${flashKey.kind}${flashKey.n}`} className={flashKey.kind === 'bad' ? 'hull-flash' : 'ok-flash'} />}

      <div className="grid flex-1 gap-3 p-3 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <HudPanel title="Sensor Anomaly Display" tag={`ITER_ZONE: ${question.anomaly.zone.replace('_', '-')}`} tone={question.anomaly.severity === 'critical' ? 'crimson' : 'gold'} className="min-h-[360px]">
          <StarshipWireframe anomaly={question.anomaly} />
        </HudPanel>

        <HudPanel title={`Tactical Query ${idx + 1}/${questions.length}`} tag={`${question.id} · YIELD ${potential} PTS`} cut="both" bodyClassName="flex flex-col gap-4 p-4">
          <div key={question.id} className="goat-slide-in">
            <div className="mb-2 flex gap-1" aria-hidden>
              {questions.map((_, i) => (
                <span key={i} className={`h-1 flex-1 ${i < idx ? 'bg-goat-lock' : i === idx ? 'bg-goat-cyan' : 'bg-goat-mute/30'}`} />
              ))}
            </div>
            <p className="font-hud text-xl font-semibold leading-snug text-white md:text-2xl">{question.prompt}</p>
          </div>

          <div role="group" aria-label="Answer options" className="grid gap-2.5">
            {question.options.map((opt, i) => {
              const isWrong = q.wrong.includes(i);
              const isRight = q.picked === i;
              const dim = solved && !isRight;
              const tone = isRight
                ? 'bg-goat-lock text-goat-void'
                : isWrong
                  ? 'bg-goat-crimson/15 text-goat-crimson/70 line-through'
                  : 'bg-goat-deck text-goat-cyan hover:bg-goat-cyan hover:text-goat-void';
              return (
                <button
                  key={i}
                  type="button"
                  disabled={solved || isWrong}
                  onClick={() => choose(i)}
                  className={`tac-btn flex items-center gap-3 px-5 py-3.5 text-left text-sm font-bold ${tone} ${dim ? 'opacity-40' : ''}`}
                >
                  <span className="font-tele text-base">[{LETTERS[i]}]</span>
                  <span className="font-hud text-[15px] normal-case tracking-normal">{opt}</span>
                  {isWrong && <span className="ml-auto font-tele text-[10px] tracking-widest">REJECTED</span>}
                  {isRight && <span className="ml-auto font-tele text-[10px] tracking-widest">{q.hints === 2 ? 'AUTO-LOCKED' : 'CONFIRMED'}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-2">
            <TeleChip label="HINT_1" value="-40% SCORE" tone="gold" />
            <TeleChip label="HINT_2" value="AUTO-SOLVE · 0 PTS" tone="crimson" />
            <TeleChip label="MISPICK" value={`-${cfg.wrongAttemptPenalty * 100}% EA`} tone="crimson" />
          </div>
        </HudPanel>
      </div>

      {/* lower action strip */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <div className="flex-1" />

          <span className="hidden font-tele text-[11px] uppercase tracking-widest text-goat-mute sm:inline">
            QUERY {idx + 1}/{questions.length}
          </span>
          <button
            type="button"
            onClick={advance}
            disabled={!solved}
            className={`tac-btn mr-1 px-6 py-3 text-xs font-bold ${solved ? 'bg-goat-cyan text-goat-void' : 'bg-goat-mute/20 text-goat-mute'}`}
          >
            {last ? '[ PROCEED ▸ MODULE B ]' : '[ NEXT QUERY ▸ ]'}
          </button>
        </div>
      </footer>
      <HintDock
        level={q.hints}
        itemLabel={`QUERY ${idx + 1}/${questions.length}`}
        hint1Text={`Check cheat-sheet column ${question.cheatSheetColumn}: ${column?.label ?? 'UNKNOWN'}.`}
        hint2Text="The correct option was submitted for you. This query scores 0."
        cost1={cfg.hint1Penalty}
        disabled={solved}
        onHint={requestIntel}
      />
    </div>
  );
}
