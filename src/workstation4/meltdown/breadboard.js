/**
 * Module B // pure model of one breadboard bay. No React, no DOM, so it can be tested in isolation.
 *
 * A bay has: a +5V rail (V1..V9, one net), a GND rail (G1..G9, one net), fixed input switch sockets SA / SB,
 * a fixed LED socket LED, and six chip pin holes P1..P6 (DIP numbering: P1..P3 down the left side,
 * P4..P6 up the right side, notch at the top).
 *
 *        notch
 *   P1 A  ┌───┐  VCC P6
 *   P2 B  │   │  NC  P5
 *   P3 GND└───┘  OUT P4
 *
 * Nets: holes in the same rail are one net, every wire joins two nets. A chip is powered only when its VCC pin is on the
 * +5V net and its GND pin on the GND net. Seating a chip the wrong way round (flip = 1) swaps the pins end for end, so
 * VCC lands where GND was: wired the usual way that is reversed power.
 */

export const RAIL_N = 9
export const V_HOLES = Array.from({ length: RAIL_N }, (_, i) => `V${i + 1}`)
export const G_HOLES = Array.from({ length: RAIL_N }, (_, i) => `G${i + 1}`)
export const PIN_HOLES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
/** Hole offsets of the six pins from the chip centre, SVG units (DIP numbering, notch at the top). */
export const PIN_XY = [[-60, -40], [-60, 0], [-60, 40], [60, 40], [60, 0], [60, -40]]
export const ALL_HOLES = [...V_HOLES, ...G_HOLES, 'SA', 'SB', 'LED', ...PIN_HOLES]

const and = (a, b) => a & b
const or = (a, b) => a | b
const PINS2 = ['A', 'B', 'GND', 'OUT', 'NC', 'VCC']
const PINS1 = ['A', 'NC', 'GND', 'OUT', 'NC', 'VCC']

/** Every chip in the tray. NAND / NOR / XOR are decoys: they never match a target table. */
export const CHIPS = {
  AND: { pins: PINS2, fn: and, inputs: 2 },
  OR: { pins: PINS2, fn: or, inputs: 2 },
  NOT: { pins: PINS1, fn: (a) => (a ? 0 : 1), inputs: 1 },
  NAND: { pins: PINS2, fn: (a, b) => (a & b ? 0 : 1), inputs: 2 },
  NOR: { pins: PINS2, fn: (a, b) => (a | b ? 0 : 1), inputs: 2 },
  XOR: { pins: PINS2, fn: (a, b) => a ^ b, inputs: 2 },
}
export const TRAY_ORDER = ['AND', 'NAND', 'OR', 'NOT', 'NOR', 'XOR']

/** Which pin function sits in hole `pos` (1..6) for a chip of this type and orientation. */
export function pinAt(chip, pos) {
  const pins = CHIPS[chip.type].pins
  return pins[(pos - 1 + (chip.flip ? 3 : 0)) % 6]
}
/** The hole (P1..P6) where pin function `fn` sits for this chip. */
export function holeOfPin(chip, fn) {
  const idx = CHIPS[chip.type].pins.indexOf(fn)
  return `P${((idx + (chip.flip ? 3 : 0)) % 6) + 1}`
}

/** Input rows of a bay: 2 inputs -> 4 rows ('00','01','10','11'), 1 input -> 2 rows ('0','1'). */
export const rowKeys = (inputs) => (inputs === 1 ? ['0', '1'] : ['00', '01', '10', '11'])
export const rowKey = (sw, inputs) => (inputs === 1 ? `${sw.A}` : `${sw.A}${sw.B}`)

/** The truth table the lock needs, as { rowKey: 0|1 }. */
export function targetTable(gate) {
  const spec = CHIPS[gate]
  return Object.fromEntries(rowKeys(spec.inputs).map((k) => [k, spec.fn(+k[0], +(k[1] ?? 0))]))
}

