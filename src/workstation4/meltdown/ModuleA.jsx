import { useMemo, useState, useRef } from 'react'
import { QUESTION_BANK, STATION4_CONFIG } from '../mockStation4Data'
import { pickOne, pickQuestions, questionPoints, shuffleOptions } from './logic'
import HintDock from '../../core/HintDock'
import { mulberry32 } from './escape'

const LETTERS = ['A', 'B', 'C', 'D']

export default function ModuleA({ onScore, onDone, fx, log, track, seed }) {
  // seeded: every player of a versus lobby gets the same questions
  const questions = useMemo(() => {
    const rng = seed != null ? mulberry32(seed ^ 0xa5a5a5) : Math.random
    return pickQuestions(QUESTION_BANK, STATION4_CONFIG.moduleA.questionsPerRun, rng).map((q) => shuffleOptions(q, rng))
  }, [seed])
  const [idx, setIdx] = useState(0)
  const [state, setState] = useState(() => questions.map(() => ({ hint: 0, wrong: 0, banned: [], picked: null, done: false })))
  const earnedRef = useRef(0)
  const q = questions[idx]
  const st = state[idx]

  const patch = (p) => setState((s) => s.map((x, i) => (i === idx ? { ...x, ...p } : x)))

  const finishQuestion = (hint, wrong, picked) => {
    const pts = questionPoints({ hint, wrong })
    earnedRef.current += pts
    onScore(earnedRef.current)
    patch({ picked, done: true, hint, wrong })
    log(`Q${idx + 1} LOCKED // +${pts} PTS`, 'ok')
    setTimeout(() => {
      if (idx + 1 >= questions.length) onDone()
      else setIdx((i) => i + 1)
    }, 900)
  }

  const choose = (n) => {
    if (st.done || st.banned.includes(n)) return
    if (n === q.correct) {
      finishQuestion(st.hint, st.wrong, n)
    } else {
      fx('glitch')
      track?.('A', 'wrong', `Q${idx + 1}`)
      patch({ wrong: st.wrong + 1, banned: [...st.banned, n] })
      log(`Q${idx + 1} REJECTED // OPTION ${LETTERS[n]} INVALID`, 'warn')
    }
  }

  const requestIntel = (next) => {
    if (st.done || st.hint >= next) return
    track?.('A', 'hint', `Q${idx + 1} H${next}`)
    if (next === 1) {
      // Hint 1: strike out one wrong option (no wrong-try penalty)
      const wrongs = q.options.map((_, n) => n).filter((n) => n !== q.correct && !st.banned.includes(n))
      const gone = pickOne(wrongs)
      patch({ hint: 1, banned: gone === undefined ? st.banned : [...st.banned, gone] })
      log(`OVERRIDE INTEL L1 // ONE WRONG OPTION REMOVED // -${STATION4_CONFIG.moduleA.hint1PenaltyFraction * 100}% PTS`, 'warn')
    } else {
      fx('glitch')
      log('OVERRIDE INTEL L2 // AUTO-SOLVE // -100% PTS', 'crit')
      finishQuestion(2, st.wrong, q.correct)
    }
  }

  return (
    <section className="mz-modA mz-fade-in">
      <div className="mz-panel mz-chamfer mz-terminal">
        <header className="mz-panel-head">
          <span>MODULE A // PROTOCOL</span>
          <span className="mz-amber">QUERY {idx + 1}/{questions.length}</span>
        </header>

        <div className="mz-qbody">
          <div className="mz-qmeta">
            <span>WORTH {STATION4_CONFIG.scoring.moduleA / questions.length} PTS</span>
          </div>
          <p className="mz-prompt" key={q.id}>
            <span className="mz-green">&gt;_</span> {q.prompt}
          </p>

          <div className="mz-options">
            {q.options.map((opt, n) => {
              const banned = st.banned.includes(n)
              const right = st.done && n === q.correct
              return (
                <button
                  key={n}
                  type="button"
                  disabled={st.done || banned}
                  onClick={() => choose(n)}
                  className={`mz-key ${banned ? 'is-banned' : ''} ${right ? 'is-right' : ''}`}
                >
                  <span className="mz-key-cap">[{LETTERS[n]}]</span>
                  <span className="mz-key-text">{opt}</span>
                </button>
              )
            })}
          </div>

        </div>

        <footer className="mz-actionstrip">
          <span className="mz-dim">
            WRONG {st.wrong}
          </span>
        </footer>
      </div>
      <HintDock
        level={st.hint}
        itemLabel={`QUERY ${idx + 1}/${questions.length}`}
        hint1Text="One wrong option was struck out. Pick from the rest."
        hint2Text={`Option [${LETTERS[q.correct]}] was submitted for you. This query scores 0.`}
        cost1={STATION4_CONFIG.moduleA.hint1PenaltyFraction}
        disabled={st.done}
        onHint={requestIntel}
      />
    </section>
  )
}
