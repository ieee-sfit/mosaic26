import { useCallback, useEffect, useRef, useState } from 'react'
import { BAYS, STATION4_CONFIG, WIRING_MODE } from '../mockStation4Data'
import {
  CHIPS, G_HOLES, PIN_HOLES, PIN_XY, TRAY_ORDER, V_HOLES, builtBay, nextMissing, requiredWires, rowKey, rowKeys,
  simulate, tableStatus, targetTable, verifyBay,
} from './breadboard'
import { Chip, Hole, Led, Switch, Table } from './BoardParts'
import { bayPoints } from './logic'
import HintDock from '../../core/HintDock'

// ---------------------------------------------------------------- geometry (SVG units)
const BAY_W = 440
const BAY_H = 520
const GAP = 20
const TRAY_Y = 540
const VIEW_W = BAY_W * 3 + GAP * 2
const VIEW_H = 680
const CHIP_C = [230, 225] // chip centre inside a bay
const bayX = (i) => i * (BAY_W + GAP)
const holeXY = (id) => {
  if (id[0] === 'V') return [60 + 40 * (+id.slice(1) - 1), 62]
  if (id[0] === 'G') return [60 + 40 * (+id.slice(1) - 1), 340]
  if (id === 'SA') return [122, 135]
  if (id === 'SB') return [122, 225]
  if (id === 'LED') return [350, 225]
  const [dx, dy] = PIN_XY[+id.slice(1) - 1]
  return [CHIP_C[0] + dx, CHIP_C[1] + dy]
}
const abs = (i, id) => { const [x, y] = holeXY(id); return [bayX(i) + x, y] }
const TRAY_XY = Object.fromEntries(TRAY_ORDER.map((t, i) => [t, [100 + i * 150, TRAY_Y + 76]]))
const SNAP_R = 30
const SEAT_R = 90

const newBay = () => ({ chip: null, wires: [], sw: { A: 0, B: 0 }, rows: {}, done: false, hint: 0, strikes: 0, pts: 0, msg: '' })
const wireId = (() => { let n = 0; return () => `w${++n}` })()

/** Record what the LED shows for the current switch setting, then settle fire: a short or reversed power fries something. */
function settle(bay, gate, justWire) {
  const inputs = CHIPS[gate].inputs
  let b = bay
  let event = null
  let sim = simulate({ chip: b.chip, wires: b.wires, sw: b.sw, inputs })
  if (sim.short) {
    const wires = [...b.wires]
    while (sim.short && wires.length) {
      const k = justWire ? wires.length - 1 : wires.findLastIndex((w) => !w.fixed)
      if (k < 0) break
      wires.splice(k, 1)
      sim = simulate({ chip: b.chip, wires, sw: b.sw, inputs })
    }
    b = { ...b, wires }
    event = 'SHORT'
  } else if (sim.reversed) {
    b = { ...b, chip: null }
    event = 'REVERSED'
    sim = simulate({ chip: null, wires: b.wires, sw: b.sw, inputs })
  }
  return { bay: { ...b, rows: { [rowKey(b.sw, inputs)]: sim.lit ? 1 : 0 } }, event }
}

const sumPts = (bays) => Math.round(bays.reduce((n, b) => n + (b.done ? b.pts : 0), 0) * 100) / 100

