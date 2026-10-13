/**
 * Module D // pure model of the three broken boards, the repair actions and the fairness solver.
 * No React, no DOM.
 *
 * A board is  A, B --> [input faults] --> GATE --> (optional NOT) --> LED.
 * Probe nodes: 'A' and 'B' (the input nets after any fault), 'G' (gate output) and 'L' (the wire into the LED).
 * With no NOT fitted G and L carry the same level.
 */

export const ROWS = [[0, 0], [0, 1], [1, 0], [1, 1]]
export const NODES = ['A', 'B', 'G', 'L']

export const readInput = (part, v) => (part === 'ok' ? v : part === 's1' ? 1 : 0) // stuck0 and floating both read 0
export const gateOut = (gate, a, b) => (gate === 'AND' ? a & b : gate === 'OR' ? a | b : a ? 0 : 1) // NOT ignores B

/** Logic level at every probe node for switch setting (a, b). */
export function levels(st, a, b) {
  const A = readInput(st.inA, a)
  const B = readInput(st.inB, b)
  const G = gateOut(st.gate, A, B)
  const L = st.not ? 1 - G : G
  return { A, B, G, L }
}
export const ledLit = (st, a, b) => st.led === 'ok' && levels(st, a, b).L === 1

/** The healthy board for a target: working parts, the target gate, NOT as the target says. */
export const idealState = (target) => ({ inA: 'ok', inB: 'ok', gate: target.gate, not: target.not, led: 'ok' })
/** What the lock needs at (a, b). */
export const targetOut = (target, a, b) => (ledLit(idealState(target), a, b) ? 1 : 0)
export const targetTable = (target) => ROWS.map(([a, b]) => ({ a, b, y: targetOut(target, a, b) }))

/** Per-row pass / fail of RUN TEST. Shows which rows disagree with TARGET and nothing about why. */
export const runTest = (st, target) => ROWS.map(([a, b]) => (ledLit(st, a, b) ? 1 : 0) === targetOut(target, a, b))
export const passes = (st, target) => runTest(st, target).every(Boolean)

/** Part types that are currently faulty (what Hint 1 names). */
export function faultTypes(st, target) {
  const t = idealState(target)
  const list = []
  if (st.inA !== 'ok' || st.inB !== 'ok') list.push('INPUT SWITCH')
  if (st.gate !== t.gate) list.push('GATE')
  if (st.not !== t.not) list.push('NOT STAGE')
  if (st.led !== 'ok') list.push('LED')
  return list
}
export function faultCount(st, target) {
  const t = idealState(target)
  return (st.inA !== 'ok') + (st.inB !== 'ok') + (st.gate !== t.gate) + (st.not !== t.not) + (st.led !== 'ok')
}

// ---------------------------------------------------------------------------
// Repair actions (one spare each)
// ---------------------------------------------------------------------------
export const ACTIONS = ['newA', 'newB', 'newLed', 'gateAND', 'gateOR', 'gateNOT', 'toggleNot']

export function applyAction(st, action) {
  switch (action) {
    case 'newA': return { ...st, inA: 'ok' }
    case 'newB': return { ...st, inB: 'ok' }
    case 'newLed': return { ...st, led: 'ok' }
    case 'gateAND': return { ...st, gate: 'AND' }
    case 'gateOR': return { ...st, gate: 'OR' }
    case 'gateNOT': return { ...st, gate: 'NOT' }
    case 'toggleNot': return { ...st, not: !st.not }
    default: return st
  }
}
/** A spare is wasted when it does not take a faulty part to its correct state (good part replaced, or a gate swapped to the wrong type). */
export const isWasted = (st, action, target) => faultCount(applyAction(st, action), target) >= faultCount(st, target)

/** The repair set that fixes a board (one action per fault). */
export function intendedRepairs(st, target) {
  const t = idealState(target)
  const list = []
  if (st.inA !== 'ok') list.push('newA')
  if (st.inB !== 'ok') list.push('newB')
  if (st.gate !== t.gate) list.push(`gate${t.gate}`)
  if (st.not !== t.not) list.push('toggleNot')
  if (st.led !== 'ok') list.push('newLed')
  return list.sort()
}
export const applyAll = (st, actions) => actions.reduce(applyAction, st)

// ---------------------------------------------------------------------------
// Fairness solver
// ---------------------------------------------------------------------------
const stateKey = (st) => `${st.inA}|${st.inB}|${st.gate}|${+st.not}|${st.led}`

/** Every board state with at most `maxFaults` faults against this target (the player's hypothesis space). */
export function allStates(target, maxFaults = 2) {
  const out = []
  for (const inA of ['ok', 's0', 's1', 'fl']) for (const inB of ['ok', 's0', 's1', 'fl'])
    for (const gate of ['AND', 'OR', 'NOT']) for (const not of [false, true]) for (const led of ['ok', 'dead', 'rev']) {
      const st = { inA, inB, gate, not, led }
      if (faultCount(st, target) <= maxFaults) out.push(st)
    }
  return out
}

/** Every probe the player can make: a node at a switch setting. */
export const ALL_PROBES = NODES.flatMap((node) => ROWS.map(([a, b]) => ({ node, a, b })))
const probeRead = (st, p) => levels(st, p.a, p.b)[p.node]

