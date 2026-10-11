import { BIOHAZARD_MATRIX, STATION4_CONFIG } from '../mockStation4Data'

// ---------- Module A ----------
export function pickQuestions(bank, count) {
  const pool = [...bank]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/** Points a question is worth after hints / wrong tries. */
export function questionPoints({ hint, wrong }) {
  const cfg = STATION4_CONFIG.moduleA
  const base = STATION4_CONFIG.scoring.moduleA / cfg.questionsPerRun
  let frac = wrong * cfg.wrongAnswerPenaltyFraction
  if (hint >= 1) frac += cfg.hint1PenaltyFraction
  if (hint >= 2) frac = cfg.hint2PenaltyFraction
  return Math.max(0, Math.round(base * (1 - Math.min(1, frac)) * 100) / 100)
}

// ---------- Module B ----------
export function lookup(rowId, column) {
  const { columns, rows } = BIOHAZARD_MATRIX
  const row = rows.find((r) => r[0] === rowId)
  const col = columns.indexOf(column)
  return row && col >= 0 ? row[col] : null
}

/** Resolve a step's row id + expected answer given earlier answers (array of strings). */
export function resolveStep(step, answers) {
  const rowId = typeof step.row === 'string' ? step.row : answers[step.row.fromStep - 1]
  return { rowId, answer: lookup(rowId, step.column) }
}

export const normalise = (s) => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '')

// ---------- Module C ----------
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
export function speedBonus(timeLeft, allCleared) {
  if (!allCleared) return 0
  const { speedBonusMax } = STATION4_CONFIG.scoring
  return Math.round(speedBonusMax * Math.max(0, Math.min(1, timeLeft / STATION4_CONFIG.totalSeconds)))
}
