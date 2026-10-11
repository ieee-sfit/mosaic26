import { useState } from 'react';
import { CHEAT_COLUMNS, STATION2_CONFIG } from '../mockStation2Data';
import { pickQuestions, questionPoints, fmt } from '../logic';

interface Props {
  onScore: (total: number) => void;
  onDone: () => void;
  onShake: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ModuleA({ onScore, onDone, onShake }: Props) {
  const [questions] = useState(() => pickQuestions());
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hints, setHints] = useState<Record<string, number>>({});
  const [wrong, setWrong] = useState<Record<string, number[]>>({});
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const q = questions[qi];
  const h = hints[q.id] ?? 0;
  const wrongs = wrong[q.id] ?? [];
  const answered = earned[q.id] !== undefined;
  const col = CHEAT_COLUMNS.find((c) => c.id === q.column);
  const isLast = qi === questions.length - 1;
  const total = Object.values(earned).reduce((a, b) => a + b, 0);

  const requestHint = () => {
    if (answered || h >= 2) return;
    const next = h + 1;
    setHints({ ...hints, [q.id]: next });
    if (next === 2) setSelected(q.correct);
  };

  const transmit = () => {
    if (selected === null || answered) return;
    if (selected === q.correct) {
      const pts = questionPoints(h >= 1, h >= 2, wrongs.length);
      const e = { ...earned, [q.id]: pts };
      setEarned(e);
      onScore(Object.values(e).reduce((a, b) => a + b, 0));
      setFlash({ kind: 'ok', text: `TRANSMISSION CONFIRMED // +${fmt(pts, 2)} PTS` });
    } else {
      setWrong({ ...wrong, [q.id]: [...wrongs, selected] });
      setSelected(null);
      setFlash({ kind: 'bad', text: `NEGATIVE // OPTION [${LETTERS[selected]}] REJECTED // −${STATION2_CONFIG.wrongAnswerPenalty * 100}% PTS` });
      onShake();
    }
  };

  const next = () => {
    setFlash(null);
    setSelected(null);
    if (isLast) onDone();
    else setQi(qi + 1);
  };

  const perQ = STATION2_CONFIG.moduleMax.A / STATION2_CONFIG.questionsPerRun;

  return (
    <section className="ws2-mod ws2-mod-a" aria-label="Module A Pit Telemetry Protocol">
      <div className="ws2-mod-head">
        <span className="ws2-tag">MODULE A</span>
        <h2>PIT TELEMETRY PROTOCOL</h2>
        <span className="ws2-mod-pts">{fmt(total, 2)} / {STATION2_CONFIG.moduleMax.A} PTS</span>
      </div>

      <div className="ws2-crt ws2-chamfer">
        <div className="ws2-crt-bar">
          <span>PIT-WALL CRT-07</span>
          <span>QUERY {qi + 1}/{questions.length}</span>
          <span>VALUE {perQ} PTS</span>
        </div>
        <p className="ws2-crt-q">&gt; {q.prompt}<span className="ws2-cursor">_</span></p>

        <div className="ws2-opts">
          {q.options.map((opt, i) => {
            const rejected = wrongs.includes(i);
            const isSel = selected === i;
            const isRight = answered && i === q.correct;
            return (
              <button key={i} type="button" disabled={rejected || answered}
                className={`ws2-key ${isSel ? 'is-sel' : ''} ${rejected ? 'is-bad' : ''} ${isRight ? 'is-ok' : ''}`}
                onClick={() => setSelected(i)} aria-pressed={isSel}>
                <span className="ws2-key-cap">[{LETTERS[i]}]</span>
                <span className="ws2-key-text">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="ws2-intel" aria-live="polite">
          {h === 0 && <span className="ws2-dim">PIT INTEL STANDBY // HINT 1 −{STATION2_CONFIG.hintPenalty.hint1 * 100}% PTS // HINT 2 −100% PTS</span>}
          {h >= 1 && <span className="ws2-amber">PIT INTEL 1: CHECK CHEAT-SHEET <b>{col?.id}</b> — {col?.label}</span>}
          {h >= 2 && <span className="ws2-red"> // INTEL 2: CORRECT ANSWER AUTO-SELECTED (0 PTS)</span>}
        </div>
        {flash && <div className={`ws2-flash ws2-flash-${flash.kind}`} role="status">{flash.text}</div>}
      </div>

      <div className="ws2-actionbar">
        <button type="button" className="ws2-btn ws2-btn-amber" onClick={requestHint} disabled={answered || h >= 2}>
          [REQUEST PIT INTEL / HINT]
        </button>
        <span className="ws2-actionbar-note">HINTS USED: {h}/2</span>
        {!answered ? (
          <button type="button" className="ws2-btn ws2-btn-red" onClick={transmit} disabled={selected === null}>
            [TRANSMIT ANSWER]
          </button>
        ) : (
          <button type="button" className="ws2-btn ws2-btn-blue" onClick={next}>
            {isLast ? '[COMPLETE MODULE A ▸ RELAY TOWER]' : '[NEXT QUERY ▸]'}
          </button>
        )}
      </div>
    </section>
  );
}
