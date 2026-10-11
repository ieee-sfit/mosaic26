/**
 * STATION 4 // AREA 51 MELTDOWN — ISOLATED CONTENT FILE
 * ---------------------------------------------------------------------------
 * Everything the event staff may want to swap lives here: the question bank,
 * the cheat-sheet column index, the 8-column biohazard matrix, the lookup
 * problems and the airlock circuit rounds. Components under ./meltdown only
 * read from this module and contain no content of their own.
 *
 * Authoring rules
 *  - Module B answers are NOT stored: they are derived by looking the row /
 *    column up in BIOHAZARD_MATRIX, so the table and the answers can't drift.
 *  - Module C sockets reference sources by id. A source is either an input id
 *    or the id of an EARLIER socket (so circuits are always acyclic).
 *  - Every circuit round must be solvable in both phases; run
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
    moduleB: 40, // 8 verified steps x 5
    moduleC: 45, // 3 rounds x (8 breach + 7 seal)
    speedBonusMax: 20, // scaled by time_left when every module is cleared
  },
  moduleA: {
    questionsPerRun: 3,
    wrongAnswerPenaltyFraction: 0.2, // of the question's points, per wrong try
    hint1PenaltyFraction: 0.4, // "-40% pts"
    hint2PenaltyFraction: 1.0, // "-100% pts" (auto-select)
  },
  moduleB: {
    pointsPerStep: 5,
    wrongStepPenalty: 1, // pts lost per wrong submission on a step (floor 0)
  },
  moduleC: {
    seals: 3,
    phaseSeconds: 90, // timing out a phase breaks one seal and re-arms the clock
    breachPoints: 8,
    sealPoints: 7,
  },
}

// ---------------------------------------------------------------------------
// PHYSICAL CHEAT SHEET INDEX (what Hint 1 points to)
// ---------------------------------------------------------------------------
export const CHEAT_SHEET_COLUMNS: Record<string, { label: string; blurb: string }> = {
  'COL-1': { label: 'COLUMN 1 // NOT (INVERTER)', blurb: 'Output is the opposite of the input.' },
  'COL-2': { label: 'COLUMN 2 // AND', blurb: 'Output is 1 only when EVERY input is 1.' },
  'COL-3': { label: 'COLUMN 3 // OR', blurb: 'Output is 1 when AT LEAST ONE input is 1.' },
  'COL-4': { label: 'COLUMN 4 // TRUTH TABLE QUICK-REF', blurb: 'Read the row that matches your input pair.' },
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
  cheatColumn: keyof typeof CHEAT_SHEET_COLUMNS
}

export const QUESTION_BANK: ProtocolQuestion[] = [
  { id: 'q01', gate: 'AND', cheatColumn: 'COL-2',
    prompt: 'Containment door sensors read A = 1 and B = 0. What does Y = A AND B output?',
    options: ['Y = 1', 'Y = 0', 'Y = floating', 'Y = A + B'], correct: 1 },
  { id: 'q02', gate: 'AND', cheatColumn: 'COL-2',
    prompt: 'A two-input AND gate drives the vent seal. For which input pair does it output 1?',
    options: ['0 , 0', '0 , 1', '1 , 0', '1 , 1'], correct: 3 },
  { id: 'q03', gate: 'AND', cheatColumn: 'COL-2',
    prompt: 'Three-input AND gate: inputs are 1, 1, 0. What is the output?',
    options: ['1', '0', 'Undefined', '2'], correct: 1 },
  { id: 'q04', gate: 'AND', cheatColumn: 'COL-4',
    prompt: 'How many of the 4 rows in a 2-input AND truth table output 1?',
    options: ['0', '1', '2', '4'], correct: 1 },
  { id: 'q05', gate: 'OR', cheatColumn: 'COL-3',
    prompt: 'Alarm line: Y = A OR B with A = 0 and B = 1. What is Y?',
    options: ['0', '1', 'Floating', 'Inverted A'], correct: 1 },
  { id: 'q06', gate: 'OR', cheatColumn: 'COL-3',
    prompt: 'For which input pair does a 2-input OR gate output 0?',
    options: ['0 , 0', '0 , 1', '1 , 0', '1 , 1'], correct: 0 },
  { id: 'q07', gate: 'OR', cheatColumn: 'COL-4',
    prompt: 'How many of the 4 rows in a 2-input OR truth table output 1?',
    options: ['1', '2', '3', '4'], correct: 2 },
  { id: 'q08', gate: 'OR', cheatColumn: 'COL-3',
    prompt: 'A three-input OR gate sees 0, 0, 1. The output is:',
    options: ['0', '1', 'Undefined', 'Same as the first input'], correct: 1 },
  { id: 'q09', gate: 'NOT', cheatColumn: 'COL-1',
    prompt: 'The quarantine flag A is 1. What does Y = NOT A output?',
    options: ['1', '0', 'Floating', '2'], correct: 1 },
  { id: 'q10', gate: 'NOT', cheatColumn: 'COL-1',
    prompt: 'Two NOT gates are chained: A -> NOT -> NOT -> Y. If A = 0, Y equals:',
    options: ['0', '1', 'Floating', 'Cannot be determined'], correct: 0 },
  { id: 'q11', gate: 'NOT', cheatColumn: 'COL-1',
    prompt: 'A NOT gate has how many inputs?',
    options: ['1', '2', '3', 'Any number'], correct: 0 },
  { id: 'q12', gate: 'MIXED', cheatColumn: 'COL-2',
    prompt: 'Y = NOT (A AND B) with A = 1, B = 1. What is Y?',
    options: ['1', '0', 'Floating', 'Same as A'], correct: 1 },
  { id: 'q13', gate: 'MIXED', cheatColumn: 'COL-3',
    prompt: 'Y = NOT (A OR B) with A = 0, B = 0. What is Y?',
    options: ['0', '1', 'Floating', 'Same as B'], correct: 1 },
  { id: 'q14', gate: 'MIXED', cheatColumn: 'COL-4',
    prompt: 'Y = A AND (NOT B) with A = 1, B = 0. What is Y?',
    options: ['0', '1', 'Floating', 'Same as B'], correct: 1 },
  { id: 'q15', gate: 'MIXED', cheatColumn: 'COL-4',
    prompt: 'Which single input pair makes (A OR B) AND (NOT A) output 1?',
    options: ['A=0, B=1', 'A=1, B=0', 'A=1, B=1', 'A=0, B=0'], correct: 0 },
]

// ---------------------------------------------------------------------------
// MODULE B — 8-COLUMN BIOHAZARD MATRIX + TWO 4-STEP LOOKUP PROBLEMS
// ---------------------------------------------------------------------------
export const BIOHAZARD_MATRIX = {
  columns: ['ROW', 'STRAIN', 'VISC', 'TEMP', 'RPM_CLASS', 'CLAMP', 'PRESS', 'NEXT'],
  rows: [
    ['R-01', 'WZ-ALPHA', '140', '36', 'RC-2', 'CL-A1', '4.2', 'R-05'],
    ['R-02', 'WZ-BRAVO', '210', '41', 'RC-4', 'CL-B2', '5.8', 'R-08'],
    ['R-03', 'NEC-17', '95', '33', 'RC-1', 'CL-C3', '3.1', 'R-06'],
    ['R-04', 'NEC-22', '180', '38', 'RC-3', 'CL-D4', '4.9', 'R-07'],
    ['R-05', 'HYD-09', '260', '44', 'RC-5', 'CL-E5', '6.4', 'R-02'],
    ['R-06', 'HYD-12', '120', '35', 'RC-2', 'CL-F6', '3.7', 'R-09'],
    ['R-07', 'GAM-31', '300', '47', 'RC-6', 'CL-G7', '7.2', 'R-03'],
    ['R-08', 'GAM-44', '75', '31', 'RC-1', 'CL-H8', '2.6', 'R-10'],
    ['R-09', 'OMG-02', '225', '42', 'RC-4', 'CL-J9', '5.5', 'R-01'],
    ['R-10', 'OMG-08', '160', '37', 'RC-3', 'CL-K0', '4.4', 'R-04'],
  ],
}

/** A step reads `column` of a row. The row is a literal id or the answer of an earlier step. */
export type RowRef = string | { fromStep: number }

