import { useEffect, useRef, useState } from 'react';
import {
  CONFIG,
  QUESTION_BANK,
  type ForensicQuestion,
  type Topic,
} from '../mockStation3Data';
import { shuffle, type Fx } from '../utils';
import { ActionBar, Readout } from './Hud';
import HintDock from '../../core/HintDock';

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
  const [removed, setRemoved] = useState<number | null>(null); // option struck out by Hint 1
  const [picked, setPicked] = useState<number | null>(null); // resolved option index
  const [earned, setEarned] = useState(0);
  const resolved = picked !== null;
  const card = cards[idx];
  const { pointsPerQuestion: perQ, wrongPenalty } = CONFIG.moduleA;

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
    if (resolved || wrong.includes(i) || removed === i) return;
    if (card.options[i].correct) {
      resolve(i, hint, wrong.length);
    } else {
      setWrong((w) => [...w, i]);
      fx.shake();
    }
  };

  const requestHint = (next: 1 | 2) => {
    if (resolved || hint >= next) return;
    setHint(next);
    // Hint 1 strikes out one wrong option that has not been tried yet
    if (next === 1) {
      const left = card.options.map((o, i) => (!o.correct && !wrong.includes(i) ? i : -1)).filter((i) => i >= 0);
      if (left.length) setRemoved(left[Math.floor(Math.random() * left.length)]);
    }
    // Hint 2 selects the right answer and submits it for the player (0 pts)
    if (next === 2) resolve(card.options.findIndex((o) => o.correct), 2, wrong.length);
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
        setRemoved(null);
        setPicked(null);
      }
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [resolved, idx, cards.length]);

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
                  : removed === i
                    ? 'is-removed'
                    : '';
              return (
                <button
                  key={o.text}
                  type="button"
                  className={`ws3-opt ${state}`}
                  disabled={resolved || wrong.includes(i) || removed === i}
                  onClick={() => choose(i)}
                >
                  <span className="ws3-opt-key">[{KEYS[i]}]</span>
                  <span className="ws3-opt-text">{o.text}</span>
                </button>
              );
            })}
          </div>

          <div className="ws3-qfeed" aria-live="polite">
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
        </div>
      </ActionBar>
      <HintDock
        level={hint}
        itemLabel={`QUESTION ${idx + 1}/${cards.length}`}
        hint1Text="One wrong option was struck out. This question now pays 60%."
        hint2Text="The correct option was selected and submitted for you. This question scores 0."
        cost1={CONFIG.hintPenalty[1]}
        disabled={resolved}
        onHint={requestHint}
      />
    </>
  );
}
