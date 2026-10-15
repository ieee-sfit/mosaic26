/**
 * STATION 4 // AREA 51 MELTDOWN — ISOLATED CONTENT FILE
 * ---------------------------------------------------------------------------
 * Everything the event staff may want to swap lives here: the question bank,
 * the breadboard bays, the door-logic circuit rounds and the Module D Code Breaker charges.
 * Components under ./meltdown only read from this module and contain no content of their own.
 *
 * Authoring rules
 *  - Module B target tables are NOT stored: they are derived from the bay's gate (see breadboard.js).
 *  - Module D charges are relay circuits: `rungs` in a row (AND), each rung a list of side-by-side contacts (OR), a contact
 *    is a signed bit number (+k conducts when Bk = 1, -k is a NOT contact). escape.js `verifyCharge` proves each variant is
 *    fair: exactly one code, every rung and contact needed, no rung enough alone, solvable by unit logic (run it after editing).
 *  - Module C sockets reference sources by id. A source is either an input id
 *    or the id of an EARLIER socket (so circuits are always acyclic).
 *  - Every circuit round must be solvable in phase 1 (front door = 1); phase 2 (rear door = 0) is always solvable by flipping an input or swapping a gate.
 */

export type GateType = 'AND' | 'OR' | 'NOT'

// ---------------------------------------------------------------------------
// GLOBAL CONFIG
// ---------------------------------------------------------------------------
export const STATION4_CONFIG = {
  gameId: 'station4',
  title: 'AREA 51 MELTDOWN',
  totalSeconds: 12 * 60,
  operatorIdPattern: /^\d{4}$/,
  scoring: {
    moduleA: 15, // 3 questions x 5
    moduleB: 40, // 3 breadboard bays: 13 + 13 + 14
    moduleC: 45, // 3 rounds x (8 breach + 7 seal)
    moduleD: 20, // optional bonus: CODE BREAKER, 3 charges worth 5 + 7 + 8. Not part of the base or the letter grade
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
    strikePenaltyFraction: 0.2, // per failed VERIFY, short or smoke event, of that bay's points (floor 0, the bay is never lost)
    hint1PenaltyFraction: 0.4,
  },
  moduleD: {
    offerSeconds: 20, // auto-skip of the PLAY / SKIP offer, so an abandoned kiosk still saves its run
    minSecondsToOffer: 90, // the bonus is only offered with at least this much shift time left
    codePoints: [5, 7, 8], // charge 1 (3 bits), charge 2 (4 bits), charge 3 (5 bits)
    wrongPenaltyFraction: 0.2, // per wrong ARM, of that charge's points
    hint1PenaltyFraction: 0.4,
  },
  moduleC: {
    breachPoints: 8,
    sealPoints: 7,
    wrongPenaltyFraction: 0.2, // per wrong try, of that phase's points (floor 0, the phase is never lost)
    hint1PenaltyFraction: 0.4,
  },
}

