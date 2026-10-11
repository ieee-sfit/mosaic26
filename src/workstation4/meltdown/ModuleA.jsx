import { useMemo, useState, useRef } from 'react'
import { QUESTION_BANK, CHEAT_SHEET_COLUMNS, STATION4_CONFIG } from '../mockStation4Data'
import { pickQuestions, questionPoints } from './logic'

const LETTERS = ['A', 'B', 'C', 'D']

export default function ModuleA({ onScore, onDone, fx, log }) {
  const questions = useMemo(
    () => pickQuestions(QUESTION_BANK, STATION4_CONFIG.moduleA.questionsPerRun),
    [],
  )
  const [idx, setIdx] = useState(0)
  const [state, setState] = useState(() => questions.map(() => ({ hint: 0, wrong: 0, banned: [], picked: null, done: false })))
  const earnedRef = useRef(0)
  const q = questions[idx]
  const st = state[idx]
  const col = CHEAT_SHEET_COLUMNS[q.cheatColumn]

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
      patch({ wrong: st.wrong + 1, banned: [...st.banned, n] })
      log(`Q${idx + 1} REJECTED // OPTION ${LETTERS[n]} INVALID`, 'warn')
    }
  }

  const requestIntel = () => {
    if (st.done) return
    if (st.hint === 0) {
      patch({ hint: 1 })
      log(`OVERRIDE INTEL L1 // -${STATION4_CONFIG.moduleA.hint1PenaltyFraction * 100}% PTS`, 'warn')
    } else if (st.hint === 1) {
      fx('glitch')
      log('OVERRIDE INTEL L2 // AUTO-SOLVE // -100% PTS', 'crit')
      finishQuestion(2, st.wrong, q.correct)
    }
  }

  return (
    <section className="mz-modA mz-fade-in">
      <div className="mz-panel mz-chamfer mz-terminal">
        <header className="mz-panel-head">
          <span>MODULE A // BIOHAZARD PROTOCOL CHECKS</span>
          <span className="mz-amber">QUERY {idx + 1}/{questions.length}</span>
        </header>

        <div className="mz-qbody">
          <div className="mz-qmeta">
            <span>GATE_CLASS: {q.gate}</span>
            <span>CONTAINMENT_SEAL: LEVEL-4</span>
            <span>WORTH: {STATION4_CONFIG.scoring.moduleA / questions.length} PTS</span>
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

          {st.hint >= 1 && (
            <div className="mz-intel mz-chamfer-sm" role="status">
              <b className="mz-amber">INTEL L1 //</b> Consult the physical cheat sheet →{' '}
              <b className="mz-green">{col.label}</b>. <span className="mz-dim">{col.blurb}</span>
            </div>
          )}
        </div>

        <footer className="mz-actionstrip">
          <span className="mz-dim">
            WRONG TRIES: {st.wrong} · INTEL LEVEL: {st.hint}/2
          </span>
          <button
            type="button"
            className="mz-btn mz-btn-amber"
            disabled={st.done || st.hint >= 2}
            onClick={requestIntel}
          >
            [REQUEST OVERRIDE INTEL]
            <small>{st.hint === 0 ? 'L1: COLUMN POINTER −40%' : st.hint === 1 ? 'L2: AUTO-SELECT −100%' : 'EXHAUSTED'}</small>
          </button>
        </footer>
      </div>
    </section>
  )
}
