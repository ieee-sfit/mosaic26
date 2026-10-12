import { useEffect, useRef, useState } from 'react';
import {
  CHEAT_SHEET_COLUMNS,
  CONFIG,
  QUESTION_BANK,
  type ForensicQuestion,
  type Topic,
} from '../mockStation3Data';
import { shuffle, type Fx } from '../utils';
import { ActionBar, Readout } from './Hud';

interface Card {
  q: ForensicQuestion;
  options: { text: string; correct: boolean }[];
}

/** 3 questions, each from a different topic, options shuffled. */
const dealCards = (): Card[] => {
  const topics = shuffle<Topic>(['exposure', 'binarization', 'confidence', 'syntax']).slice(0, CONFIG.moduleA.questionCount);
  return topics.map((topic) => {
    const q = shuffle(QUESTION_BANK.filter((x) => x.topic === topic))[0];
    return { q, options: shuffle(q.options.map((text, i) => ({ text, correct: i === q.correct }))) };
  });
};

const KEYS = ['A', 'B', 'C', 'D'];
const ADVANCE_MS = 1100;

export default function ModuleA({
  onScore,
  onDone,
  fx,
}: {
  onScore: (delta: number) => void;
  onDone: () => void;
  fx: Fx;
}) {
  const [cards] = useState(dealCards);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [hint, setHint] = useState<0 | 1 | 2>(0);
  const [picked, setPicked] = useState<number | null>(null); // resolved option index
  const [earned, setEarned] = useState(0);
  const resolved = picked !== null;
  const card = cards[idx];
  const { pointsPerQuestion: perQ, wrongPenalty } = CONFIG.moduleA;
  const cheatCol = CHEAT_SHEET_COLUMNS.find((c) => c.id === card.q.cheatColumn);

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const resolve = (optionIdx: number, hintLevel: 0 | 1 | 2, wrongCount: number) => {
    const hintCut = hintLevel === 0 ? 0 : CONFIG.hintPenalty[hintLevel];
    const pts = Math.max(0, Math.round(perQ * (1 - hintCut)) - wrongCount * wrongPenalty);
    setPicked(optionIdx);
    setEarned(pts);
    onScore(pts);
    fx.flash();
  };

  const choose = (i: number) => {
    if (resolved || wrong.includes(i)) return;
    if (card.options[i].correct) {
      resolve(i, hint, wrong.length);
    } else {
      setWrong((w) => [...w, i]);
      fx.shake();
    }
  };

  const requestHint = () => {
    if (resolved || hint === 2) return;
    if (hint === 0) {
      setHint(1);
    } else {
      setHint(2);
      resolve(card.options.findIndex((o) => o.correct), 2, wrong.length);
    }
  };

  // advance to next card / finish module shortly after a question resolves
  useEffect(() => {
    if (!resolved) return;
    const t = setTimeout(() => {
      if (idx + 1 >= cards.length) {
        doneRef.current();
      } else {
        setIdx(idx + 1);
        setWrong([]);
        setHint(0);
        setPicked(null);
      }
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [resolved, idx, cards.length]);

  const hintLabel =
    hint === 0 ? 'HINT 1: CHEAT-SHEET COLUMN · −40% PTS' : hint === 1 ? 'HINT 2: AUTO-SELECT ANSWER · −100% PTS' : 'INTEL EXHAUSTED';

  return (
    <>
      <main className="ws3-main ws3-modA">
        <section className="ws3-panel ws3-qpanel">
          <div className="ws3-panel-tag">MOD_A // ANPR FORENSIC CHECK</div>
          <div className="ws3-qprogress" aria-label={`Question ${idx + 1} of ${cards.length}`}>
            {cards.map((c, i) => (
              <span key={c.q.id} className={`ws3-qpip ${i < idx ? 'is-done' : i === idx ? 'is-live' : ''}`}>
                Q{i + 1}
              </span>
            ))}
          </div>
          <p className="ws3-qtext" key={card.q.id}>{card.q.prompt}</p>

          <div className="ws3-options" role="group" aria-label="Answer options">
            {card.options.map((o, i) => {
              const state = resolved
                ? o.correct
                  ? 'is-correct'
                  : i === picked
                    ? 'is-wrong'
                    : 'is-dim'
                : wrong.includes(i)
                  ? 'is-wrong'
                  : '';
              return (
                <button
                  key={o.text}
                  type="button"
                  className={`ws3-opt ${state}`}
                  disabled={resolved || wrong.includes(i)}
                  onClick={() => choose(i)}
                >
                  <span className="ws3-opt-key">[{KEYS[i]}]</span>
                  <span className="ws3-opt-text">{o.text}</span>
                </button>
              );
            })}
          </div>

          <div className="ws3-qfeed" aria-live="polite">
            {hint >= 1 && cheatCol && (
              <div className="ws3-intel">
                ▸ DISPATCH INTEL: REFER TO CHEAT-SHEET <b>COLUMN {String(cheatCol.id).padStart(2, '0')}</b> — {cheatCol.label}
              </div>
            )}
            {hint === 2 && <div className="ws3-intel ws3-intel--red">▸ DISPATCH AUTO-SELECTED THE ANSWER · 0 PTS</div>}
            {resolved && hint < 2 && <div className="ws3-intel ws3-intel--ok">▸ CONFIRMED · +{earned} PTS</div>}
            {!resolved && wrong.length > 0 && <div className="ws3-intel ws3-intel--red">▸ MISREAD · −{wrongPenalty} PT PER WRONG PICK</div>}
          </div>
        </section>

        <aside className="ws3-panel ws3-scope" aria-hidden="true">
          <div className="ws3-panel-tag">RADAR SCOPE // LIVE</div>
          <svg viewBox="0 0 200 200" className="ws3-scope-svg">
            <circle cx="100" cy="100" r="86" className="ws3-scope-ring" />
            <circle cx="100" cy="100" r="58" className="ws3-scope-ring" />
            <circle cx="100" cy="100" r="30" className="ws3-scope-ring" />
            <line x1="14" y1="100" x2="186" y2="100" className="ws3-scope-axis" />
            <line x1="100" y1="14" x2="100" y2="186" className="ws3-scope-axis" />
            <g className="ws3-scope-sweep">
              <path d="M100 100 L100 14 A86 86 0 0 1 161 39 Z" />
            </g>
            <circle cx="138" cy="62" r="3.5" className="ws3-scope-blip" />
            <circle cx="70" cy="128" r="2.5" className="ws3-scope-blip ws3-scope-blip--b" />
          </svg>
          <Readout label="RADAR_SPEED" value="184_KMH" tone="warn" />
          <Readout label="ANPR_CONFIDENCE" value="42.0%" tone="bad" />
          <Readout label="Q_VALUE" value={`${perQ} PTS`} />
        </aside>
      </main>

      <ActionBar>
        <div className="ws3-bar-info">
          <span>MOD_A</span>
          <span>QUESTION {idx + 1}/{cards.length}</span>
          <span>{hintLabel}</span>
        </div>
        <button
          type="button"
          className="ws3-btn ws3-btn--hint"
          onClick={requestHint}
          disabled={resolved || hint === 2}
        >
          [REQUEST DISPATCH INTEL / HINT]
        </button>
      </ActionBar>
    </>
  );
}
