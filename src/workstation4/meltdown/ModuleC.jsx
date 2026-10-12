import { useEffect, useMemo, useRef, useState } from 'react'
import { CIRCUIT_ROUNDS, STATION4_CONFIG } from '../mockStation4Data'
import { evaluateCircuit, initialInputs, layoutRound } from './logic'
import HintDock from '../../core/HintDock'

const GATES = ['AND', 'OR', 'NOT']
const bit = (v) => (v == null ? '–' : v)
const cls = (v) => (v == null ? 'wn' : v ? 'w1' : 'w0')

/** Brute-forces any gate/input setting that satisfies `check` (the circuits are tiny: 3 sockets, <= 4 inputs). */
function solveCircuit(round, currentInputs, check) {
  const sockets = round.sockets.map((s) => s.id)
  const ins = round.inputs.map((i) => i.id)
  const tryInputs = (iv) => {
    for (let gm = 0; gm < 3 ** sockets.length; gm++) {
      const pl = {}
      let g = gm
      sockets.forEach((id) => { pl[id] = GATES[g % 3]; g = Math.floor(g / 3) })
      if (check(evaluateCircuit(round, iv, pl), iv, pl)) return { placed: pl, inputs: iv }
    }
    return null
  }
  const keep = tryInputs(currentInputs)
  if (keep) return keep
  for (let im = 0; im < 2 ** ins.length; im++) {
    const iv = {}
    ins.forEach((id, k) => { iv[id] = (im >> k) & 1 })
    const hit = tryInputs(iv)
    if (hit) return hit
  }
  return null
}

