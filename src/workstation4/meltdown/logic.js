import { CIRCUIT_ROUND_BANK, STATION4_CONFIG } from '../mockStation4Data'
import { mulberry32 } from './escape'

// ---------- Module A ----------
export function pickQuestions(bank, count, rng = Math.random) {
  const pool = [...bank]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/** The same question with its options in a random order and `correct` following the right answer. */
export function shuffleOptions(q, rng = Math.random) {
  const order = [0, 1, 2, 3]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) }
}

/** A random element (kept out of the components so they stay pure). */
export const pickOne = (list) => list[Math.floor(Math.random() * list.length)]

/** Points a question is worth after hints / wrong tries. */
export function questionPoints({ hint, wrong }) {
  const cfg = STATION4_CONFIG.moduleA
  const base = STATION4_CONFIG.scoring.moduleA / cfg.questionsPerRun
  let frac = wrong * cfg.wrongAnswerPenaltyFraction
  if (hint >= 1) frac += cfg.hint1PenaltyFraction
  if (hint >= 2) frac = cfg.hint2PenaltyFraction
  return Math.max(0, Math.round(base * (1 - Math.min(1, frac)) * 100) / 100)
}

// ---------- Module C ----------
/** One round per slot (3 slots), drawn from the slot's bank by the run's seed (a versus lobby shares it). */
export function pickRounds(seed) {
  const rnd = seed != null ? mulberry32(seed ^ 0x4c4c4c) : Math.random
  return CIRCUIT_ROUND_BANK.map((bank) => bank[Math.floor(rnd() * bank.length)])
}

export function applyGate(type, a, b) {
  if (a == null) return null
  if (type === 'NOT') return a ? 0 : 1
  if (b == null) return null
  return type === 'AND' ? (a & b) : (a | b)
}

/** values: id -> 0|1|null for every input and socket. */
export function evaluateCircuit(round, inputValues, placements) {
  const values = { ...inputValues }
  for (const s of round.sockets) {
    const type = placements[s.id]
    if (!type) { values[s.id] = null; continue }
    const a = values[s.srcs[0]]
    const b = s.srcs.length > 1 ? values[s.srcs[1]] : a
    values[s.id] = applyGate(type, a, b)
  }
  return values
}

export function initialInputs(round) {
  return Object.fromEntries(round.inputs.map((i) => [i.id, i.value]))
}

/** Column-based auto layout, returns percent coordinates for every node + both doors. */
export function layoutRound(round) {
  const col = {}
  round.inputs.forEach((i) => { col[i.id] = 0 })
  round.sockets.forEach((s) => { col[s.id] = 1 + Math.max(...s.srcs.map((x) => col[x])) })
  const doorCol = Math.max(...Object.values(col)) + 1
  const byCol = {}
  const place = (id, c) => { (byCol[c] ||= []).push(id) }
  round.inputs.forEach((i) => place(i.id, 0))
  round.sockets.forEach((s) => place(s.id, col[s.id]))
  const pos = {}
  const xOf = (c) => 8 + (c * 84) / doorCol
  Object.entries(byCol).forEach(([c, ids]) => {
    ids.forEach((id, k) => { pos[id] = { x: xOf(+c), y: ((k + 1) * 100) / (ids.length + 1) } })
  })
  pos.FWD = { x: xOf(doorCol), y: 30 }
  pos.REAR = { x: xOf(doorCol), y: 72 }
  return pos
}

// ---------- Scoring ----------
export function speedBonus(timeLeft, allCleared, base = 100) {
  if (!allCleared) return 0
  const { speedBonusMax } = STATION4_CONFIG.scoring
  // scaled by the base score earned so auto-solving with Hint 2 cannot farm the bonus
  return Math.floor(speedBonusMax * Math.max(0, Math.min(1, timeLeft / STATION4_CONFIG.totalSeconds)) * Math.max(0, Math.min(1, base / 100)))
}

// ---------- Module B scoring ----------
/** Points a breadboard bay is worth: each strike (failed VERIFY / smoke event) costs 20%, Hint 1 costs 40%, Hint 2 leaves 0. */
export function bayPoints(base, { strikes, hint }) {
  const cfg = STATION4_CONFIG.moduleB
  if (hint >= 2) return 0
  const frac = strikes * cfg.strikePenaltyFraction + (hint >= 1 ? cfg.hint1PenaltyFraction : 0)
  return Math.max(0, Math.round(base * (1 - Math.min(1, frac)) * 100) / 100)
}

// ---------- Module C scoring ----------
/** Points a door-logic phase is worth: each wrong try costs 20%, Hint 1 costs 40%, Hint 2 leaves 0. Never below 0, never lost. */
export function phasePoints(base, { wrong, hint }) {
  const cfg = STATION4_CONFIG.moduleC
  if (hint >= 2) return 0
  const frac = wrong * cfg.wrongPenaltyFraction + (hint >= 1 ? cfg.hint1PenaltyFraction : 0)
  return Math.max(0, Math.round(base * (1 - Math.min(1, frac)) * 100) / 100)
}

/** Every socket (and its feeder sockets, recursively) that decides `target` in a round, for the highlight on the screen. */
export function feeders(round, target) {
  const sockets = new Set()
  const inputs = new Set()
  const walk = (id) => {
    const s = round.sockets.find((x) => x.id === id)
    if (!s) { inputs.add(id); return }
    if (sockets.has(id)) return
    sockets.add(id)
    s.srcs.forEach(walk)
  }
  walk(target)
  return { sockets, inputs }
}

const GATES = ['AND', 'OR', 'NOT']
/**
 * The cheapest change (fewest flipped inputs + gates placed or swapped) that makes `check` true, or null when none exists.
 * The circuits are tiny (3 sockets, <= 4 inputs), so every setting is tried. Used by Hint 1, Hint 2 and the fairness check.
 */
export function cheapestFix(round, inputs, placed, check) {
  const ids = round.sockets.map((s) => s.id)
  const ins = round.inputs.map((i) => i.id)
  let best = null
  for (let im = 0; im < 2 ** ins.length; im++) {
    const iv = {}
    ins.forEach((id, k) => { iv[id] = (im >> k) & 1 })
    for (let gm = 0; gm < 3 ** ids.length; gm++) {
      const pl = {}
      let g = gm
      ids.forEach((id) => { pl[id] = GATES[g % 3]; g = Math.floor(g / 3) })
      const values = evaluateCircuit(round, iv, pl)
      if (!check(values, iv, pl)) continue
      const changes = ins.filter((id) => iv[id] !== inputs[id]).length + ids.filter((id) => pl[id] !== placed[id]).length
      if (!best || changes < best.changes) best = { inputs: iv, placed: pl, changes }
    }
  }
  return best
}

/** The part Hint 1 points at: of the parts the cheapest fix changes, the one nearest the door (last socket first, then inputs). */
export function decidingPart(round, inputs, placed, fix) {
  const socket = [...round.sockets].reverse().find((s) => fix.placed[s.id] !== placed[s.id])
  if (socket) return { kind: 'socket', id: socket.id, empty: !placed[socket.id] }
  const input = [...round.inputs].reverse().find((i) => fix.inputs[i.id] !== inputs[i.id])
  return input ? { kind: 'input', id: input.id } : null
}
