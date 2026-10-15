import { useCallback, useEffect, useRef, useState } from 'react'
import { CHARGES, STATION4_CONFIG } from '../mockStation4Data'
import { chargePoints, conducts, nextWrongBit, pickVariants, rungsOn, solutionOf } from './escape'
import RelayDiagram from './RelayDiagram'
import HintDock from '../../core/HintDock'

const cfg = STATION4_CONFIG.moduleD
const round2 = (n) => Math.round(n * 100) / 100

const fresh = (c) => ({ bits: Array(c.bits).fill(0), revealed: [], hint: 0, wrong: 0, done: false, pts: 0, msg: '' })
const totalOf = (list) => round2(list.reduce((n, c) => n + (c.done ? c.pts : 0), 0))

/**
 * Module D // CODE BREAKER (bonus, 0..20). Three demolition charges of 3, 4 and 5 bits (5, 7 and 8 points).
 * Flip the bit switches until current reaches the detonator, then ARM. A wrong ARM costs 20% of that charge; the player
 * always keeps trying. D uses whatever shift time is left: when the clock hits 0 the module ends and keeps what was earned.
 */
export default function ModuleD({ timeLeft, seed, onScore, onDone, fx, log, track }) {
  const [variants] = useState(() => pickVariants(CHARGES, seed ?? Date.now()))
  const [charges, setCharges] = useState(() => variants.map(fresh))
  const [ci, setCi] = useState(0)
  const [ending, setEnding] = useState(null) // null | 'win' | 'fail'
  const live = useRef(charges)
  const closed = useRef(false)

  const commit = (next) => { live.current = next; setCharges(next) }
  const patch = (i, fn) => commit(live.current.map((c, k) => (k === i ? fn(c) : c)))

  const end = useCallback((how) => {
    if (closed.current) return
    closed.current = true
    setEnding(how)
    fx?.(how === 'win' ? 'shake' : 'strobe')
    window.setTimeout(() => onDone(totalOf(live.current), how), how === 'win' ? 2600 : 2200)
  }, [fx, onDone])

  // D has no clock of its own: it runs on the shift time that is left
  useEffect(() => { if (timeLeft <= 0) end('fail') }, [timeLeft, end])

  const ch = variants[ci]
  const st = charges[ci]
  const frozen = ending !== null || st.done
  const on = rungsOn(ch, st.bits)
  const open = on.filter((x) => !x).length
  const flows = conducts(ch, st.bits)
  const worth = cfg.codePoints[ci]
  const pts = chargePoints(worth, { wrong: st.wrong, hint: st.hint }, cfg)

  const flip = (k) => {
    if (frozen || st.revealed.includes(k)) return
    patch(ci, (c) => ({ ...c, bits: c.bits.map((b, j) => (j === k ? 1 - b : b)), msg: '' }))
  }

  const armed = (i, base, extra = {}) => {
    const v = variants[i]
    const hint = extra.hint ?? base.hint
    const earned = chargePoints(cfg.codePoints[i], { wrong: base.wrong, hint }, cfg)
    const next = live.current.map((c, k) => (k === i ? { ...c, ...extra, done: true, pts: earned, msg: '' } : c))
    commit(next)
    onScore(totalOf(next))
    log?.(`CHARGE ${i + 1} ARMED // +${earned} PTS`, 'ok')
    if (i + 1 >= variants.length) { end('win'); return }
    window.setTimeout(() => { if (!closed.current) setCi(i + 1) }, 1300)
    return v
  }

  const arm = () => {
    if (frozen) return
    if (flows) { armed(ci, st); return }
    track?.('D', 'wrong', `C${ci + 1} ARM`)
    fx?.('glitch')
    log?.(`CHARGE ${ci + 1} REJECTED // CIRCUIT OPEN AT ${open} RUNG(S) // -${cfg.wrongPenaltyFraction * 100}%`, 'warn')
    patch(ci, (c) => ({ ...c, wrong: c.wrong + 1, msg: `NO CURRENT · ${open} RUNG${open === 1 ? '' : 'S'} STILL OPEN · -${cfg.wrongPenaltyFraction * 100}%` }))
  }

  const requestHint = (next) => {
    if (frozen || st.hint >= next) return
    track?.('D', 'hint', `C${ci + 1} H${next}`)
    if (next === 1) {
      const bit = nextWrongBit(ch, st.bits, st.revealed)
      const sol = solutionOf(ch)
      patch(ci, (c) => {
        const bits = bit == null ? c.bits : c.bits.map((b, j) => (j === bit ? sol[j] : b))
        return { ...c, hint: 1, bits, revealed: bit == null ? c.revealed : [...c.revealed, bit], hintBit: bit }
      })
      log?.(`HINT 1 // CHARGE ${ci + 1} // ONE BIT REVEALED // -${cfg.hint1PenaltyFraction * 100}%`, 'warn')
      return
    }
    fx?.('glitch')
    log?.(`HINT 2 // CHARGE ${ci + 1} CODE ENTERED // 0 PTS`, 'crit')
    const sol = solutionOf(ch)
    armed(ci, st, { hint: 2, bits: sol, revealed: sol.map((_, j) => j) })
  }

  const hintBit = st.hint >= 1 ? st.hintBit ?? null : null
  const hint1Text = hintBit == null
    ? 'Every bit is already right. Press ARM CHARGE.'
    : `Bit B${hintBit + 1} must be ${solutionOf(ch)[hintBit]}. It is set and locked for you.`

  return (
    <section className="mz-modD mz-fade-in" data-charge-id={ch.id}>
      <div className="mz-panel mz-chamfer mz-cb">
        <header className="mz-panel-head">
          <span>MODULE D // CODE BREAKER</span>
          <span className="mz-green" data-charge={ci + 1}>CHARGE {ci + 1}/{variants.length} · {ch.bits} BITS · {ch.site}</span>
        </header>

        <div className="mz-cb-body">
          <p className="mz-cb-rule" data-cb-rule>
            Rungs in a row = AND. Side by side = OR. NOT closes when the bit is 0. Get green current to the detonator.
          </p>
          <div className="mz-cb-diagram">
            <RelayDiagram charge={ch} bits={st.bits} hotBit={hintBit} lockedBits={st.revealed} armed={st.done} />
          </div>

          <div className="mz-cb-bits" role="group" aria-label="Bit switches">
            {st.bits.map((b, k) => (
              <button key={k} type="button" data-bit={k + 1} data-value={b} disabled={frozen || st.revealed.includes(k)}
                className={`mz-bitsw ${b ? 'is-1' : 'is-0'} ${st.revealed.includes(k) ? 'is-locked' : ''}`}
                onClick={() => flip(k)} aria-pressed={b === 1} aria-label={`Bit B${k + 1} is ${b}. Click to flip`}>
                <small>B{k + 1}</small>
                <b>{b}</b>
                <i aria-hidden />
              </button>
            ))}
          </div>
          <p className={`mz-cb-status ${st.msg ? 'is-bad' : flows ? 'is-ok' : ''}`} data-cb-status aria-live="polite">
            {st.done ? `CHARGE ARMED · +${st.pts} PTS`
              : st.msg || (flows ? 'CURRENT REACHES THE DETONATOR · PRESS ARM CHARGE' : `${open} RUNG${open === 1 ? '' : 'S'} OPEN · FLIP BITS UNTIL EVERY RUNG IS GREEN`)}
          </p>
        </div>

        <footer className="mz-actionstrip mz-strip-left">
          <button type="button" className={`mz-btn mz-btn-green mz-big ${flows ? 'is-ready' : ''}`} disabled={frozen} onClick={arm} data-arm>
            [ ARM CHARGE ]
          </button>
          <span className="mz-cb-pips" aria-label="Charges armed">
            {charges.map((c, k) => <i key={k} className={`${c.done ? 'on' : ''} ${k === ci ? 'cur' : ''}`}>{k + 1}</i>)}
          </span>
          <span className="mz-dim" data-cb-wrong={st.wrong}>WORTH {pts} / {worth} PTS · WRONG ARMS {st.wrong}</span>
        </footer>

        {ending && (
          <div className={`mz-ending is-${ending}`} role="status" data-ending={ending}>
            <h2>{ending === 'win' ? 'ALL CHARGES ARMED' : 'THE CLOCK RAN OUT'}</h2>
            <p>{ending === 'win' ? 'DETONATION CONFIRMED' : 'THE CHARGES STAY COLD · WHAT YOU EARNED IS KEPT'}</p>
          </div>
        )}
      </div>
      <HintDock
        level={st.hint}
        itemLabel={`CHARGE ${ci + 1}/${variants.length}`}
        hint1Text={hint1Text}
        hint2Text={`The code for charge ${ci + 1} was entered for you. It scores 0.`}
        cost1={cfg.hint1PenaltyFraction}
        disabled={frozen}
        onHint={requestHint}
      />
    </section>
  )
}