export interface LookupStep {
  row: RowRef
  column: string
}

export interface LookupProblem {
  id: string
  title: string
  briefing: string
  steps: [LookupStep, LookupStep, LookupStep, LookupStep]
}

export const LOOKUP_PROBLEMS: [LookupProblem, LookupProblem] = [
  {
    id: 'P1',
    title: 'PROBLEM 1 // ROTOR SPIN-UP SEQUENCE',
    briefing: 'Chain the NEXT pointers through the matrix to find the clamp that holds vial bank ALPHA.',
    steps: [
      { row: 'R-04', column: 'NEXT' },
      { row: { fromStep: 1 }, column: 'NEXT' },
      { row: { fromStep: 2 }, column: 'RPM_CLASS' },
      { row: { fromStep: 2 }, column: 'CLAMP' },
    ],
  },
  {
    id: 'P2',
    title: 'PROBLEM 2 // PRESSURE EQUALISATION',
    briefing: 'Bleed pressure from the secondary rotor ring. Mixed literal and chained row references.',
    steps: [
      { row: 'R-09', column: 'NEXT' },
      { row: { fromStep: 1 }, column: 'PRESS' },
      { row: 'R-06', column: 'VISC' },
      { row: { fromStep: 1 }, column: 'NEXT' },
    ],
  },
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
// FLAVOUR TELEMETRY (ambient readouts shown in headers / footers)
// ---------------------------------------------------------------------------
export const TELEMETRY_BASELINE = {
  containmentSeal: 'LEVEL-4',
  pathogenLoad: 88.4, // percent at T-0, drops as modules clear
  facility: 'AREA 51 // SUBLEVEL D-7',
}