/** wires: [{ a, b }]. chip: null | { type, flip }. sw: { A, B }. inputs: 1 | 2 (how many fixed switches the bay has). */
export function simulate({ chip, wires, sw, inputs = 2 }) {
  const parent = new Map(ALL_HOLES.map((h) => [h, h]))
  const find = (h) => {
    let r = h
    while (parent.get(r) !== r) r = parent.get(r)
    parent.set(h, r)
    return r
  }
  const join = (a, b) => { if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b)) }
  V_HOLES.slice(1).forEach((h) => join('V1', h))
  G_HOLES.slice(1).forEach((h) => join('G1', h))
  wires.forEach((w) => join(w.a, w.b))

  const vNet = find('V1')
  const gNet = find('G1')
  const short = vNet === gNet
  const sameNet = (a, b) => find(a) === find(b)

  // net -> { v, s }: the strongest driver wins (rails 3, chip output 2, switches 1)
  const drive = new Map()
  const put = (hole, v, s) => {
    const n = find(hole)
    const cur = drive.get(n)
    if (!cur || s > cur.s) drive.set(n, { v, s })
  }
  const level = (hole) => (short ? null : (drive.get(find(hole))?.v ?? null))
  put('V1', 1, 3)
  put('G1', 0, 3)
  put('SA', sw.A, 1)
  if (inputs === 2) put('SB', sw.B, 1)

  const out = { chip, short, reversed: false, powered: false, a: 0, b: 0, out: null, floating: [], sameNet, level, lit: false, smoke: null }
  if (chip) {
    const vcc = find(holeOfPin(chip, 'VCC'))
    const gnd = find(holeOfPin(chip, 'GND'))
    out.reversed = !short && vcc === gNet && gnd === vNet
    out.powered = !short && vcc === vNet && gnd === gNet
    if (out.powered) {
      const spec = CHIPS[chip.type]
      const la = level(holeOfPin(chip, 'A'))
      if (la === null) out.floating.push('A')
      out.a = la ?? 0
      if (spec.inputs === 2) {
        const lb = level(holeOfPin(chip, 'B'))
        if (lb === null) out.floating.push('B')
        out.b = lb ?? 0
      }
      out.out = spec.fn(out.a, out.b)
      put(holeOfPin(chip, 'OUT'), out.out, 2)
    }
  }
  out.lit = level('LED') === 1
  out.smoke = short ? 'SHORT' : out.reversed ? 'REVERSED' : null
  return out
}

/** The five connections a working bay needs, in teaching order. `to` is the fixed socket (rails use V7 / G4, any rail hole works). */
export function requiredWires(chip, inputs = 2) {
  const list = [
    ['VCC', 'V7'],
    ['GND', 'G4'],
    ['A', 'SA'],
    ...(inputs === 2 ? [['B', 'SB']] : []),
    ['OUT', 'LED'],
  ]
  return list.map(([fn, to]) => ({ fn, a: holeOfPin(chip, fn), b: to }))
}

/** First missing connection for a seated chip (null when everything required is connected). */
export function nextMissing(chip, wires, sw, inputs = 2) {
  const sim = simulate({ chip, wires, sw, inputs })
  return requiredWires(chip, inputs).find((w) => !sim.sameNet(w.a, w.b)) ?? null
}

/** Rows seen so far -> are they complete and equal to the target? */
export function tableStatus(rows, gate) {
  const target = targetTable(gate)
  const keys = Object.keys(target)
  const seen = keys.filter((k) => rows[k] !== undefined)
  return { seen: seen.length, total: keys.length, complete: seen.length === keys.length, match: keys.every((k) => rows[k] === target[k]) }
}

/**
 * VERIFY BAY: passes only when the chip is powered, every input pin is wired, nothing is on fire and YOUR table is complete
 * and equals TARGET (a spare input left floating would otherwise let a decoy chip pass by accident).
 * Returns { ok, reason } with a short reason for the status line.
 */
export function verifyBay({ chip, wires, sw, rows }, gate) {
  const inputs = CHIPS[gate].inputs
  if (!chip) return { ok: false, reason: 'NO CHIP' }
  const sim = simulate({ chip, wires, sw, inputs })
  if (sim.smoke) return { ok: false, reason: sim.smoke === 'SHORT' ? 'SHORT CIRCUIT' : 'REVERSED POWER' }
  if (!sim.powered) return { ok: false, reason: 'NOT POWERED' }
  if (sim.floating.length) return { ok: false, reason: `${sim.floating.join('+')} NOT WIRED` }
  const t = tableStatus(rows, gate)
  if (!t.complete) return { ok: false, reason: 'TRY EVERY ROW' }
  if (!t.match) return { ok: false, reason: 'YOUR ≠ TARGET' }
  return { ok: true, reason: 'MATCH' }
}

/** Hint 2 / auto mode: the correct chip, upright, with every required wire. */
export function builtBay(gate) {
  const chip = { type: gate, flip: 0 }
  return { chip, wires: requiredWires(chip, CHIPS[gate].inputs).map((w, i) => ({ id: `auto${i}`, a: w.a, b: w.b, fixed: true })) }
}
