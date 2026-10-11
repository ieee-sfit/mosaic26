import { useState, type FormEvent } from 'react';
import type { LookupProblemDef, SheetColumn } from '../types';
import { HudPanel } from './HudPanel';

interface Props {
  problem: LookupProblemDef;
  columns: SheetColumn[];
  answers: string[]; // expected, used only for display of verified steps
  done: number;
  wrong: number[]; // wrong attempts per step
  onSubmit: (stepIndex: number, value: string) => boolean;
  accent: 'cyan' | 'gold';
}

const colLabel = (cols: SheetColumn[], n: number) => cols.find((c) => c.index === n)?.label ?? `COL_${n}`;

export function Datapad({ problem, columns, answers, done, wrong, onSubmit, accent }: Props) {
  const [value, setValue] = useState('');
  const [bad, setBad] = useState(0);
  const complete = done >= problem.steps.length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    if (onSubmit(done, value)) {
      setValue('');
      setBad(0);
    } else {
      setBad((n) => n + 1);
    }
  };

  return (
    <HudPanel
      title={problem.title}
      tag={`UNIT: ${problem.designation}`}
      tone={complete ? 'lock' : accent}
      cut="both"
      chamfer={18}
      className="h-full"
      bodyClassName="flex flex-col gap-3 p-3"
    >
      {/* rugged rivets */}
      {[['left-1.5', 'top-1.5'], ['right-1.5', 'top-1.5'], ['left-1.5', 'bottom-1.5'], ['right-1.5', 'bottom-1.5']].map(([x, y]) => (
        <span key={x + y} className={`absolute ${x} ${y} h-1.5 w-1.5 bg-goat-mute/50`} aria-hidden />
      ))}

      <p className="border-l-2 border-goat-gold/70 pl-2 font-tele text-[11px] leading-relaxed text-goat-mute">{problem.brief}</p>
      <div className="flex items-center justify-between bg-goat-void px-2.5 py-1.5 font-tele text-[11px] uppercase tracking-wider">
        <span className="text-goat-mute">SEED_KEY</span>
        <span className="text-base font-bold text-goat-gold">{problem.seed}</span>
      </div>

      <ol className="flex flex-col gap-2">
        {problem.steps.map((step, i) => {
          const state = i < done ? 'ok' : i === done ? 'active' : 'locked';
          const key = i === 0 ? problem.seed : answers[i - 1];
          return (
            <li
              key={i}
              className={`chamfer-tr relative border-l-4 px-3 py-2 ${
                state === 'ok'
                  ? 'border-goat-lock bg-goat-lock/10'
                  : state === 'active'
                    ? `bg-goat-deck ${accent === 'cyan' ? 'border-goat-cyan' : 'border-goat-gold'} ${bad ? 'shadow-[inset_0_0_0_1px_#ef4444]' : ''}`
                    : 'border-goat-mute/30 bg-goat-void/60 opacity-50'
              }`}
              style={{ ['--c' as string]: '10px' }}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <div className="flex items-center justify-between font-tele text-[10px] uppercase tracking-widest">
                <span className={state === 'ok' ? 'text-goat-lock' : state === 'active' ? 'text-goat-cyan' : 'text-goat-mute'}>
                  STEP {i + 1}/{problem.steps.length}
                </span>
                <span className="text-goat-mute">
                  {state === 'ok' ? '✔ VERIFIED' : state === 'active' ? (wrong[i] ? `ATTEMPTS: ${wrong[i]}` : 'AWAITING INPUT') : '🔒 LOCKED'}
                </span>
              </div>

              {state === 'locked' ? (
                <div className="mt-1 font-tele text-xs text-goat-mute">
                  MATCH COL {step.matchColumn} → READ COL {step.readColumn}
                </div>
              ) : (
                <div className="mt-1 font-tele text-xs leading-relaxed text-goat-cyan/90">
                  FIND <b className="text-white">{key}</b> IN{' '}
                  <b className="text-goat-gold">COL {step.matchColumn}</b> <span className="text-goat-mute">[{colLabel(columns, step.matchColumn)}]</span>
                  <br />
                  READ <b className="text-goat-gold">COL {step.readColumn}</b> <span className="text-goat-mute">[{colLabel(columns, step.readColumn)}]</span>
                </div>
              )}

              {state === 'ok' && <div className="mt-1 font-tele text-lg font-bold text-goat-lock">{answers[i]}</div>}

              {state === 'active' && (
                <form onSubmit={submit} className="mt-2 flex gap-2" noValidate>
                  <input
                    aria-label={`${problem.id} step ${i + 1} answer`}
                    value={value}
                    onChange={(e) => setValue(e.target.value.toUpperCase())}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ENTER VALUE"
                    className="min-w-0 flex-1 border-0 bg-goat-void px-2.5 py-2 font-tele text-base font-bold tracking-widest text-goat-cyan outline-none placeholder:text-xs placeholder:font-normal placeholder:text-goat-mute/60 focus:shadow-[inset_0_-2px_0_#00f2fe]"
                  />
                  <button type="submit" className="tac-btn bg-goat-cyan px-4 text-xs font-bold text-goat-void">
                    VERIFY
                  </button>
                </form>
              )}
              {state === 'active' && bad > 0 && (
                <div key={bad} className="goat-slide-in mt-1 font-tele text-[10px] uppercase tracking-wider text-goat-crimson" role="alert">
                  ✖ MISMATCH — RE-CHECK COL {step.matchColumn} / COL {step.readColumn}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {complete && (
        <div className="goat-rise border border-goat-lock/50 bg-goat-lock/10 px-3 py-2 text-center font-tele text-[11px] font-bold uppercase tracking-[0.2em] text-goat-lock">
          ISSUE RESOLVED · 100%
        </div>
      )}
    </HudPanel>
  );
}
