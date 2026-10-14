/**
 * STATION 4 // AREA 51 MELTDOWN — ISOLATED CONTENT FILE
 * ---------------------------------------------------------------------------
 * Everything the event staff may want to swap lives here: the question bank,
 * the breadboard bays, the airlock circuit rounds and the Module D repair boards.
 * Components under ./meltdown only read from this module and contain no content of their own.
 *
 * Authoring rules
 *  - Module B target tables are NOT stored: they are derived from the bay's gate (see breadboard.js).
 *  - Module D boards are stored as a faulty `start` state plus the `target` gate; the repair set is derived from the
 *    difference, and escape.js `verifyVariant` proves each variant is fair (run it after editing a board).
 *  - Module C sockets reference sources by id. A source is either an input id
 *    or the id of an EARLIER socket (so circuits are always acyclic).
 *  - Every circuit round must be solvable in phase 1 (forward = 1); phase 2 is always solvable by toggling an input or swapping a gate.
 */

export type GateType = 'AND' | 'OR' | 'NOT'

// ---------------------------------------------------------------------------
// GLOBAL CONFIG
// ---------------------------------------------------------------------------
export const STATION4_CONFIG = {
  gameId: 'station4',
  title: 'AREA 51 MELTDOWN',
  totalSeconds: 12 * 60,
  operatorIdPattern: /^\d{6}$/,
  scoring: {
    moduleA: 15, // 3 questions x 5
    moduleB: 40, // 3 breadboard bays: 13 + 13 + 14
    moduleC: 45, // 3 rounds x (8 breach + 7 seal)
    moduleD: 20, // optional bonus: FINAL ESCAPE, 4 + 6 + 7 + 3. Not part of the base or the letter grade
    speedBonusMax: 20, // scaled by time_left when every module is cleared, frozen when Module C ends
  },
  moduleA: {
    questionsPerRun: 3,
    wrongAnswerPenaltyFraction: 0.2, // of the question's points, per wrong try
    hint1PenaltyFraction: 0.4, // "-40% pts"
    hint2PenaltyFraction: 1.0, // "-100% pts" (auto-select)
  },
  moduleB: {
    bayPoints: [13, 13, 14], // AND bay, OR bay, NOT bay
    strikePenaltyFraction: 0.2, // per failed VERIFY and per smoke event, of that bay's points
    hint1PenaltyFraction: 0.4,
  },
  moduleD: {
    maxSeconds: 180, // cap on the whole round (also capped by the shift time left)
    offerSeconds: 20, // auto-skip of the PLAY / SKIP offer, so an abandoned kiosk still saves its run
    boardPoints: [4, 6, 7],
    armingPoints: 3,
    probes: 4, // per board
    spareExtra: 1, // spares per board = faults + this
    wastePenaltyFraction: 0.2, // per wasted spare, of that board's points
    hint1PenaltyFraction: 0.4,
    detonatePenalty: 1, // points lost per rejected DETONATE
  },
  moduleC: {
    seals: 3,
    phaseSeconds: 90, // timing out a phase breaks one seal and re-arms the clock
    breachPoints: 8,
    sealPoints: 7,
  },
}

// ---------------------------------------------------------------------------
// MODULE A — 15 QUESTION BANK (3 drawn at random per run)
// ---------------------------------------------------------------------------
export interface ProtocolQuestion {
  id: string
  gate: 'AND' | 'OR' | 'NOT' | 'MIXED'
  prompt: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
}