/**
 * Proves one variant is fair:
 *  1. the intended repair set is the unique minimal one that makes the board match TARGET
 *  2. no single wrong repair accidentally passes (and a wrong repair never hides the real fault)
 *  3. a player who only takes repairs that every still-possible fault needs, re-testing after each, and spends probes to rule
 *     faults out, finishes with no wasted spare inside the probe budget (solvable by logic alone)
 *  4. the spare budget covers the repairs
 * Returns { ok, problems[], minProbes, repairs, ambiguousWithoutProbes }.
 */
export function verifyVariant(variant, { probes = 4, spareExtra = 1, maxLen = 3 } = {}) {
  const { target, start } = variant
  const problems = []
  const repairs = intendedRepairs(start, target)
  const f = repairs.length
  const spares = f + spareExtra

  if (f === 0) problems.push('board has no fault')
  if (passes(start, target)) problems.push('board already matches TARGET')
  if (!passes(applyAll(start, repairs), target)) problems.push('intended repair does not pass')

  // 1. unique minimal repair: BFS over action sequences, collect distinct final states of the shortest passing length
  let frontier = [{ st: start, seq: [] }]
  let minLen = -1
  let finals = new Map()
  for (let len = 0; len <= maxLen && minLen < 0; len++) {
    const hits = frontier.filter((n) => passes(n.st, target))
    if (hits.length) {
      minLen = len
      finals = new Map(hits.map((n) => [stateKey(n.st), n.seq]))
      break
    }
    frontier = frontier.flatMap((n) => ACTIONS.map((a) => ({ st: applyAction(n.st, a), seq: [...n.seq, a] })))
  }
  if (minLen !== f) problems.push(`minimal repair length ${minLen} != fault count ${f}`)
  if (finals.size !== 1) problems.push(`${finals.size} different minimal end states pass`)
  else {
    const only = [...finals.values()][0]
    const key = [...new Set(only)].sort().join()
    if (key !== repairs.join()) problems.push(`unique minimal repair ${key} != intended ${repairs.join()}`)
  }

  // 2. a single wrong repair must not pass, and repairing a good part must leave the board failing
  for (const a of ACTIONS) {
    if (repairs.includes(a)) continue
    if (passes(applyAction(start, a), target)) problems.push(`single wrong repair ${a} passes`)
  }

  // 3. a strategy by logic alone. The player may take any repair that EVERY board still consistent with what they have
  //    seen would need ("safe"), re-run the test after each one, and otherwise spends a probe to rule boards out.
  const hyps = allStates(target, 2)
  const sig = (st) => runTest(st, target).join()
  const repairKey = (st) => intendedRepairs(st, target).join()
  const pool0 = hyps.filter((h) => sig(h) === sig(start))
  const ambiguousWithoutProbes = new Set(pool0.map(repairKey)).size
  const plan = (truth, pool, probesLeft, used, trail) => {
    if (passes(truth, target)) return { probesUsed: trail.filter((t) => t.startsWith('probe')).length, sparesUsed: used, trail }
    const safe = ACTIONS.find((a) => pool.every((h) => intendedRepairs(h, target).includes(a)))
    if (safe) {
      const t2 = applyAction(truth, safe)
      const p2 = pool.map((h) => applyAction(h, safe)).filter((h) => sig(h) === sig(t2))
      return used + 1 > spares ? null : plan(t2, p2, probesLeft, used + 1, [...trail, safe])
    }
    if (probesLeft === 0) return null
    for (const pr of ALL_PROBES) {
      const r = probeRead(truth, pr)
      const next = pool.filter((h) => probeRead(h, pr) === r)
      if (next.length === pool.length) continue
      const got = plan(truth, next, probesLeft - 1, used, [...trail, `probe ${pr.node}@${pr.a}${pr.b}`])
      if (got) return got
    }
    return null
  }
  let minProbes = null
  let probeSet = null
  for (let limit = 0; limit <= probes && minProbes === null; limit++) {
    const got = plan(start, pool0, limit, 0, [])
    if (got && got.sparesUsed === f) { minProbes = got.probesUsed; probeSet = got.trail }
  }
  if (minProbes === null) problems.push(`no logical strategy within ${probes} probes and ${f} spares`)
  if (spares < f) problems.push('spares do not cover the repairs')

  return { ok: problems.length === 0, problems, minProbes, probeSet, repairs, spares, ambiguousWithoutProbes }
}

// ---------------------------------------------------------------------------
// Variant picking and the final arming
// ---------------------------------------------------------------------------
/** Small deterministic PRNG so a seed picks the same variants every time. */
export function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
export function pickVariants(boards, seed) {
  const rnd = mulberry32(seed)
  return boards.map((list) => list[Math.floor(rnd() * list.length)])
}

/** DETONATE: the three LEDs feed one AND. `settings` = [[a, b], ...] per board, `states` = repaired board states. */
export function detonatorLeds(states, settings) {
  return states.map((st, i) => ledLit(st, settings[i][0], settings[i][1]))
}
export const detonatorFires = (states, settings) => detonatorLeds(states, settings).every(Boolean)
