import { useEffect, useRef, useState } from 'react';
import { STATION2_CONFIG } from '../mockStation2Data';
import { fmt, itemPoints, pickQuestions } from '../logic';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import type { Track } from '../Station2';

interface Props {
  onScore: (total: number) => void;
  onDone: () => void;
  onShake: () => void;
  track: Track;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const PER_Q = STATION2_CONFIG.moduleMax.A / STATION2_CONFIG.questionsPerRun;

/** `removed` is the wrong option Hint 1 took away (null until Hint 1 is used). */
interface QState { hint: HintLevel; wrong: number[]; removed: number | null; picked: number | null; pts: number | null }
const blank = (): QState => ({ hint: 0, wrong: [], removed: null, picked: null, pts: null });

/** Module A: three questions on a paper timing sheet. Tap an answer to submit it. */
export default function ModuleA({ onScore, onDone, onShake, track }: Props) {
  const [questions] = useState(() => pickQuestions());
  const [qi, setQi] = useState(0);
  const [st, setSt] = useState<QState[]>(() => questions.map(blank));
  const [msg, setMsg] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const q = questions[qi];
  const s = st[qi];
  const done = s.pts !== null;
  const total = st.reduce((n, x) => n + (x.pts ?? 0), 0);

  const patch = (p: Partial<QState>) => setSt((all) => all.map((x, i) => (i === qi ? { ...x, ...p } : x)));

  const settle = (pts: number, picked: number, hint: HintLevel, text: string) => {
    patch({ pts, picked, hint });
    onScore(total + pts);
    setMsg(text);
    timer.current = window.setTimeout(() => {
      setMsg('');
      if (qi + 1 >= questions.length) onDone();
      else setQi(qi + 1);
    }, 1000);
  };

  const choose = (n: number) => {
    if (done || s.wrong.includes(n) || s.removed === n) return;
    if (n === q.correct) {
      const pts = itemPoints(PER_Q, s.hint, s.wrong.length);
      settle(pts, n, s.hint, `LOCKED · +${fmt(pts, 1)}`);
    } else {
      patch({ wrong: [...s.wrong, n] });
      setMsg(`OPTION ${LETTERS[n]} REJECTED · -${STATION2_CONFIG.wrongAnswerPenalty * 100}%`);
      track('A', 'wrong', `Q${qi + 1}`);
      onShake();
    }
  };

  const hint = (next: 1 | 2) => {
    if (done || s.hint >= next) return;
    track('A', 'hint', `Q${qi + 1} H${next}`);
    if (next === 1) {
      // Hint 1 takes away ONE wrong option that is still on the sheet
      const open = q.options.map((_, i) => i).filter((i) => i !== q.correct && !s.wrong.includes(i));
      patch({ hint: 1, removed: open.length ? open[Math.floor(Math.random() * open.length)] : null });
    }
    else settle(0, q.correct, 2, 'AUTO-SUBMITTED · 0 PTS');
  };

  return (
    <section className="ws2-modA ws2-in" aria-label="Module A pit telemetry">
      <div className="ws2-modhead">
        <b>MODULE A</b><span>PIT TELEMETRY</span>
        <em>{fmt(total, 1)} / {STATION2_CONFIG.moduleMax.A}</em>
      </div>

      <article className="ws2-sheet">
        <header className="ws2-sheet__head">
          <b>TIMING SHEET</b>
          <span>QUESTION {qi + 1} / {questions.length}</span>
          <span>{fmt(PER_Q, 1)} PTS</span>
        </header>

        <p className="ws2-sheet__q" key={q.id}>{q.prompt}</p>

        <ol className="ws2-sheet__opts">
          {q.options.map((opt, n) => {
            const removed = s.removed === n;
            const rejected = s.wrong.includes(n) || removed;
            const right = done && s.picked === n;
            return (
              <li key={n}>
                <button
                  type="button" disabled={done || rejected} onClick={() => choose(n)}
                  className={`ws2-opt ${rejected ? 'is-struck' : ''} ${removed ? 'is-removed' : ''} ${right ? 'is-right' : ''}`}
                >
                  <span className="ws2-opt__box">{LETTERS[n]}</span>
                  <span className="ws2-opt__text">{opt}</span>
                  {removed && <i className="ws2-stamp ws2-stamp--out" aria-hidden>REMOVED</i>}
                  {right && <i className="ws2-stamp" aria-hidden>LOCKED</i>}
                </button>
              </li>
            );
          })}
        </ol>

        <footer className="ws2-sheet__foot">
          <span className="ws2-pips-row" aria-hidden>
            {questions.map((_, i) => <i key={i} className={st[i].pts !== null ? 'on' : i === qi ? 'now' : ''} />)}
          </span>
          <span className="ws2-sheet__msg" role="status">{msg || ' '}</span>
          <span>WRONG {s.wrong.length}</span>
        </footer>
      </article>

      <HintDock
        level={s.hint}
        itemLabel={`QUESTION ${qi + 1}/${questions.length}`}
        hint1Text={s.removed !== null ? `Option [${LETTERS[s.removed]}] is wrong and has been removed.` : 'No wrong option left to remove.'}
        hint2Text={`Option [${LETTERS[q.correct]}] was submitted for you. This question scores 0.`}
        cost1={STATION2_CONFIG.hintPenalty.hint1}
        disabled={done}
        onHint={hint}
      />
    </section>
  );
}
