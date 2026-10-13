import { useState, useRef } from 'react'
import { BIOHAZARD_MATRIX, LOOKUP_PROBLEMS, STATION4_CONFIG } from '../mockStation4Data'
import { resolveStep, normalise } from './logic'
import Centrifuge from './Centrifuge'
import HintDock from '../../core/HintDock'

const PER_PROBLEM = 4
const TOTAL = PER_PROBLEM * LOOKUP_PROBLEMS.length

export default function ModuleB({ onScore, onDone, fx, log, track }) {
  const cfg = STATION4_CONFIG.moduleB
  const [done, setDone] = useState(0) // verified steps 0..8
  const [answers, setAnswers] = useState([[], []]) // per problem verified answers
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(0) // wrong tries on the current step
  const [flash, setFlash] = useState(null) // { row, col } of last verified cell
  const [lid, setLid] = useState('open') // open | closing | sealed
  const [hint, setHint] = useState(0) // hints spent on the current step
  const earned = useRef(0)

  const lookupDone = done >= TOTAL
  const pIdx = Math.min(LOOKUP_PROBLEMS.length - 1, Math.floor(done / PER_PROBLEM))
  const sIdx = lookupDone ? PER_PROBLEM - 1 : done % PER_PROBLEM
  const problem = LOOKUP_PROBLEMS[pIdx]
  const step = problem.steps[sIdx]
  const { rowId, answer } = resolveStep(step, answers[pIdx])

  const pressure = lid === 'sealed' ? 6 : Math.round(100 - done * 11.5)
  const speed = lid === 'sealed' ? 620 : 20 + done * 70

  const accept = (pts, auto = false) => {
    earned.current += pts
    onScore(earned.current)
    setAnswers((a) => a.map((arr, i) => (i === pIdx ? [...arr, answer] : arr)))
    setFlash({ row: rowId, col: step.column })
    setDone((d) => d + 1)
    setInput('')
    setWrong(0)
    setHint(0)
    log(`${problem.id} STEP ${sIdx + 1} ${auto ? 'AUTO-SUBMITTED' : 'VERIFIED'} // CLAMP ${done + 1}/8 ENGAGED // +${pts} PTS`, 'ok')
  }

  // Hint 1: highlights the cell to read (-40%). Hint 2: submits the value for the player (0 pts).
  const requestHint = (next) => {
    if (lookupDone || hint >= next) return
    track?.('B', 'hint', `${problem.id} S${sIdx + 1} H${next}`)
    setHint(next)
    if (next === 2) accept(0, true)
  }

  const submit = (e) => {
    e.preventDefault()
    if (lookupDone || !input.trim()) return
    if (normalise(input) === normalise(answer)) {
      const base = Math.round(cfg.pointsPerStep * (hint === 1 ? 1 - STATION4_CONFIG.moduleA.hint1PenaltyFraction : 1))
      accept(Math.max(0, base - wrong * cfg.wrongStepPenalty))
    } else {
      setWrong((w) => w + 1)
      track?.('B', 'wrong', `${problem.id} S${sIdx + 1}`)
      fx('glitch')
      log(`${problem.id} STEP ${sIdx + 1} MISMATCH // PRESSURE SPIKE`, 'warn')
    }
  }

  const seal = () => {
    setLid('closing')
    log('STEP 5 INTERLOCK // HYDRAULIC CLAMP ENGAGING', 'info')
    setTimeout(() => {
      setLid('sealed')
      fx('shake')
      log('CENTRIFUGE STABILISED 100% // FIELD DATAPAD ONLINE', 'ok')
    }, 1600)
  }

  const refFor = (s, i) => {
    const p = typeof s.row === 'string' ? s.row : `ROW FROM STEP ${s.row.fromStep}`
    return `${i + 1}. ${p} → ${s.column}`
  }

  return (
    <section className="mz-modB mz-fade-in">
      {/* LEFT DATAPAD: MATRIX */}
      <aside className="mz-panel mz-chamfer mz-pad">
        <header className="mz-panel-head"><span>DIAGNOSTIC PAD α // BIOHAZARD MATRIX</span><span className="mz-dim">8 COL</span></header>
        <div className="mz-matrix-wrap">
          <table className="mz-matrix">
            <thead><tr>{BIOHAZARD_MATRIX.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {BIOHAZARD_MATRIX.rows.map((r) => (
                <tr key={r[0]} className={!lookupDone && r[0] === rowId ? 'is-target' : ''}>
                  {r.map((cell, ci) => {
                    const hit = flash && flash.row === r[0] && BIOHAZARD_MATRIX.columns[ci] === flash.col
                    const hinted = hint >= 1 && !lookupDone && r[0] === rowId && BIOHAZARD_MATRIX.columns[ci] === step.column
                    return <td key={ci} className={`${hit ? 'is-hit' : ''} ${hinted ? 'is-hint' : ''}`}>{cell}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>

      {/* CENTER: CENTRIFUGE */}
      <div className="mz-center">
        <Centrifuge engaged={done} speed={speed} lidClosed={lid !== 'open'} pressure={pressure} />
        <div className="mz-pressure">
          <div className="mz-pressure-label">
            <span>BIOHAZARD PRESSURE</span>
            <b className={pressure > 60 ? 'mz-red' : pressure > 25 ? 'mz-amber' : 'mz-green'}>{pressure}%</b>
          </div>
          <div className="mz-bar"><i style={{ width: `${pressure}%` }} className={pressure > 60 ? 'is-hot' : pressure > 25 ? 'is-warm' : ''} /></div>
          <div className="mz-pressure-label mz-dim"><span>STABILITY</span><b>{lid === 'sealed' ? 100 : Math.round((done / TOTAL) * 92)}%</b></div>
        </div>
      </div>

      {/* RIGHT DATAPAD: PROBLEM */}
      <aside className="mz-panel mz-chamfer mz-pad">
        <header className="mz-panel-head"><span>DIAGNOSTIC PAD β // {lookupDone ? 'INTERLOCK' : problem.id}</span><span className="mz-amber">{Math.min(done + 1, TOTAL)}/{TOTAL}</span></header>

        {!lookupDone ? (
          <form className="mz-pad-body" onSubmit={submit}>
            <h3 className="mz-h3">{problem.title}</h3>
            <ol className="mz-steplist">
              {problem.steps.map((s, i) => (
                <li key={i} className={i < sIdx ? 'is-done' : i === sIdx ? 'is-now' : ''}>
                  {refFor(s, i)} {i < sIdx && <b className="mz-green">= {answers[pIdx][i]}</b>}
                </li>
              ))}
            </ol>
            <label className="mz-label" htmlFor="mz-b-input">
              STEP {sIdx + 1}: READ <b className="mz-green">{step.column}</b> OF <b className="mz-green">{rowId}</b>
            </label>
            <div className="mz-inputrow">
              <input
                id="mz-b-input"
                className={`mz-input ${wrong ? 'is-bad' : ''}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ENTER VALUE"
                autoComplete="off"
                autoFocus
              />
              <button type="submit" className="mz-btn mz-btn-green">[VERIFY]</button>
            </div>
            <div className="mz-dim">WRONG {wrong} · −{cfg.wrongStepPenalty} PT EACH</div>
          </form>
        ) : (
          <div className="mz-pad-body">
            <h3 className="mz-h3">STEP 5 // INTERLOCK</h3>
            <p className="mz-dim">All 8 clamps verified.</p>
            {lid === 'open' && <button type="button" className="mz-btn mz-btn-amber mz-wide" onClick={seal}>[ENGAGE HYDRAULIC INTERLOCK]</button>}
            {lid === 'closing' && <div className="mz-status mz-amber mz-blink">LID DESCENDING… CLAMPS EXTENDING…</div>}
            {lid === 'sealed' && (
              <>
                <div className="mz-status mz-green">LID SEALED // ROTOR STABLE 100% // FIELD DATAPAD: POWERED</div>
                <button type="button" className="mz-btn mz-btn-green mz-wide" onClick={onDone}>[PROCEED TO AIRLOCK ▶]</button>
              </>
            )}
          </div>
        )}
      </aside>
      {!lookupDone && (
        <HintDock
          level={hint}
          itemLabel={`STEP ${done + 1}/${TOTAL}`}
          hint1Text={`Look where row ${rowId} meets column ${step.column}. That cell is highlighted in the matrix.`}
          hint2Text="The value was submitted for you. This step scores 0."
          cost1={STATION4_CONFIG.moduleA.hint1PenaltyFraction}
          onHint={requestHint}
        />
      )}
    </section>
  )
}