export const QUESTION_BANK: ProtocolQuestion[] = [
  { id: 'q01', gate: 'AND',
    prompt: 'Containment door sensors read A = 1 and B = 0. What does Y = A AND B output?',
    options: ['Y = 1', 'Y = 0', 'Y = floating', 'Y = A + B'], correct: 1 },
  { id: 'q02', gate: 'AND',
    prompt: 'A two-input AND gate drives the vent seal. For which input pair does it output 1?',
    options: ['0 , 0', '0 , 1', '1 , 0', '1 , 1'], correct: 3 },
  { id: 'q03', gate: 'AND',
    prompt: 'Three-input AND gate: inputs are 1, 1, 0. What is the output?',
    options: ['1', '0', 'Undefined', '2'], correct: 1 },
  { id: 'q04', gate: 'AND',
    prompt: 'How many of the 4 rows in a 2-input AND truth table output 1?',
    options: ['0', '1', '2', '4'], correct: 1 },
  { id: 'q05', gate: 'OR',
    prompt: 'Alarm line: Y = A OR B with A = 0 and B = 1. What is Y?',
    options: ['0', '1', 'Floating', 'Inverted A'], correct: 1 },
  { id: 'q06', gate: 'OR',
    prompt: 'For which input pair does a 2-input OR gate output 0?',
    options: ['0 , 0', '0 , 1', '1 , 0', '1 , 1'], correct: 0 },
  { id: 'q07', gate: 'OR',
    prompt: 'How many of the 4 rows in a 2-input OR truth table output 1?',
    options: ['1', '2', '3', '4'], correct: 2 },
  { id: 'q08', gate: 'OR',
    prompt: 'A three-input OR gate sees 0, 0, 1. The output is:',
    options: ['0', '1', 'Undefined', 'Same as the first input'], correct: 1 },
  { id: 'q09', gate: 'NOT',
    prompt: 'The quarantine flag A is 1. What does Y = NOT A output?',
    options: ['1', '0', 'Floating', '2'], correct: 1 },
  { id: 'q10', gate: 'NOT',
    prompt: 'Two NOT gates are chained: A -> NOT -> NOT -> Y. If A = 0, Y equals:',
    options: ['0', '1', 'Floating', 'Cannot be determined'], correct: 0 },
  { id: 'q11', gate: 'NOT',
    prompt: 'A NOT gate has how many inputs?',
    options: ['1', '2', '3', 'Any number'], correct: 0 },
  { id: 'q12', gate: 'MIXED',
    prompt: 'Y = NOT (A AND B) with A = 1, B = 1. What is Y?',
    options: ['1', '0', 'Floating', 'Same as A'], correct: 1 },
  { id: 'q13', gate: 'MIXED',
    prompt: 'Y = NOT (A OR B) with A = 0, B = 0. What is Y?',
    options: ['0', '1', 'Floating', 'Same as B'], correct: 1 },
  { id: 'q14', gate: 'MIXED',
    prompt: 'Y = A AND (NOT B) with A = 1, B = 0. What is Y?',
    options: ['0', '1', 'Floating', 'Same as B'], correct: 1 },
  { id: 'q15', gate: 'MIXED',
    prompt: 'Which single input pair makes (A OR B) AND (NOT A) output 1?',
    options: ['A=0, B=1', 'A=1, B=0', 'A=1, B=1', 'A=0, B=0'], correct: 0 },
]

// ---------------------------------------------------------------------------
// MODULE B — BREADBOARD LAB (3 bays, one gate each)
// ---------------------------------------------------------------------------
/** 'pins' = the player wires VCC / GND / A / B / OUT by hand. 'auto' = seating a chip connects every pin by itself. */
export const WIRING_MODE: 'pins' | 'auto' = 'pins'

export interface BayConfig {
  id: string
  /** The gate the lock needs. The bay never shows this name: the TARGET table decides which chip fits. */
  gate: 'AND' | 'OR' | 'NOT'
  /** Colour of the bay border. */
  color: string
  /** 'all' = pin labels on chip and sockets, 'chip' = on the chip only, 'none' = hidden (Hint 1 reveals them). */
  labels: 'all' | 'chip' | 'none'
  /** Chips seated in this bay may arrive wrong way round (picked per run). */
  mayArriveFlipped: boolean
}

export const BAYS: BayConfig[] = [
  { id: 'bay1', gate: 'AND', color: '#22d3ee', labels: 'all', mayArriveFlipped: false },
  { id: 'bay2', gate: 'OR', color: '#f59e0b', labels: 'chip', mayArriveFlipped: true },
  { id: 'bay3', gate: 'NOT', color: '#e879f9', labels: 'none', mayArriveFlipped: true },
]

// ---------------------------------------------------------------------------
// MODULE C — CORRIDOR AIRLOCK CIRCUITS (3 progressive rounds, 3 sockets each)
// ---------------------------------------------------------------------------
export interface CircuitInput {
  id: string
  label: string
  value: 0 | 1
}

export interface CircuitSocket {
  id: string
  /** Wired sources (input ids or earlier socket ids). AND/OR read the first two, NOT reads the first. */
  srcs: string[]
}

export interface CircuitRound {
  id: string
  name: string
  briefing: string
  inputs: CircuitInput[]
  sockets: [CircuitSocket, CircuitSocket, CircuitSocket]
  /** Phase 1 target: this node must evaluate to 1 (forward airlock unlocks). */
  forwardOut: string
  /** Phase 2 target: this node must evaluate to 0 (rear blast door slams). */
  rearOut: string
}