export default function ModuleB({ onScore, onDone, fx, log, track }) {
  const cfg = STATION4_CONFIG.moduleB
  const svgRef = useRef(null)
  const [bays, setBays] = useState(() => BAYS.map(newBay))
  const baysRef = useRef(bays)
  const [active, setActive] = useState(0)
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)
  const [smoke, setSmoke] = useState(null)
  const [fin, setFin] = useState(false)
  const finRef = useRef(false)
  const auto = WIRING_MODE === 'auto'

  const commit = useCallback((next) => { baysRef.current = next; setBays(next) }, [])
  const patchBay = (i, fn) => { const next = baysRef.current.map((b, k) => (k === i ? fn(b) : b)); commit(next); return next }

  const seatedTypes = bays.map((b) => b.chip?.type).filter(Boolean)
  const tray = TRAY_ORDER.filter((t) => !seatedTypes.includes(t))
  const sims = bays.map((b, i) => simulate({ chip: b.chip, wires: b.wires, sw: b.sw, inputs: CHIPS[BAYS[i].gate].inputs }))

  // ---------------------------------------------------------------- events
  const burn = (i, event) => {
    const msg = event === 'SHORT' ? 'SHORT! +5V MET GND' : 'SMOKE! CHIP FRIED · VCC AND GND SWAPPED'
    setSmoke((s) => ({ bay: i, kind: event, key: (s?.key ?? 0) + 1 }))
    window.setTimeout(() => setSmoke((s) => (s && s.bay === i ? null : s)), 1100)
    fx?.('strobe')
    track?.('B', 'wrong', `BAY${i + 1} SMOKE`)
    log?.(`BAY ${i + 1} ${event === 'SHORT' ? 'SHORT CIRCUIT' : 'CHIP FRIED'} // -${cfg.strikePenaltyFraction * 100}% BAY`, 'crit')
    return msg
  }

  /** Structure changed (chip or wire): settle, count a strike for smoke, rebuild YOUR table. */
  const restructure = (i, mutate, justWire = false) => {
    const cur = baysRef.current[i]
    if (cur.done) return
    let changed = mutate(cur)
    if (auto) changed = withAutoWires(changed, BAYS[i].gate)
    const { bay, event } = settle(changed, BAYS[i].gate, justWire)
    const msg = event ? burn(i, event) : ''
    patchBay(i, () => ({ ...bay, strikes: cur.strikes + (event ? 1 : 0), msg }))
    setActive(i)
  }

  const toggleSwitch = (i, name) => {
    const cur = baysRef.current[i]
    const inputs = CHIPS[BAYS[i].gate].inputs
    const sw = { ...cur.sw, [name]: cur.sw[name] ? 0 : 1 }
    const sim = simulate({ chip: cur.chip, wires: cur.wires, sw, inputs })
    patchBay(i, (b) => (b.done ? { ...b, sw } : { ...b, sw, msg: '', rows: { ...b.rows, [rowKey(sw, inputs)]: sim.lit ? 1 : 0 } }))
    setActive(i)
  }

  const seatChip = (i, type) => restructure(i, (b) => ({ ...b, chip: { type }, wires: auto ? [] : b.wires }))
  const pullChip = (i) => restructure(i, (b) => ({ ...b, chip: null, wires: auto ? [] : b.wires }))
  const addWire = (i, a, b) => {
    if (a === b || baysRef.current[i].wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return
    restructure(i, (bay) => ({ ...bay, wires: [...bay.wires, { id: wireId(), a, b }] }), true)
  }
  const cutWire = (i, id) => restructure(i, (b) => ({ ...b, wires: b.wires.filter((w) => w.id !== id || w.fixed) }))

  const verify = (i) => {
    const cur = baysRef.current[i]
    if (cur.done || !cur.chip) return
    const res = verifyBay(cur, BAYS[i].gate)
    if (!res.ok) {
      track?.('B', 'wrong', `BAY${i + 1} VERIFY`)
      fx?.('glitch')
      log?.(`BAY ${i + 1} VERIFY FAILED // ${res.reason} // -${cfg.strikePenaltyFraction * 100}% BAY`, 'warn')
      patchBay(i, (b) => ({ ...b, strikes: b.strikes + 1, msg: `VERIFY FAILED · ${res.reason}` }))
      return
    }
    finishBay(i, cur, false)
  }

  const finishBay = (i, base, byHint, extra = {}) => {
    const pts = bayPoints(cfg.bayPoints[i], { strikes: base.strikes, hint: byHint ? 2 : base.hint })
    const next = patchBay(i, (b) => ({ ...b, ...extra, done: true, pts, msg: '' }))
    onScore(sumPts(next))
    log?.(`BAY ${i + 1} VERIFIED // +${pts} PTS`, 'ok')
    const left = next.findIndex((b) => !b.done)
    if (left >= 0) setActive(left)
    else if (!finRef.current) {
      finRef.current = true
      setFin(true)
      fx?.('shake')
      window.setTimeout(onDone, 1600)
    }
  }

  // ---------------------------------------------------------------- hints
  const gateOf = (i) => BAYS[i].gate
  const nextStep = (i) => {
    const b = bays[i]
    const gate = gateOf(i)
    const inputs = CHIPS[gate].inputs
    if (b.done) return null
    if (!b.chip || b.chip.type !== gate) return { kind: 'chip', type: gate, text: b.chip ? 'Wrong chip. Read the TARGET table and pick the chip that makes that LED pattern.' : 'Seat the glowing chip in the slot. The TARGET table says which gate it is.' }
    const w = nextMissing(b.chip, b.wires, b.sw, inputs)
    if (w) {
      const what = { VCC: 'VCC pin to the +5V rail', GND: 'GND pin to the GND rail', A: 'A pin to switch A', B: 'B pin to switch B', OUT: 'OUT pin to the LED' }[w.fn]
      return { kind: 'wire', w, text: `Next wire: ${what}. Both ends glow.` }
    }
    const t = tableStatus(b.rows, gate)
    if (!t.complete) return { kind: 'rows', text: `Click the switches through every row (${t.seen}/${t.total} tried).` }
    return { kind: 'verify', text: 'Everything is wired and every row is tried. Press VERIFY BAY.' }
  }

  const requestHint = (next) => {
    const i = active
    const cur = baysRef.current[i]
    if (cur.done || cur.hint >= next) return
    track?.('B', 'hint', `BAY${i + 1} H${next}`)
    if (next === 1) {
      patchBay(i, (b) => ({ ...b, hint: 1 }))
      log?.(`HINT 1 // BAY ${i + 1} // -${cfg.hint1PenaltyFraction * 100}% BAY`, 'warn')
      return
    }
    const inputs = CHIPS[gateOf(i)].inputs
    const built = builtBay(gateOf(i))
    const sw = { A: 0, B: 0 }
    const rows = {}
    for (const k of rowKeys(inputs)) {
      const s = { A: +k[0], B: +(k[1] ?? 0) }
      rows[k] = simulate({ chip: built.chip, wires: built.wires, sw: s, inputs }).lit ? 1 : 0
    }
    log?.(`HINT 2 // BAY ${i + 1} BUILT FOR YOU // 0 PTS`, 'crit')
    fx?.('glitch')
    finishBay(i, { ...cur, hint: 2 }, true, { chip: built.chip, wires: built.wires, rows, sw, hint: 2 })
  }

  // ---------------------------------------------------------------- pointer plumbing (mouse + touch)
  const toSvg = (e) => {
    const svg = svgRef.current
    const m = svg.getScreenCTM()
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const q = m ? p.matrixTransform(m.inverse()) : p
    return [q.x, q.y]
  }
  const nearestHole = (bay, x, y, from) => {
    let best = null
    for (const h of [...V_HOLES, ...G_HOLES, 'SA', ...(CHIPS[BAYS[bay].gate].inputs === 2 ? ['SB'] : []), 'LED', ...PIN_HOLES]) {
      if (h === from) continue
      const [hx, hy] = abs(bay, h)
      const d = Math.hypot(hx - x, hy - y)
      if (d <= SNAP_R && (!best || d < best.d)) best = { h, d }
    }
    return best?.h ?? null
  }
  const nearestSlot = (x, y) => {
    let best = null
    baysRef.current.forEach((b, i) => {
      const d = Math.hypot(bayX(i) + CHIP_C[0] - x, CHIP_C[1] - y)
      if (d <= SEAT_R && !b.done && (!best || d < best.d)) best = { i, d }
    })
    return best?.i ?? null
  }

  const beginDrag = (init) => {
    dragRef.current = init
    setDrag(init)
    const move = (ev) => {
      const d = dragRef.current
      if (!d) return
      const [x, y] = toSvg(ev)
      if (d.kind === 'chip') {
        const moved = d.moved || Math.hypot(x - d.x0, y - d.y0) > 6
        dragRef.current = { ...d, x, y, moved, over: moved ? nearestSlot(x, y) : null }
      } else {
        dragRef.current = { ...d, x, y, snap: nearestHole(d.bay, x, y, d.from) }
      }
      setDrag(dragRef.current)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d) return
      if (d.kind === 'wire') {
        if (d.snap) addWire(d.bay, d.from, d.snap)
        return
      }
      // chip
      if (!d.moved) return
      const over = d.over
      if (d.fromBay != null) {
        if (over === null) pullChip(d.fromBay)
        else if (over !== d.fromBay && !baysRef.current[over].chip) { pullChip(d.fromBay); seatChip(over, d.type) }
      } else if (over !== null && !baysRef.current[over].chip) seatChip(over, d.type)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const downTray = (e, type) => {
    e.preventDefault()
    const [x, y] = toSvg(e)
    beginDrag({ kind: 'chip', type, x, y, x0: x, y0: y, moved: false, fromBay: null, over: null })
  }
  const downSeated = (e, i) => {
    if (baysRef.current[i].done) return
    e.preventDefault()
    const [x, y] = toSvg(e)
    beginDrag({ kind: 'chip', type: baysRef.current[i].chip.type, x, y, x0: x, y0: y, moved: false, fromBay: i, over: null })
  }
  const downHole = (e, i, hole) => {
    if (auto || baysRef.current[i].done) return
    e.preventDefault()
    const [x, y] = toSvg(e)
    beginDrag({ kind: 'wire', bay: i, from: hole, x, y, snap: null })
  }

  // clean up if the module unmounts mid-drag
  useEffect(() => () => { dragRef.current = null }, [])

  // ---------------------------------------------------------------- render helpers
  const hintStep = (i) => (bays[i].hint >= 1 && !bays[i].done ? nextStep(i) : null)

  const wirePath = (i, a, b) => {
    const [x1, y1] = holeXY(a)
    const [x2, y2] = holeXY(b)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2 + 16
    return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`
  }

  const statusOf = (i) => {
    const b = bays[i]
    const sim = sims[i]
    const t = tableStatus(b.rows, BAYS[i].gate)
    if (b.done) return { text: 'BAY DONE ✔', tone: 'ok' }
    if (b.msg) return { text: b.msg, tone: 'bad' }
    if (!b.chip) return { text: 'DROP A CHIP IN THE SLOT', tone: '' }
    if (!sim.powered) return { text: 'NO POWER YET · WIRE VCC AND GND', tone: '' }
    if (sim.floating.length) return { text: `${sim.floating.join(' + ')} NOT WIRED · READS 0`, tone: 'warn' }
    if (!t.complete) return { text: `TRY EVERY ROW · ${t.seen}/${t.total}`, tone: '' }
    return { text: 'READY · PRESS VERIFY BAY', tone: 'ok' }
  }

  const renderBay = (i) => {
    const cfgBay = BAYS[i]
    const b = bays[i]
    const sim = sims[i]
    const spec = CHIPS[cfgBay.gate]
    const inputs = spec.inputs
    const target = targetTable(cfgBay.gate)
    const step = hintStep(i)
    const st = statusOf(i)
    const keys = rowKeys(inputs)
    const cols = inputs === 1 ? ['A', 'Y'] : ['A', 'B', 'Y']
    const tgtRows = keys.map((k) => ({ key: k, cells: [...k.split(''), target[k]] }))
    const yourRows = keys.map((k) => {
      const seen = b.rows[k] !== undefined
      return { key: k, cells: [...k.split(''), seen ? b.rows[k] : '·'], tone: seen ? (b.rows[k] === target[k] ? 'ok' : 'bad') : '', cls: seen ? '' : 'is-blank' }
    })
    const hot = new Set()
    if (step?.kind === 'wire') { hot.add(step.w.a); hot.add(step.w.b) }
    const magnet = drag?.kind === 'wire' && drag.bay === i
    const isActive = active === i && !b.done
    const x0 = bayX(i)
    const lockedWires = auto || b.done
    const sockTag = (id) => ({ SA: 'A', SB: 'B', LED: 'OUT' }[id])
    const slotOver = drag?.kind === 'chip' && drag.moved && drag.over === i

    return (
      <g key={cfgBay.id} transform={`translate(${x0} 0)`} className={`mz-bay ${b.done ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`} style={{ '--bay': cfgBay.color }} data-bay={i}>
        <rect className="mz-bay-frame" x="0" y="0" width={BAY_W} height={BAY_H} rx="6" />
        <text className="mz-bay-title" x="16" y="22">BAY {i + 1}</text>
        <text className="mz-bay-tag" x={BAY_W - 16} y="22" textAnchor="end">{b.done ? '✔ DONE' : isActive ? '◆ HINTS HERE' : ''}</text>

        {/* rails */}
        <line className="mz-rail mz-rail-5" x1="40" x2="420" y1="62" y2="62" />
        <text className="mz-rail-lab p" x="40" y="48">VCC · +5V RAIL</text>
        <line className="mz-rail mz-rail-0" x1="40" x2="420" y1="340" y2="340" />
        <text className="mz-rail-lab g" x="40" y="360">GND RAIL</text>

        {/* fixed parts: switches, LED, resistor */}
        <path className="mz-trace" d={`M92 135 H122${inputs === 2 ? ' M92 225 H122' : ''}`} />
        <Switch x={58} y={135} name="A" value={b.sw.A} onToggle={() => toggleSwitch(i, 'A')} dataset={{ 'data-switch': `${i}:A` }} />
        {inputs === 2 && <Switch x={58} y={225} name="B" value={b.sw.B} onToggle={() => toggleSwitch(i, 'B')} dataset={{ 'data-switch': `${i}:B` }} />}
        {inputs === 1 && (
          <g className="mz-unused" data-unused-b={i}>
            <circle className="mz-unused-dot" cx="122" cy="225" r="7" />
            <text className="mz-socklab" x="122" y="211" textAnchor="middle">B</text>
            <text className="mz-pinoff" x="122" y="248" textAnchor="middle">not used</text>
          </g>
        )}
        <path className="mz-trace" d="M350 225 H381" />
        <Led x={398} y={225} lit={sim.lit} ground={340} />

        {/* chip slot and chip */}
        <rect className={`mz-slot ${slotOver ? 'is-over' : ''} ${step?.kind === 'chip' ? 'is-hot' : ''}`} x={CHIP_C[0] - 42} y={CHIP_C[1] - 57} width="84" height="114" rx="5" data-slot={i} />
        {!b.chip && <text className="mz-slot-lab" x={CHIP_C[0]} y={CHIP_C[1] + 4} textAnchor="middle">SLOT</text>}

        {/* wires (under the holes) */}
        {b.wires.map((w) => (
          <g key={w.id} className={`mz-wirewrap ${lockedWires ? 'is-fixed' : ''}`}>
            <path className={`mz-bwire l${sim.level(w.a) ?? 'n'}`} d={wirePath(i, w.a, w.b)} />
            {!lockedWires && <path className="mz-bwire-hit" d={wirePath(i, w.a, w.b)} data-act="wire" data-wire={w.id} onClick={() => cutWire(i, w.id)} />}
          </g>
        ))}

        {/* Hint 1: the next correct wire pulses between its two holes */}
        {step?.kind === 'wire' && <path className="mz-bwire is-hint" d={wirePath(i, step.w.a, step.w.b)} data-hint-wire={`${step.w.a}-${step.w.b}`} />}

        {/* seated chip: drag lifts it out */}
        {b.chip && !(drag?.kind === 'chip' && drag.fromBay === i && drag.moved) && (
          <g className={`mz-seated ${b.done ? 'is-locked' : ''}`} data-act="seated" data-seated={i} data-type={b.chip.type} onPointerDown={(e) => downSeated(e, i)}>
            <Chip cx={CHIP_C[0]} cy={CHIP_C[1]} chip={b.chip} glow={sim.powered} />
            <rect x={CHIP_C[0] - 42} y={CHIP_C[1] - 57} width="84" height="114" fill="transparent" />
          </g>
        )}
        {/* holes */}
        {V_HOLES.map((h) => { const [x, y] = holeXY(h); return <Hole key={h} id={`${i}:${h}`} x={x} y={y} kind="v" hot={hot.has(h)} magnet={magnet} snap={drag?.snap === h && magnet} dataset={{ onPointerDown: (e) => downHole(e, i, h) }} /> })}
        {G_HOLES.map((h) => { const [x, y] = holeXY(h); return <Hole key={h} id={`${i}:${h}`} x={x} y={y} kind="g" hot={hot.has(h)} magnet={magnet} snap={drag?.snap === h && magnet} dataset={{ onPointerDown: (e) => downHole(e, i, h) }} /> })}
        {['SA', ...(inputs === 2 ? ['SB'] : []), 'LED'].map((h) => { const [x, y] = holeXY(h); return <Hole key={h} id={`${i}:${h}`} x={x} y={y} kind="s" r={7} label={sockTag(h)} labelDy={-14} hot={hot.has(h)} magnet={magnet} snap={drag?.snap === h && magnet} dataset={{ onPointerDown: (e) => downHole(e, i, h) }} /> })}
        {PIN_HOLES.map((h) => { const [x, y] = holeXY(h); return <Hole key={h} id={`${i}:${h}`} x={x} y={y} kind="p" hot={hot.has(h)} magnet={magnet} snap={drag?.snap === h && magnet} dataset={{ onPointerDown: (e) => downHole(e, i, h) }} /> })}

        {sim.smoke === null && b.chip && sim.powered && sim.floating.length > 0 && (
          <text className="mz-float" x={CHIP_C[0]} y={CHIP_C[1] + 78} textAnchor="middle">{sim.floating.join('+')} FLOATING</text>
        )}

        {/* tables, verify, status */}
        <Table x={20} y={392} title="TARGET" cols={cols} rows={tgtRows} width={cols.length === 2 ? 96 : 128} accent={cfgBay.color} dataset={{ 'data-table': `${i}:target` }} />
        <Table x={cols.length === 2 ? 142 : 168} y={392} title="YOUR" cols={cols} rows={yourRows} width={cols.length === 2 ? 96 : 128} accent="#c9e8d4" dataset={{ 'data-table': `${i}:yours` }} />
        <g className={`mz-vbtn ${!b.chip || b.done ? 'is-off' : ''} ${step?.kind === 'verify' ? 'is-hot' : ''}`} role="button" tabIndex={b.chip && !b.done ? 0 : -1} aria-label={`Verify bay ${i + 1}`}
          data-verify={i} onClick={() => verify(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), verify(i))}>
          <rect x="316" y="400" width="104" height="44" rx="4" />
          <text x="368" y="427" textAnchor="middle">VERIFY BAY</text>
        </g>
        <text className={`mz-status ${st.tone}`} x="16" y="508" data-status={i}>{st.text}</text>

        {smoke?.bay === i && (
          <g className="mz-smoke" key={smoke.key} pointerEvents="none" data-smoke={smoke.kind}>
            {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={CHIP_C[0] - 30 + k * 15} cy={CHIP_C[1] - 20} r={14 + k * 2} style={{ animationDelay: `${k * 90}ms` }} />)}
            <text x={CHIP_C[0]} y={CHIP_C[1] - 70} textAnchor="middle">{smoke.kind === 'SHORT' ? 'SHORT!' : 'SMOKE!'}</text>
          </g>
        )}
      </g>
    )
  }

  const dragWire = drag?.kind === 'wire' ? drag : null
  const dragChip = drag?.kind === 'chip' && drag.moved ? drag : null
  const hintChipType = (() => { const s = hintStep(active); return s?.kind === 'chip' ? s.type : null })()
  const dock = nextStep(active)
  const doneCount = bays.filter((b) => b.done).length

  return (
    <section className="mz-modB mz-fade-in">
      <div className="mz-bbwrap">
        <svg ref={svgRef} className="mz-bb" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="group" aria-label="Breadboard lab" data-bb>
          {bays.map((_, i) => renderBay(i))}

          {/* parts tray */}
          <g className="mz-tray" transform={`translate(0 ${TRAY_Y})`}>
            <rect className="mz-tray-bg" x="0" y="0" width="780" height="136" rx="6" />
            <text className="mz-tray-title" x="16" y="22">PARTS TRAY · {doneCount}/3 BAYS</text>
            <text className="mz-tray-tip" x="810" y="30">1 · DRAG A CHIP INTO A SLOT</text>
            <text className="mz-tray-tip" x="810" y="52">2 · DRAG WIRES FROM HOLE TO HOLE</text>
            <text className="mz-tray-tip" x="810" y="74">3 · CLICK A WIRE TO CUT IT</text>
            <text className="mz-tray-tip" x="810" y="96">4 · TRY EVERY ROW, THEN VERIFY</text>
          </g>
          {TRAY_ORDER.map((t) => {
            const [x, y] = TRAY_XY[t]
            const gone = !tray.includes(t) || (dragChip && dragChip.fromBay == null && dragChip.type === t)
            return (
              <g key={t} className={`mz-traychip ${gone ? 'is-gone' : ''} ${hintChipType === t ? 'is-hot' : ''}`} data-act="traychip" data-chip={t}
                onPointerDown={(e) => !gone && downTray(e, t)}>
                <rect x={x - 62} y={y - 62} width="124" height="124" fill="transparent" />
                <Chip cx={x} cy={y} chip={{ type: t }} labels={false} scale={0.82} dim={gone} />
              </g>
            )
          })}

          {dragWire && (() => {
            const [x1, y1] = abs(dragWire.bay, dragWire.from)
            const [x2, y2] = dragWire.snap ? abs(dragWire.bay, dragWire.snap) : [dragWire.x, dragWire.y]
            return <path className="mz-bwire is-drag" d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + 16} ${x2} ${y2}`} pointerEvents="none" />
          })()}
          {dragChip && (
            <g pointerEvents="none" className="mz-dragchip">
              <Chip cx={dragChip.x} cy={dragChip.y} chip={{ type: dragChip.type }} labels={false} glow />
            </g>
          )}
        </svg>
        {fin && <div className="mz-bb-done mz-fade-in" role="status">KIT BUILT · 3/3 BAYS</div>}
      </div>
      <HintDock
        level={bays[active].hint}
        itemLabel={`BAY ${active + 1}`}
        hint1Text={dock?.text ?? 'Bay is finished.'}
        hint2Text={`Bay ${active + 1} was built for you. It scores 0.`}
        cost1={cfg.hint1PenaltyFraction}
        disabled={bays[active].done}
        onHint={requestHint}
      />
    </section>
  )
}

/** Auto mode: seating a chip connects all of its pins to the fixed sockets by label (orientation does not matter). */
function withAutoWires(bay, gate) {
  if (!bay.chip) return { ...bay, wires: [] }
  const inputs = CHIPS[gate].inputs
  return { ...bay, wires: requiredWires(bay.chip, inputs).map((w, k) => ({ id: `auto${k}`, a: w.a, b: w.b, fixed: true })) }
}