// ---------------------------------------------------------------------------
// MODULE A — 30 QUESTION BANK (3 drawn at random per run)
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
  { id: 'q16', gate: 'AND',
    prompt: 'Y = A AND B with A = 1 and B = 1. What is Y?',
    options: ['0', '1', 'Floating', '2'], correct: 1 },
  { id: 'q17', gate: 'AND',
    prompt: 'How many input combinations of a 3-input AND gate output 1?',
    options: ['Exactly one (all inputs 1)', 'Two', 'Four', 'Seven'], correct: 0 },
  { id: 'q18', gate: 'AND',
    prompt: 'A door seal needs power AND key. Power = 1, key = 0. Does the seal engage?',
    options: ['Yes: the output is 1', 'Yes: power alone is enough', 'Unknown: the output floats', 'No: the AND output is 0'], correct: 3 },
  { id: 'q19', gate: 'AND',
    prompt: 'Four sensors feed an AND gate. Three read 1 and one fails to 0. The output is:',
    options: ['1', 'Floating', '0', 'Undefined'], correct: 2 },
  { id: 'q20', gate: 'OR',
    prompt: 'A 2-input OR gate has A = 1 and B = 1. What is the output?',
    options: ['0', '1', 'Floating', '2'], correct: 1 },
  { id: 'q21', gate: 'OR',
    prompt: 'Alarm = door OR window. Door = 0 and window = 0. Is the alarm on?',
    options: ['No: the output is 0', 'Yes: the output is 1', 'Only at night', 'Unknown'], correct: 0 },
  { id: 'q22', gate: 'OR',
    prompt: 'How many rows of a 3-input OR truth table output 0?',
    options: ['Two', 'Four', 'Seven', 'Exactly one (all inputs 0)'], correct: 3 },
  { id: 'q23', gate: 'OR',
    prompt: 'Which statement is true for every OR gate?',
    options: ['If any input is 0, the output is 0', 'The output always equals the first input', 'If any input is 1, the output is 1', 'The output is always the inverse of the last input'], correct: 2 },
  { id: 'q24', gate: 'NOT',
    prompt: 'Three NOT gates are chained: A -> NOT -> NOT -> NOT -> Y with A = 1. What is Y?',
    options: ['1', '0', 'Floating', 'Cannot be determined'], correct: 1 },
  { id: 'q25', gate: 'NOT',
    prompt: 'What is the output of NOT 0?',
    options: ['1', '0', 'Floating', '2'], correct: 0 },
  { id: 'q26', gate: 'NOT',
    prompt: 'Another common name for a NOT gate is a(n):',
    options: ['Buffer', 'Latch', 'Amplifier', 'Inverter'], correct: 3 },
  { id: 'q27', gate: 'MIXED',
    prompt: 'Y = (A AND B) OR C with A = 0, B = 1, C = 1. What is Y?',
    options: ['0', 'Floating', '1', 'Same as A'], correct: 2 },
  { id: 'q28', gate: 'MIXED',
    prompt: 'Y = NOT (A AND B) with A = 0 and B = 1. What is Y?',
    options: ['0', '1', 'Floating', 'Same as B'], correct: 1 },
  { id: 'q29', gate: 'MIXED',
    prompt: 'Y = A AND (NOT A). What is Y for any A?',
    options: ['Always 0', 'Always 1', 'Same as A', 'Floating'], correct: 0 },
  { id: 'q30', gate: 'MIXED',
    prompt: 'Y = A OR (NOT A). What is Y for any A?',
    options: ['Always 0', 'Same as A', 'Floating', 'Always 1'], correct: 3 },
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
}