export default function ModuleC({ onScore, onDone, onForfeit, fx, log, onSeals }) {
  const cfg = STATION4_CONFIG.moduleC
  const [ri, setRi] = useState(0)
  const round = CIRCUIT_ROUNDS[ri]
  const [inputs, setInputs] = useState(() => initialInputs(CIRCUIT_ROUNDS[0]))
  const [placed, setPlaced] = useState({})
  const [selected, setSelected] = useState(null)
  const [phase, setPhase] = useState('breach') // breach | transit | seal | slam | next
  const [scene, setScene] = useState('corridor')
  const [seals, setSeals] = useState(cfg.seals)
  const [timer, setTimer] = useState(cfg.phaseSeconds)
  const [snap, setSnap] = useState(null)
  const earned = useRef(0)
  const [hint, setHint] = useState(0) // hints spent on the current phase
  const dead = seals <= 0

  const values = useMemo(() => evaluateCircuit(round, inputs, placed), [round, inputs, placed])
  const pos = useMemo(() => layoutRound(round), [round])
  const fwd = values[round.forwardOut]
  const rear = values[round.rearOut]
  const interactive = (phase === 'breach' || phase === 'seal') && !dead

  const deadline = useRef(null)
  const armTimer = () => { deadline.current = Date.now() + cfg.phaseSeconds * 1000; setTimer(cfg.phaseSeconds) }

  const breakSeal = (reason) => {
    fx('strobe'); fx('shake')
    const n = seals - 1
    setSeals(n)
    onSeals(n)
    if (n <= 0) {
      earned.current = 0
      onScore(0)
      log('ALL QUARANTINE SEALS BREACHED // MODULE C FORFEITED', 'crit')
      setTimeout(onForfeit, 1600)
    }
    armTimer()
    log(`SEAL FRACTURED // ${reason}`, 'crit')
  }

  // per-phase countdown (deadline based); timeout breaks a seal
  const breakRef = useRef(breakSeal)
  useEffect(() => { breakRef.current = breakSeal })
  useEffect(() => {
    if (!interactive) return undefined
    const t = setInterval(() => {
      const now = Date.now()
      if (!deadline.current) deadline.current = now + cfg.phaseSeconds * 1000
      const left = Math.ceil((deadline.current - now) / 1000)
      setTimer(Math.max(left, 0))
      if (left <= 0) { deadline.current = now + cfg.phaseSeconds * 1000; breakRef.current('PHASE TIMEOUT') }
    }, 400)
    return () => clearInterval(t)
  }, [interactive, cfg.phaseSeconds])

  const placeGate = (sid, type) => setPlaced((p) => ({ ...p, [sid]: type }))
  const onSocket = (sid) => {
    if (!interactive) return
    if (selected) placeGate(sid, selected)
    else if (placed[sid]) setPlaced((p) => ({ ...p, [sid]: null }))
  }
  const toggleInput = (id) => interactive && setInputs((v) => ({ ...v, [id]: v[id] ? 0 : 1 }))

  const frac = STATION4_CONFIG.moduleA.hint1PenaltyFraction
  // Hint 1 keeps 60% of the phase's points; Hint 2 (auto-solve) keeps none
  const phasePts = (base, level) => (level >= 2 ? 0 : level === 1 ? Math.round(base * (1 - frac)) : base)

  const finishBreach = (pts, nextInputs, nextPlaced) => {
    earned.current += pts
    onScore(earned.current)
    log(`${round.id} FORWARD AIRLOCK UNLOCKED // +${pts} PTS`, 'ok')
    setHint(0)
    setPhase('transit')
    setTimeout(() => {
      setScene('airlock')
      setSnap({ inputs: { ...nextInputs }, placed: { ...nextPlaced } })
      armTimer()
      setPhase('seal')
      log('INSIDE AIRLOCK // MODIFY CIRCUIT: REAR BLAST DOOR MUST READ 0', 'warn')
    }, 1500)
  }

  const finishSeal = (pts) => {
    earned.current += pts
    onScore(earned.current)
    log(`${round.id} REAR BLAST DOOR SLAMMED // +${pts} PTS`, 'ok')
    setHint(0)
    setPhase('slam')
    fx('shake')
    setTimeout(() => {
      if (ri + 1 >= CIRCUIT_ROUNDS.length) return onDone()
      const nr = CIRCUIT_ROUNDS[ri + 1]
      setRi(ri + 1); setInputs(initialInputs(nr)); setPlaced({}); setSelected(null)
      setScene('corridor'); setSnap(null); armTimer(); setPhase('breach')
    }, 1900)
  }

  const submit = () => {
    if (!interactive) return
    if (phase === 'breach') {
      const full = round.sockets.every((s) => placed[s.id])
      if (!full || fwd !== 1) return breakSeal(full ? 'FORWARD AIRLOCK STILL 0' : 'SOCKETS INCOMPLETE')
      finishBreach(phasePts(cfg.breachPoints, hint), inputs, placed)
    } else {
      const changed =
        JSON.stringify(inputs) !== JSON.stringify(snap.inputs) ||
        JSON.stringify(placed) !== JSON.stringify(snap.placed)
      if (rear !== 0 || !changed) return breakSeal(rear !== 0 ? 'REAR DOOR STILL OPEN (1)' : 'CIRCUIT UNMODIFIED')
      finishSeal(phasePts(cfg.sealPoints, hint))
    }
  }

  const requestHint = (next) => {
    if (!interactive || hint >= next) return
    setHint(next)
    if (next !== 2) return
    if (phase === 'breach') {
      const sol = solveCircuit(round, inputs, (v) => v[round.forwardOut] === 1)
      if (!sol) return
      setInputs(sol.inputs); setPlaced(sol.placed)
      finishBreach(0, sol.inputs, sol.placed)
    } else {
      const differs = (iv, pl) => JSON.stringify(iv) !== JSON.stringify(snap.inputs) || JSON.stringify(pl) !== JSON.stringify(snap.placed)
      const sol = solveCircuit(round, inputs, (v, iv, pl) => v[round.rearOut] === 0 && differs(iv, pl))
      if (!sol) return
      setInputs(sol.inputs); setPlaced(sol.placed)
      finishSeal(0)
    }
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
            <span className="mz-bulk-tag">{scene === 'corridor' ? 'FORWARD AIRLOCK' : 'AIRLOCK CHAMBER'}</span>
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
          <span>MODULE C // CORRIDOR AIRLOCK INTERLOCK · {round.name}</span>
          <span className="mz-seals" title="Quarantine seals">
            {Array.from({ length: cfg.seals }, (_, i) => (
              <b key={i} className={i < seals ? 'ok' : 'broken'}>{i < seals ? '☣' : '✕'}</b>
            ))}
          </span>
        </header>

        <div className="mz-cbar">
          <div className={`mz-phase ${phase === 'breach' ? 'on' : ''}`}>PHASE 1 // BREACH FORWARD → FWD = 1</div>
          <div className={`mz-phase ${phase === 'seal' || phase === 'slam' ? 'on' : ''}`}>PHASE 2 // SEAL BEHIND → REAR = 0</div>
          <div className={`mz-timer-chip ${timer <= 15 ? 'hot' : ''}`}>PHASE CLOCK {String(Math.max(timer, 0)).padStart(2, '0')}s</div>
        </div>
        <p className="mz-dim mz-brief">{round.briefing}</p>

        <div className="mz-board">
          <svg className="mz-wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            {wires.map((w) => (
              <path key={w.key} d={path(w.from, w.to)} className={`mz-wire ${cls(w.v)} ${w.unused ? 'unused' : ''}`} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {round.inputs.map((i) => (
            <button key={i.id} type="button" className={`mz-node mz-in ${cls(inputs[i.id])}`}
              style={{ left: `${pos[i.id].x}%`, top: `${pos[i.id].y}%` }} onClick={() => toggleInput(i.id)} title="Toggle input">
              <small>{i.id}·{i.label}</small><b>{inputs[i.id]}</b>
            </button>
          ))}

          {round.sockets.map((s) => (
            <div key={s.id} role="button" tabIndex={0}
              className={`mz-node mz-socket ${placed[s.id] ? 'filled' : ''} ${cls(values[s.id])} ${selected ? 'armed' : ''}`}
              style={{ left: `${pos[s.id].x}%`, top: `${pos[s.id].y}%` }}
              onClick={() => onSocket(s.id)} onKeyDown={(e) => e.key === 'Enter' && onSocket(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); if (interactive && GATES.includes(t)) placeGate(s.id, t) }}>
              <small>{s.id} ({s.srcs.map(label).join(',')})</small>
              <strong>{placed[s.id] ?? 'DROP'}</strong>
              <b>{bit(values[s.id])}</b>
            </div>
          ))}

          <div className={`mz-node mz-door-node ${cls(fwd)}`} style={{ left: `${pos.FWD.x}%`, top: `${pos.FWD.y}%` }}>
            <small>FWD AIRLOCK</small><b>{bit(fwd)}</b><em>{fwd === 1 ? 'UNLOCKED' : 'LOCKED'}</em>
          </div>
          <div className={`mz-node mz-door-node ${cls(rear)}`} style={{ left: `${pos.REAR.x}%`, top: `${pos.REAR.y}%` }}>
            <small>REAR BLAST</small><b>{bit(rear)}</b><em>{rear === 0 ? 'SHUT' : rear === 1 ? 'OPEN' : 'N/A'}</em>
          </div>
        </div>

        <footer className="mz-actionstrip">
          <div className="mz-palette">
            <span className="mz-dim">GATES:</span>
            {GATES.map((g) => (
              <button key={g} type="button" draggable={interactive}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', g)}
                onClick={() => setSelected((s) => (s === g ? null : g))}
                className={`mz-gate ${selected === g ? 'sel' : ''}`} disabled={!interactive}>[{g}]</button>
            ))}
            <span className="mz-dim mz-hintline">{selected ? `PLACING ${selected} — CLICK A SOCKET` : 'DRAG OR PICK A GATE · CLICK INPUTS TO TOGGLE · CLICK FILLED SOCKET TO CLEAR'}</span>
          </div>
          <button type="button" className="mz-btn mz-btn-green" disabled={!interactive} onClick={submit}>
            {phase === 'seal' ? '[SLAM REAR DOOR]' : '[BREACH FORWARD]'}
          </button>
        </footer>
      </div>
      <HintDock
        level={hint}
        itemLabel={`ROUND ${ri + 1} · ${phase === 'seal' ? 'SEAL' : 'BREACH'}`}
        hint1Text={
          phase === 'seal'
            ? `The REAR door reads socket ${round.rearOut}, fed by ${round.sockets.find((s) => s.id === round.rearOut).srcs.map(label).join(' and ')}. Change a gate or toggle an input until it reads 0.`
            : `The FWD door reads socket ${round.forwardOut}, fed by ${round.sockets.find((s) => s.id === round.forwardOut).srcs.map(label).join(' and ')}. Work backwards: which gate makes each socket output 1?`
        }
        hint2Text="The circuit was solved and submitted for you. This phase scores 0."
        cost1={frac}
        disabled={!interactive}
        onHint={requestHint}
      />
    </section>
  )
}
