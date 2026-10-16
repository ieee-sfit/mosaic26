import { useMemo, useRef, useState } from 'react'
import { CIRCUIT_ROUNDS, STATION4_CONFIG } from '../mockStation4Data'
import { cheapestFix, decidingPart, evaluateCircuit, feeders, initialInputs, layoutRound, phasePoints } from './logic'
import HintDock from '../../core/HintDock'

const GATES = ['AND', 'OR', 'NOT']
const bit = (v) => (v == null ? '–' : v)
/** Green = 1, red = 0, grey = no value yet. Used for wires, nodes and doors alike. */
const cls = (v) => (v == null ? 'wn' : v ? 'w1' : 'w0')

const RULES = {
  breach: ['AND is 1 only if both inputs are 1.', 'OR is 1 if any input is 1.', 'NOT flips.'],
  seal: ['AND is 0 if any input is 0.', 'OR is 0 only if both inputs are 0.', 'NOT flips.'],
}

export default function ModuleC({ onScore, onDone, fx, log, track }) {
  const cfg = STATION4_CONFIG.moduleC
  const [ri, setRi] = useState(0)
  const round = CIRCUIT_ROUNDS[ri]
  const [inputs, setInputs] = useState(() => initialInputs(CIRCUIT_ROUNDS[0]))
  const [placed, setPlaced] = useState({})
  const [selected, setSelected] = useState(null)
  const [phase, setPhase] = useState('breach') // breach | transit | seal | slam
  const [scene, setScene] = useState('corridor')
  const [wrong, setWrong] = useState(0) // wrong tries in the current phase
  const [hint, setHint] = useState(0) // hints spent on the current phase
  const [msg, setMsg] = useState('')
  const earned = useRef(0)

  const values = useMemo(() => evaluateCircuit(round, inputs, placed), [round, inputs, placed])
  const pos = useMemo(() => layoutRound(round), [round])
  const fwd = values[round.forwardOut]
  const rear = values[round.rearOut]
  const interactive = phase === 'breach' || phase === 'seal'
  const sealing = phase === 'seal' || phase === 'slam'
  const door = sealing ? round.rearOut : round.forwardOut

  const focus = useMemo(() => feeders(round, door), [round, door])
  const check = sealing ? (v) => v[round.rearOut] === 0 : (v) => v[round.forwardOut] === 1
  // Hint 1 points at the part the cheapest fix would change, nearest the door
  const pointer = useMemo(() => {
    if (hint < 1 || !interactive) return null
    const fix = cheapestFix(round, inputs, placed, check)
    return fix ? decidingPart(round, inputs, placed, fix) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, interactive, round, inputs, placed, sealing])

  const placeGate = (sid, type) => { setPlaced((p) => ({ ...p, [sid]: type })); setMsg('') }
  const onSocket = (sid) => {
    if (!interactive) return
    if (selected) placeGate(sid, selected)
    else if (placed[sid]) setPlaced((p) => ({ ...p, [sid]: null }))
  }
  const toggleInput = (id) => { if (interactive) { setInputs((v) => ({ ...v, [id]: v[id] ? 0 : 1 })); setMsg('') } }

  const fresh = () => { setHint(0); setWrong(0); setMsg('') }

  const finishBreach = (pts) => {
    earned.current += pts
    onScore(earned.current)
    log(`${round.id} FRONT DOOR OPEN // +${pts} PTS`, 'ok')
    setPhase('transit')
    setTimeout(() => {
      setScene('airlock')
      fresh()
      setPhase('seal')
      log('INSIDE THE AIRLOCK // MAKE THE REAR BLAST NODE READ 0', 'warn')
    }, 1500)
  }

  const finishSeal = (pts) => {
    earned.current += pts
    onScore(earned.current)
    log(`${round.id} REAR DOOR SEALED // +${pts} PTS`, 'ok')
    setPhase('slam')
    fx('shake')
    setTimeout(() => {
      if (ri + 1 >= CIRCUIT_ROUNDS.length) return onDone()
      const nr = CIRCUIT_ROUNDS[ri + 1]
      setRi(ri + 1); setInputs(initialInputs(nr)); setPlaced({}); setSelected(null)
      setScene('corridor'); fresh(); setPhase('breach')
    }, 1900)
  }

  /** A wrong try never ends the phase: it costs 20% of the phase's points and the player keeps going. */
  const wrongTry = (why) => {
    track?.('C', 'wrong', `R${ri + 1} ${sealing ? 'SEAL' : 'BREACH'}`)
    fx('glitch')
    setWrong((w) => w + 1)
    setMsg(`${why} · -${cfg.wrongPenaltyFraction * 100}% OF THIS PHASE`)
    log(`${sealing ? 'SEAL' : 'BREACH'} REJECTED // ${why}`, 'warn')
  }

  const submit = () => {
    if (!interactive) return
    if (phase === 'breach') {
      const full = round.sockets.every((s) => placed[s.id])
      if (!full || fwd !== 1) return wrongTry(full ? 'FRONT DOOR STILL READS 0' : 'SOCKETS INCOMPLETE')
      finishBreach(phasePoints(cfg.breachPoints, { wrong, hint }))
    } else {
      if (rear !== 0) return wrongTry('REAR BLAST NODE STILL READS 1')
      finishSeal(phasePoints(cfg.sealPoints, { wrong, hint }))
    }
  }

  const requestHint = (next) => {
    if (!interactive || hint >= next) return
    track?.('C', 'hint', `R${ri + 1} ${sealing ? 'SEAL' : 'BREACH'} H${next}`)
    setHint(next)
    if (next !== 2) return
    const fix = cheapestFix(round, inputs, placed, check)
    if (!fix) return
    setInputs(fix.inputs); setPlaced(fix.placed)
    if (phase === 'breach') finishBreach(0)
    else finishSeal(0)
  }

  const label = (id) => round.inputs.find((i) => i.id === id)?.label ?? id
  const wires = []
  round.sockets.forEach((s) => {
    s.srcs.forEach((src, k) => {
      const unused = placed[s.id] === 'NOT' && k > 0
      wires.push({ key: `${src}-${s.id}-${k}`, from: pos[src], to: pos[s.id], v: values[src], unused })
    })
  })
  wires.push({ key: 'fwd', from: pos[round.forwardOut], to: pos.FWD, v: fwd })
  wires.push({ key: 'rear', from: pos[round.rearOut], to: pos.REAR, v: rear })
  const path = (a, b) => {
    const x1 = a.x + 3, x2 = b.x - 3, m = (x1 + x2) / 2
    return `M${x1} ${a.y} C${m} ${a.y} ${m} ${b.y} ${x2} ${b.y}`
  }

  const doorSrc = round.sockets.find((s) => s.id === door)
  const hintText = (() => {
    if (!pointer) return `This door already reads right. Press ${sealing ? 'SEAL REAR DOOR' : 'OPEN FRONT DOOR'}.`
    if (pointer.kind === 'input') return `The deciding part is input ${pointer.id} (${label(pointer.id)}). Try flipping it and watch the door node.`
    return pointer.empty
      ? `The deciding part is socket ${pointer.id}. Put a gate there, then read the door node.`
      : `The deciding part is the gate in socket ${pointer.id}. Try a different gate there.`
  })()
  const hotPart = (kind, id) => pointer && pointer.kind === kind && pointer.id === id

  return (
    <section className={`mz-modC mz-fade-in is-${scene} ${phase === 'transit' ? 'is-transit' : ''}`}>
      {/* BACKGROUND: contaminated corridor / airlock bulkhead */}
      <div className="mz-scene" aria-hidden="true">
        <div className="mz-cam">
          <div className="mz-hall" />
          <div className="mz-lights"><i /><i /><i /><i /></div>
          <div className="mz-floor" />
          <div className="mz-bulk">
            <div className={`mz-door-half l ${fwd === 1 && phase !== 'breach' ? 'open' : ''}`} />
            <div className={`mz-door-half r ${fwd === 1 && phase !== 'breach' ? 'open' : ''}`} />
            <span className="mz-bulk-tag">{scene === 'corridor' ? 'FRONT DOOR' : 'AIRLOCK CHAMBER'}</span>
          </div>
          <div className={`mz-rear ${phase === 'slam' ? 'slam' : ''}`}>
            <div className="mz-horde"><i /><i /><i /><i /><i /></div>
            <div className="mz-door-half l" /><div className="mz-door-half r" />
            <span className="mz-bulk-tag">REAR BLAST DOOR</span>
          </div>
        </div>
      </div>

      {/* FOREGROUND: field hacking datapad */}
      <div className="mz-datapad mz-chamfer">
        <header className="mz-panel-head">
          <span>MODULE C // DOOR LOGIC · {round.id}</span>
          <span className="mz-dim" data-wrong={wrong}>WRONG TRIES {wrong}</span>
        </header>

        <div className="mz-cbar">
          <div className={`mz-phase ${phase === 'breach' || phase === 'transit' ? 'on' : ''}`}>1 · OPEN THE FRONT DOOR → 1 (GREEN)</div>
          <div className={`mz-phase ${sealing ? 'on' : ''}`}>2 · SEAL THE REAR DOOR → 0 (RED)</div>
        </div>

        <div className={`mz-banner ${sealing ? 'is-seal' : 'is-open'}`} role="status" data-banner={sealing ? 'seal' : 'open'}>
          <b>{sealing ? 'SEAL THE REAR DOOR: make the REAR BLAST node read 0 (red)' : 'OPEN THE FRONT DOOR: make the FRONT DOOR node read 1 (green)'}</b>
          <span className="mz-rules" data-rules>{RULES[sealing ? 'seal' : 'breach'].join(' ')}</span>
          {sealing && <span className="mz-zeros">Where zeros come from: flip an input to 0, or swap a gate.</span>}
          {msg && <em className="mz-cmsg" data-cmsg>{msg}</em>}
        </div>

        <div className="mz-board">
          <svg className="mz-wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            {wires.map((w) => (
              <path key={w.key} d={path(w.from, w.to)} className={`mz-wire ${cls(w.v)} ${w.unused ? 'unused' : ''}`} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {round.inputs.map((i) => (
            <button key={i.id} type="button" data-node={i.id}
              className={`mz-node mz-in ${cls(inputs[i.id])} ${focus.inputs.has(i.id) ? 'is-focus' : ''} ${hotPart('input', i.id) ? 'is-hint' : ''}`}
              style={{ left: `${pos[i.id].x}%`, top: `${pos[i.id].y}%` }} onClick={() => toggleInput(i.id)} title="Toggle input">
              <small>{i.id}·{i.label}</small><b>{inputs[i.id]}</b>
            </button>
          ))}

          {round.sockets.map((s) => (
            <div key={s.id} role="button" tabIndex={0} data-node={s.id}
              className={`mz-node mz-socket ${placed[s.id] ? 'filled' : ''} ${cls(values[s.id])} ${selected ? 'armed' : ''} ${focus.sockets.has(s.id) ? 'is-focus' : ''} ${hotPart('socket', s.id) ? 'is-hint' : ''}`}
              style={{ left: `${pos[s.id].x}%`, top: `${pos[s.id].y}%` }}
              onClick={() => onSocket(s.id)} onKeyDown={(e) => e.key === 'Enter' && onSocket(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); if (interactive && GATES.includes(t)) placeGate(s.id, t) }}>
              <small>{s.id} ({s.srcs.map(label).join(',')})</small>
              <strong>{placed[s.id] ?? 'DROP'}</strong>
              <b>{bit(values[s.id])}</b>
            </div>
          ))}

          <div className={`mz-node mz-door-node ${cls(fwd)} ${!sealing ? 'is-focus' : ''}`} data-node="FRONT" style={{ left: `${pos.FWD.x}%`, top: `${pos.FWD.y}%` }}>
            <small>FRONT DOOR</small><b>{bit(fwd)}</b><em>{fwd === 1 ? 'OPEN' : 'LOCKED'}</em>
          </div>
          <div className={`mz-node mz-door-node ${cls(rear)} ${sealing ? 'is-focus' : ''}`} data-node="REAR" style={{ left: `${pos.REAR.x}%`, top: `${pos.REAR.y}%` }}>
            <small>REAR BLAST</small><b>{bit(rear)}</b><em>{rear === 0 ? 'SEALED' : rear === 1 ? 'OPEN' : 'N/A'}</em>
          </div>
        </div>

        <footer className="mz-actionstrip mz-strip-left">
          <button type="button" className="mz-btn mz-btn-green" disabled={!interactive} onClick={submit} data-submit>
            {sealing ? '[ SEAL REAR DOOR ]' : '[ OPEN FRONT DOOR ]'}
          </button>
          <div className="mz-palette">
            <span className="mz-dim">GATES:</span>
            {GATES.map((g) => (
              <button key={g} type="button" draggable={interactive}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', g)}
                onClick={() => setSelected((s) => (s === g ? null : g))}
                className={`mz-gate ${selected === g ? 'sel' : ''}`} disabled={!interactive}>[{g}]</button>
            ))}
            <span className="mz-dim mz-hintline">{selected ? `${selected}: CLICK A SOCKET` : 'PICK A GATE · TOGGLE INPUTS'}</span>
          </div>
        </footer>
      </div>
      <HintDock
        level={hint}
        itemLabel={`ROUND ${ri + 1} · ${sealing ? 'SEAL' : 'OPEN'}`}
        hint1Text={`${hintText}${doorSrc ? ` The door reads socket ${door}, fed by ${doorSrc.srcs.map(label).join(' and ')}.` : ''}`}
        hint2Text="The circuit was solved and submitted for you. This phase scores 0."
        cost1={cfg.hint1PenaltyFraction}
        disabled={!interactive}
        onHint={requestHint}
      />
    </section>
  )
}