export const CIRCUIT_ROUNDS: CircuitRound[] = [
  {
    id: 'R1',
    name: 'ROUND 1 // CORRIDOR D-7',
    briefing: 'Breach the forward airlock, then drop the rear blast door on the horde.',
    inputs: [
      { id: 'A', label: 'PWR', value: 1 },
      { id: 'B', label: 'KEY', value: 0 },
      { id: 'C', label: 'PRES', value: 1 },
    ],
    sockets: [
      { id: 'S1', srcs: ['A', 'B'] },
      { id: 'S2', srcs: ['S1', 'C'] },
      { id: 'S3', srcs: ['S2', 'B'] },
    ],
    forwardOut: 'S3',
    rearOut: 'S2',
  },
  {
    id: 'R2',
    name: 'ROUND 2 // DECON BAY',
    briefing: 'Two sensor pairs feed one interlock. Mind which wire the inverter actually reads.',
    inputs: [
      { id: 'A', label: 'SEAL', value: 0 },
      { id: 'B', label: 'FLOW', value: 1 },
      { id: 'C', label: 'UV', value: 1 },
      { id: 'D', label: 'LOCK', value: 0 },
    ],
    sockets: [
      { id: 'S1', srcs: ['A', 'B'] },
      { id: 'S2', srcs: ['C', 'D'] },
      { id: 'S3', srcs: ['S1', 'S2'] },
    ],
    forwardOut: 'S3',
    rearOut: 'S1',
  },
  {
    id: 'R3',
    name: 'ROUND 3 // LEVEL-4 BULKHEAD',
    briefing: 'Shared feeders, two doors. One bad swap and the breach spreads.',
    inputs: [
      { id: 'A', label: 'GEN', value: 1 },
      { id: 'B', label: 'BATT', value: 0 },
      { id: 'C', label: 'COOL', value: 0 },
      { id: 'D', label: 'AUTH', value: 1 },
    ],
    sockets: [
      { id: 'S1', srcs: ['A', 'B'] },
      { id: 'S2', srcs: ['S1', 'C'] },
      { id: 'S3', srcs: ['S2', 'D'] },
    ],
    forwardOut: 'S3',
    rearOut: 'S2',
  },
]

// ---------------------------------------------------------------------------
// MODULE D — FINAL ESCAPE · SELF-DESTRUCT (bonus, 3 broken boards)
// ---------------------------------------------------------------------------
export type InputFault = 'ok' | 's0' | 's1' | 'fl' // working | stuck at 0 | stuck at 1 | floating (reads 0)
export type LedFault = 'ok' | 'dead' | 'rev' // working | dead | fitted the wrong way round (never lights)
export type EscapeGate = 'AND' | 'OR' | 'NOT'

export interface EscapeState {
  inA: InputFault
  inB: InputFault
  gate: EscapeGate
  /** A NOT stage fitted after the gate. */
  not: boolean
  led: LedFault
}

export interface EscapeVariant {
  id: string
  /** What the lock needs: the gate, optionally followed by a NOT (OR-then-NOT reads 1,0,0,0). */
  target: { gate: 'AND' | 'OR'; not: boolean }
  /** The board as the player finds it. Everything that differs from the target is a fault. */
  start: EscapeState
}

/**
 * Three boards, at least two authored variants each (picked by seed so a repeat attempt is not memorised).
 *  Board 1: one fault.   Board 2: two faults whose symptoms look like one.   Board 3: a missing NOT plus a stuck input.
 * Every variant is proved fair by escape.js `verifyVariant` (unique minimal repair, solvable by logic inside the budgets).
 */
export const ESCAPE_BOARDS: EscapeVariant[][] = [
  [
    { id: '1A', target: { gate: 'OR', not: false }, start: { inA: 'ok', inB: 'ok', gate: 'AND', not: false, led: 'ok' } },
    { id: '1B', target: { gate: 'AND', not: false }, start: { inA: 'ok', inB: 'ok', gate: 'OR', not: false, led: 'ok' } },
    { id: '1C', target: { gate: 'AND', not: false }, start: { inA: 'ok', inB: 'ok', gate: 'AND', not: true, led: 'ok' } },
  ],
  [
    { id: '2A', target: { gate: 'AND', not: false }, start: { inA: 'ok', inB: 's0', gate: 'AND', not: false, led: 'dead' } },
    { id: '2B', target: { gate: 'AND', not: false }, start: { inA: 's1', inB: 'ok', gate: 'OR', not: false, led: 'ok' } },
    { id: '2C', target: { gate: 'OR', not: false }, start: { inA: 'ok', inB: 'fl', gate: 'OR', not: false, led: 'rev' } },
  ],
  [
    { id: '3A', target: { gate: 'OR', not: true }, start: { inA: 's1', inB: 'ok', gate: 'OR', not: false, led: 'ok' } },
    { id: '3B', target: { gate: 'OR', not: true }, start: { inA: 'ok', inB: 's0', gate: 'OR', not: false, led: 'ok' } },
    { id: '3C', target: { gate: 'OR', not: true }, start: { inA: 'fl', inB: 'ok', gate: 'OR', not: false, led: 'ok' } },
  ],
]

// ---------------------------------------------------------------------------
// FLAVOUR TELEMETRY (ambient readouts shown in headers / footers)
// ---------------------------------------------------------------------------
export const TELEMETRY_BASELINE = {
  containmentSeal: 'LEVEL-4',
  pathogenLoad: 88.4, // percent at T-0, drops as modules clear
  facility: 'AREA 51 // SUBLEVEL D-7',
}