/** Every bay shows the same pin labels (VCC, GND, A, B, OUT) on its chip and sockets; chips always arrive upright. */
export const BAYS: BayConfig[] = [
  { id: 'bay1', gate: 'AND', color: '#22c55e' },
  { id: 'bay2', gate: 'OR', color: '#2dd4bf' },
  { id: 'bay3', gate: 'NOT', color: '#86efac' },
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

/**
 * Module C bank: 15 rounds for each of the three round slots (`logic.js` `pickRounds` draws one per slot from the seed).
 * Slot 1 = a chain of three gates over three inputs, slot 2 = two sensor pairs meeting at one interlock, slot 3 = one long chain over
 * four inputs. The first round of each slot is authored; the other 14 were generated and checked with the same solver the hints use:
 * the front door is solvable, 8-18 of the 27 gate settings open it and 8-18 close the rear door (at the starting inputs), no single
 * gate type used everywhere finishes both phases, the cheapest front-door solution does not already close the rear door, and after
 * ANY front-door solution the rear door can be closed with one input flip or one gate swap.
 */
export const CIRCUIT_ROUND_BANK: CircuitRound[][] = [
  [
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
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR B-2',
      briefing: 'Open the front hatch, then seal the rear before they swarm in.',
      inputs: [
        { id: 'A', label: 'ALARM', value: 1 },
        { id: 'B', label: 'LOCK', value: 0 },
        { id: 'C', label: 'PWR', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['B', 'S1'] },
        { id: 'S3', srcs: ['S2', 'C'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR C-9',
      briefing: 'Force the forward door, then slam the rear blast door shut.',
      inputs: [
        { id: 'A', label: 'KEY', value: 1 },
        { id: 'B', label: 'COOL', value: 0 },
        { id: 'C', label: 'PWR', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'C'] },
        { id: 'S2', srcs: ['S1', 'A'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // SERVICE TUNNEL 3',
      briefing: 'Get through the front, then lock the rear door behind you.',
      inputs: [
        { id: 'A', label: 'VENT', value: 0 },
        { id: 'B', label: 'ALARM', value: 1 },
        { id: 'C', label: 'FAN', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'A'] },
        { id: 'S2', srcs: ['C', 'S1'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // LOADING DOCK',
      briefing: 'Breach the forward airlock, then drop the rear blast door on the horde.',
      inputs: [
        { id: 'A', label: 'SCAN', value: 0 },
        { id: 'B', label: 'PRES', value: 0 },
        { id: 'C', label: 'KEY', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'A'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // SUPPLY SPUR',
      briefing: 'Open the front hatch, then seal the rear before they swarm in.',
      inputs: [
        { id: 'A', label: 'UV', value: 1 },
        { id: 'B', label: 'SEAL', value: 0 },
        { id: 'C', label: 'PWR', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'A'] },
        { id: 'S2', srcs: ['C', 'S1'] },
        { id: 'S3', srcs: ['S2', 'C'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR A-4',
      briefing: 'Force the forward door, then slam the rear blast door shut.',
      inputs: [
        { id: 'A', label: 'GEN', value: 0 },
        { id: 'B', label: 'PUMP', value: 1 },
        { id: 'C', label: 'AUTH', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'B'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR E-1',
      briefing: 'Get through the front, then lock the rear door behind you.',
      inputs: [
        { id: 'A', label: 'LATCH', value: 1 },
        { id: 'B', label: 'KEY', value: 0 },
        { id: 'C', label: 'LOCK', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['C', 'S1'] },
        { id: 'S3', srcs: ['S2', 'B'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // MAINTENANCE LOOP',
      briefing: 'Breach the forward airlock, then drop the rear blast door on the horde.',
      inputs: [
        { id: 'A', label: 'CODE', value: 0 },
        { id: 'B', label: 'VENT', value: 1 },
        { id: 'C', label: 'GEN', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['S1', 'C'] },
        { id: 'S3', srcs: ['C', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // VENT TRANSIT',
      briefing: 'Open the front hatch, then seal the rear before they swarm in.',
      inputs: [
        { id: 'A', label: 'FLOW', value: 1 },
        { id: 'B', label: 'TEMP', value: 1 },
        { id: 'C', label: 'COMMS', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR F-6',
      briefing: 'Force the forward door, then slam the rear blast door shut.',
      inputs: [
        { id: 'A', label: 'SCAN', value: 1 },
        { id: 'B', label: 'COMMS', value: 0 },
        { id: 'C', label: 'HEAT', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'A'] },
        { id: 'S2', srcs: ['B', 'S1'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // AIRLOCK ANNEX',
      briefing: 'Get through the front, then lock the rear door behind you.',
      inputs: [
        { id: 'A', label: 'TEMP', value: 0 },
        { id: 'B', label: 'FAN', value: 1 },
        { id: 'C', label: 'PUMP', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CABLE RUN 12',
      briefing: 'Breach the forward airlock, then drop the rear blast door on the horde.',
      inputs: [
        { id: 'A', label: 'FAN', value: 1 },
        { id: 'B', label: 'TEMP', value: 0 },
        { id: 'C', label: 'UV', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['B', 'S1'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // CORRIDOR G-8',
      briefing: 'Open the front hatch, then seal the rear before they swarm in.',
      inputs: [
        { id: 'A', label: 'RELAY', value: 1 },
        { id: 'B', label: 'PUMP', value: 0 },
        { id: 'C', label: 'DOOR', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['S2', 'B'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R1',
      name: 'ROUND 1 // STAIR CORE N',
      briefing: 'Force the forward door, then slam the rear blast door shut.',
      inputs: [
        { id: 'A', label: 'DOOR', value: 0 },
        { id: 'B', label: 'ALARM', value: 1 },
        { id: 'C', label: 'COMMS', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'B'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['C', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
  ],
  [
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
      id: 'R2',
      name: 'ROUND 2 // SAMPLE VAULT',
      briefing: 'Two separate checks meet at one lock. Watch which input a NOT gate listens to.',
      inputs: [
        { id: 'A', label: 'COMMS', value: 1 },
        { id: 'B', label: 'VENT', value: 0 },
        { id: 'C', label: 'TEMP', value: 1 },
        { id: 'D', label: 'PRES', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'B'] },
        { id: 'S2', srcs: ['A', 'C'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // UV CHAMBER',
      briefing: 'Pairs of sensors feed a single interlock. The inverter only reads its first wire.',
      inputs: [
        { id: 'A', label: 'LATCH', value: 0 },
        { id: 'B', label: 'CELL', value: 0 },
        { id: 'C', label: 'KEY', value: 1 },
        { id: 'D', label: 'TEMP', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'C'] },
        { id: 'S2', srcs: ['B', 'A'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // FILTER ROOM',
      briefing: 'Two sensor pairs feed one interlock. Mind which wire the inverter actually reads.',
      inputs: [
        { id: 'A', label: 'FLOW', value: 1 },
        { id: 'B', label: 'VENT', value: 1 },
        { id: 'C', label: 'SEAL', value: 0 },
        { id: 'D', label: 'COMMS', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['C', 'D'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // CRYO ANTECHAMBER',
      briefing: 'Two separate checks meet at one lock. Watch which input a NOT gate listens to.',
      inputs: [
        { id: 'A', label: 'FAN', value: 0 },
        { id: 'B', label: 'PUMP', value: 0 },
        { id: 'C', label: 'VALVE', value: 1 },
        { id: 'D', label: 'RELAY', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'D'] },
        { id: 'S2', srcs: ['C', 'B'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // LAB WING 2',
      briefing: 'Pairs of sensors feed a single interlock. The inverter only reads its first wire.',
      inputs: [
        { id: 'A', label: 'LATCH', value: 0 },
        { id: 'B', label: 'HEAT', value: 0 },
        { id: 'C', label: 'CELL', value: 1 },
        { id: 'D', label: 'CODE', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'B'] },
        { id: 'S2', srcs: ['A', 'C'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // AUTOCLAVE HALL',
      briefing: 'Two sensor pairs feed one interlock. Mind which wire the inverter actually reads.',
      inputs: [
        { id: 'A', label: 'VENT', value: 0 },
        { id: 'B', label: 'COMMS', value: 1 },
        { id: 'C', label: 'AUTH', value: 0 },
        { id: 'D', label: 'LOCK', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'C'] },
        { id: 'S2', srcs: ['A', 'B'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // BIOHAZARD LOCK',
      briefing: 'Two separate checks meet at one lock. Watch which input a NOT gate listens to.',
      inputs: [
        { id: 'A', label: 'FLOW', value: 0 },
        { id: 'B', label: 'CODE', value: 0 },
        { id: 'C', label: 'SEAL', value: 0 },
        { id: 'D', label: 'LOCK', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'D'] },
        { id: 'S2', srcs: ['B', 'A'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // STERILE CORRIDOR',
      briefing: 'Pairs of sensors feed a single interlock. The inverter only reads its first wire.',
      inputs: [
        { id: 'A', label: 'SCAN', value: 0 },
        { id: 'B', label: 'DOOR', value: 1 },
        { id: 'C', label: 'LOCK', value: 0 },
        { id: 'D', label: 'TEMP', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'A'] },
        { id: 'S2', srcs: ['C', 'B'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // SPECIMEN DOCK',
      briefing: 'Two sensor pairs feed one interlock. Mind which wire the inverter actually reads.',
      inputs: [
        { id: 'A', label: 'SCAN', value: 1 },
        { id: 'B', label: 'DOOR', value: 0 },
        { id: 'C', label: 'HEAT', value: 0 },
        { id: 'D', label: 'SEAL', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'D'] },
        { id: 'S2', srcs: ['A', 'B'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // WASH TUNNEL',
      briefing: 'Two separate checks meet at one lock. Watch which input a NOT gate listens to.',
      inputs: [
        { id: 'A', label: 'PWR', value: 0 },
        { id: 'B', label: 'BADGE', value: 1 },
        { id: 'C', label: 'TEMP', value: 1 },
        { id: 'D', label: 'PRES', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['B', 'D'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // QUARANTINE PEN',
      briefing: 'Pairs of sensors feed a single interlock. The inverter only reads its first wire.',
      inputs: [
        { id: 'A', label: 'TEMP', value: 1 },
        { id: 'B', label: 'HEAT', value: 1 },
        { id: 'C', label: 'SEAL', value: 0 },
        { id: 'D', label: 'SCAN', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['C', 'D'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // CLEAN ROOM 4',
      briefing: 'Two sensor pairs feed one interlock. Mind which wire the inverter actually reads.',
      inputs: [
        { id: 'A', label: 'DOOR', value: 1 },
        { id: 'B', label: 'COMMS', value: 0 },
        { id: 'C', label: 'CODE', value: 1 },
        { id: 'D', label: 'PRES', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'A'] },
        { id: 'S2', srcs: ['B', 'C'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S1',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // TRIAGE BAY',
      briefing: 'Two separate checks meet at one lock. Watch which input a NOT gate listens to.',
      inputs: [
        { id: 'A', label: 'GEN', value: 0 },
        { id: 'B', label: 'RELAY', value: 1 },
        { id: 'C', label: 'TEMP', value: 1 },
        { id: 'D', label: 'COMMS', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['D', 'C'] },
        { id: 'S3', srcs: ['S1', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R2',
      name: 'ROUND 2 // PATHOGEN CELL',
      briefing: 'Pairs of sensors feed a single interlock. The inverter only reads its first wire.',
      inputs: [
        { id: 'A', label: 'SCAN', value: 1 },
        { id: 'B', label: 'SEAL', value: 0 },
        { id: 'C', label: 'UV', value: 0 },
        { id: 'D', label: 'COOL', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'D'] },
        { id: 'S2', srcs: ['C', 'A'] },
        { id: 'S3', srcs: ['S2', 'S1'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
  ],
  [
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
    {
      id: 'R3',
      name: 'ROUND 3 // LEVEL-3 BULKHEAD',
      briefing: 'One chain of gates, two doors. A wrong gate here lets the breach through.',
      inputs: [
        { id: 'A', label: 'SEAL', value: 1 },
        { id: 'B', label: 'LOCK', value: 1 },
        { id: 'C', label: 'PWR', value: 1 },
        { id: 'D', label: 'TEMP', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'C'] },
        { id: 'S2', srcs: ['D', 'S1'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // REACTOR GATE',
      briefing: 'The same feeders drive both doors. Change one gate and both doors react.',
      inputs: [
        { id: 'A', label: 'TEMP', value: 1 },
        { id: 'B', label: 'BADGE', value: 1 },
        { id: 'C', label: 'KEY', value: 0 },
        { id: 'D', label: 'SCAN', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'B'] },
        { id: 'S2', srcs: ['C', 'S1'] },
        { id: 'S3', srcs: ['D', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // POWER SPINE',
      briefing: 'Shared feeders, two doors. One bad swap and the breach spreads.',
      inputs: [
        { id: 'A', label: 'COOL', value: 1 },
        { id: 'B', label: 'KEY', value: 1 },
        { id: 'C', label: 'PRES', value: 1 },
        { id: 'D', label: 'COMMS', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'D'] },
        { id: 'S2', srcs: ['S1', 'A'] },
        { id: 'S3', srcs: ['S2', 'C'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // COMMAND DECK DOOR',
      briefing: 'One chain of gates, two doors. A wrong gate here lets the breach through.',
      inputs: [
        { id: 'A', label: 'PWR', value: 1 },
        { id: 'B', label: 'TEMP', value: 0 },
        { id: 'C', label: 'AUTH', value: 0 },
        { id: 'D', label: 'UV', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'C'] },
        { id: 'S2', srcs: ['S1', 'D'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // HANGAR LOCK',
      briefing: 'The same feeders drive both doors. Change one gate and both doors react.',
      inputs: [
        { id: 'A', label: 'GEN', value: 1 },
        { id: 'B', label: 'FLOW', value: 1 },
        { id: 'C', label: 'FAN', value: 0 },
        { id: 'D', label: 'RELAY', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'C'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['D', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // ARMORY SEAL',
      briefing: 'Shared feeders, two doors. One bad swap and the breach spreads.',
      inputs: [
        { id: 'A', label: 'ALARM', value: 1 },
        { id: 'B', label: 'PWR', value: 0 },
        { id: 'C', label: 'PRES', value: 1 },
        { id: 'D', label: 'UV', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'B'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['D', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // CONTROL ROOM 9',
      briefing: 'One chain of gates, two doors. A wrong gate here lets the breach through.',
      inputs: [
        { id: 'A', label: 'COMMS', value: 0 },
        { id: 'B', label: 'PRES', value: 1 },
        { id: 'C', label: 'KEY', value: 1 },
        { id: 'D', label: 'UV', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['D', 'C'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['S2', 'A'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // LEVEL-5 BULKHEAD',
      briefing: 'The same feeders drive both doors. Change one gate and both doors react.',
      inputs: [
        { id: 'A', label: 'CELL', value: 0 },
        { id: 'B', label: 'DOOR', value: 1 },
        { id: 'C', label: 'LOCK', value: 0 },
        { id: 'D', label: 'LATCH', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['A', 'D'] },
        { id: 'S2', srcs: ['S1', 'C'] },
        { id: 'S3', srcs: ['B', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // GENERATOR HALL',
      briefing: 'Shared feeders, two doors. One bad swap and the breach spreads.',
      inputs: [
        { id: 'A', label: 'SEAL', value: 0 },
        { id: 'B', label: 'KEY', value: 0 },
        { id: 'C', label: 'CELL', value: 1 },
        { id: 'D', label: 'BATT', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['B', 'C'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['S2', 'D'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // SECURITY HUB',
      briefing: 'One chain of gates, two doors. A wrong gate here lets the breach through.',
      inputs: [
        { id: 'A', label: 'AUTH', value: 0 },
        { id: 'B', label: 'HEAT', value: 1 },
        { id: 'C', label: 'KEY', value: 1 },
        { id: 'D', label: 'COMMS', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'B'] },
        { id: 'S2', srcs: ['A', 'S1'] },
        { id: 'S3', srcs: ['D', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // SUBLEVEL D GATE',
      briefing: 'The same feeders drive both doors. Change one gate and both doors react.',
      inputs: [
        { id: 'A', label: 'UV', value: 0 },
        { id: 'B', label: 'CODE', value: 0 },
        { id: 'C', label: 'BADGE', value: 0 },
        { id: 'D', label: 'PUMP', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'D'] },
        { id: 'S2', srcs: ['B', 'S1'] },
        { id: 'S3', srcs: ['A', 'S2'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // OBSERVATION DECK',
      briefing: 'Shared feeders, two doors. One bad swap and the breach spreads.',
      inputs: [
        { id: 'A', label: 'BADGE', value: 0 },
        { id: 'B', label: 'CODE', value: 1 },
        { id: 'C', label: 'VALVE', value: 1 },
        { id: 'D', label: 'DOOR', value: 0 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'A'] },
        { id: 'S2', srcs: ['D', 'S1'] },
        { id: 'S3', srcs: ['S2', 'B'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // DATA VAULT DOOR',
      briefing: 'One chain of gates, two doors. A wrong gate here lets the breach through.',
      inputs: [
        { id: 'A', label: 'BADGE', value: 1 },
        { id: 'B', label: 'CELL', value: 0 },
        { id: 'C', label: 'SCAN', value: 0 },
        { id: 'D', label: 'DOOR', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'A'] },
        { id: 'S2', srcs: ['B', 'S1'] },
        { id: 'S3', srcs: ['S2', 'D'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
    {
      id: 'R3',
      name: 'ROUND 3 // EXIT SHAFT',
      briefing: 'The same feeders drive both doors. Change one gate and both doors react.',
      inputs: [
        { id: 'A', label: 'FLOW', value: 0 },
        { id: 'B', label: 'COMMS', value: 0 },
        { id: 'C', label: 'RELAY', value: 1 },
        { id: 'D', label: 'SEAL', value: 1 },
      ],
      sockets: [
        { id: 'S1', srcs: ['C', 'D'] },
        { id: 'S2', srcs: ['S1', 'B'] },
        { id: 'S3', srcs: ['S2', 'A'] },
      ],
      forwardOut: 'S3',
      rearOut: 'S2',
    },
  ],
]

/** The three authored rounds (the first of each slot): the tutorial and fallback. */
export const CIRCUIT_ROUNDS: CircuitRound[] = CIRCUIT_ROUND_BANK.map((slot) => slot[0])

// ---------------------------------------------------------------------------
// MODULE D — CODE BREAKER (bonus, 3 demolition charges)
// ---------------------------------------------------------------------------
export interface Charge {
  id: string
  /** Where the charge is planted (flavour only). */
  site: string
  /** Number of bit switches B1..Bn. */
  bits: number
  /**
   * Relay circuit, battery to detonator. Rungs sit in a row (all must pass = AND); the contacts of one rung sit side by
   * side (any one passes = OR). A contact is a signed bit number: +k conducts when Bk = 1, -k (a NOT contact) when Bk = 0.
   */
  rungs: number[][]
}

/**
 * Three charges of 3, 4 and 5 bits (worth 5, 7 and 8), 15 variants each (the first three of each are authored, the rest were generated),
 * picked by seed so a repeat attempt is not memorised. Every variant is proved fair by escape.js `verifyCharge`: exactly one code, every rung and
 * contact needed, no rung enough alone, and unit logic alone settles every bit (no guessing).
 */
export const CHARGES: Charge[][] = [
  [
    { id: '1A', site: 'CORE STORAGE', bits: 3, rungs: [[1], [-1, 2], [-2, -3]] },
    { id: '1B', site: 'CORE STORAGE', bits: 3, rungs: [[2], [-1, -3], [-2, 3]] },
    { id: '1C', site: 'CORE STORAGE', bits: 3, rungs: [[-3], [1, 3], [-1, -2]] },
    { id: '1D', site: 'CORE STORAGE', bits: 3, rungs: [[1, -3], [-1, -2], [3]] },
    { id: '1E', site: 'CORE STORAGE', bits: 3, rungs: [[-3], [2, 3], [3, 1]] },
    { id: '1F', site: 'CORE STORAGE', bits: 3, rungs: [[-1, 3], [-3, -2], [2]] },
    { id: '1G', site: 'CORE STORAGE', bits: 3, rungs: [[2, 1], [-1], [1, 3]] },
    { id: '1H', site: 'CORE STORAGE', bits: 3, rungs: [[-2], [1, 2], [3, -1]] },
    { id: '1I', site: 'CORE STORAGE', bits: 3, rungs: [[-1], [1, 2], [-3, -2]] },
    { id: '1J', site: 'CORE STORAGE', bits: 3, rungs: [[3, 2], [-3], [-2, 1]] },
    { id: '1K', site: 'CORE STORAGE', bits: 3, rungs: [[-1, -2], [3], [-3, 2]] },
    { id: '1L', site: 'CORE STORAGE', bits: 3, rungs: [[1, 2], [1, -3], [-1]] },
    { id: '1M', site: 'CORE STORAGE', bits: 3, rungs: [[-3], [-1, 2], [3, 1]] },
    { id: '1N', site: 'CORE STORAGE', bits: 3, rungs: [[-3], [3, -2], [1, 3]] },
    { id: '1O', site: 'CORE STORAGE', bits: 3, rungs: [[2], [-2, -3], [-1, -2]] },
  ],
  [
    { id: '2A', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4], [1, -4], [-2], [2, 3]] },
    { id: '2B', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[-3], [1, 2], [-1, 4], [-4]] },
    { id: '2C', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[1], [-2], [-1, -4], [-3, 4]] },
    { id: '2D', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[-2, 4], [2, -3], [3], [-4, -1]] },
    { id: '2E', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[1], [4, 2], [-2], [3, -1]] },
    { id: '2F', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[2, -3], [4, -1], [1], [-2, -4]] },
    { id: '2G', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4, -1], [1], [-2], [-4, 3]] },
    { id: '2H', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4, -2], [-1], [-4, -3], [2, 1]] },
    { id: '2I', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[1, 3], [-2], [-4, 3], [-3]] },
    { id: '2J', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4, 3], [-4], [4, -1], [1, -2]] },
    { id: '2K', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4], [-1], [1, -2], [1, 3]] },
    { id: '2L', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[3], [-2, -1], [-3, 1], [-3, -4]] },
    { id: '2M', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[1, 4], [3], [2, -1], [-2]] },
    { id: '2N', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[4, 3], [1], [-1, -3], [-4, 2]] },
    { id: '2O', site: 'PATIENT ZERO LAB', bits: 4, rungs: [[2, 3], [4], [2, 1], [-2]] },
  ],
  [
    { id: '3A', site: 'REACTOR HALL', bits: 5, rungs: [[1], [3, 4], [-2, -4], [-1, 5], [-3]] },
    { id: '3B', site: 'REACTOR HALL', bits: 5, rungs: [[1], [3], [4, 5], [-2, 4], [-1, -4]] },
    { id: '3C', site: 'REACTOR HALL', bits: 5, rungs: [[5], [2, -5], [-3, -4], [-1], [1, 4]] },
    { id: '3D', site: 'REACTOR HALL', bits: 5, rungs: [[5], [-3, -5], [-4, -2], [4], [3, 1]] },
    { id: '3E', site: 'REACTOR HALL', bits: 5, rungs: [[3], [1, -4], [-2, -1], [2], [-5, -3]] },
    { id: '3F', site: 'REACTOR HALL', bits: 5, rungs: [[-2, -1], [-4, -5], [-3], [2, 3], [5]] },
    { id: '3G', site: 'REACTOR HALL', bits: 5, rungs: [[5, 1], [-5], [2], [5, -4], [5, -3]] },
    { id: '3H', site: 'REACTOR HALL', bits: 5, rungs: [[1, -2], [4, -5], [-3, -1], [3], [-4]] },
    { id: '3I', site: 'REACTOR HALL', bits: 5, rungs: [[1, 5], [-5, 4], [3], [-4], [4, -2]] },
    { id: '3J', site: 'REACTOR HALL', bits: 5, rungs: [[1], [-2], [-4, 2], [5, -1], [-3, 2]] },
    { id: '3K', site: 'REACTOR HALL', bits: 5, rungs: [[1], [-1, -3], [-2, -4], [5, 4], [2]] },
    { id: '3L', site: 'REACTOR HALL', bits: 5, rungs: [[-4], [3, 4], [2], [-5], [4, -1]] },
    { id: '3M', site: 'REACTOR HALL', bits: 5, rungs: [[-5, 3], [-1], [4], [-2, -4], [-3]] },
    { id: '3N', site: 'REACTOR HALL', bits: 5, rungs: [[-1], [-2], [-5, 4], [1, 5], [-5, 3]] },
    { id: '3O', site: 'REACTOR HALL', bits: 5, rungs: [[2, -3], [5, 3], [-2], [-4], [1]] },
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
