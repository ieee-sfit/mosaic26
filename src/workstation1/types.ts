/* Shared contracts for Station 1 · GOAT ANC.
   Content lives in mockStation1Data.ts and is typed against these shapes,
   so real data can be dropped in without touching any logic or components. */

/* ── Flow ─────────────────────────────────────────────────────────── */
export type Phase = 'launcher' | 'moduleA' | 'moduleB' | 'moduleC' | 'summary';
export type EndReason = 'COMPLETE' | 'TIME_EXPIRED' | 'HULL_BREACH';

/* ── Module A ─────────────────────────────────────────────────────── */
export type ShipZone =
  | 'BOW'
  | 'CORE'
  | 'PORT_WING'
  | 'STBD_WING'
  | 'PORT_ENGINE'
  | 'STBD_ENGINE';

export interface TelemetryReadout {
  label: string; // e.g. FLUX_TOL
  value: string; // e.g. ±0.06
}

export interface SensorAnomaly {
  zone: ShipZone;
  severity: 'caution' | 'critical';
  code: string; // e.g. ANOM-0417
  telemetry: TelemetryReadout[];
}

export interface McqQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  /** 1-based column on the physical cheat sheet that holds the answer (Hint 1). */
  cheatSheetColumn: number;
  anomaly: SensorAnomaly;
}

export interface CheatSheetColumnDef {
  index: number; // 1-based
  label: string;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  hintsUsed: 0 | 1 | 2;
  wrongAttempts: number;
  points: number;
  maxPoints: number;
}

/* ── Module B ─────────────────────────────────────────────────────── */
export interface SheetColumn {
  index: number; // 1-based, matches the printed column number
  key: string;
  label: string;
}

export interface TelemetrySheet {
  columns: SheetColumn[]; // length 8
  rows: string[][]; // each row has one cell per column
}

export interface LookupStepDef {
  /** 1-based column to search for the current key. */
  matchColumn: number;
  /** 1-based column to read the answer from. */
  readColumn: number;
}

export interface LookupProblemDef {
  id: string;
  title: string;
  designation: string; // e.g. PF-COIL-ALPHA
  brief: string;
  /** Value printed on the card; step 1 searches for it. */
  seed: string;
  steps: LookupStepDef[]; // length 4
}

export interface StepResult {
  problemId: string;
  stepIndex: number; // 0-based
  wrongAttempts: number;
  hintsUsed: 0 | 1 | 2;
  points: number;
  maxPoints: number;
}

/* ── Module C ─────────────────────────────────────────────────────── */
export interface WaveProfile {
  id: string;
  callsign: string; // cloaked scout designation
  /** The incoming noise wave the operator must cancel. */
  noise: { amplitude: number; frequency: number; phase: number };
  /** Starting control positions (slider fractions 0–1, dial degrees). */
  start: { amp: number; freq: number; phase: number };
  timeLimitSec: number;
  /** Scout position inside the windshield, percent. */
  ship: { x: number; y: number; scale: number };
}

export interface WaveCalibration {
  ampMin: number;
  ampMax: number;
  freqMin: number; // cycles per scope window
  freqMax: number;
  tolerance: number; // fraction of full range (0.06 = ±6%)
  baselineDb: number; // un-cancelled noise level
  floorDb: number; // ambient floor when perfectly cancelled
}

export interface RoundResult {
  profileId: string;
  destroyed: boolean;
  misses: number;
  hintsUsed: 0 | 1 | 2;
  points: number;
  maxPoints: number;
}

/* ── Scoring ──────────────────────────────────────────────────────── */
export interface ScoringConfig {
  totalSeconds: number;
  moduleA: {
    questionCount: number;
    pointsPerQuestion: number;
    hint1Penalty: number; // fraction removed (0.4 = −40%)
    wrongAttemptPenalty: number; // fraction of base removed per wrong pick
  };
  moduleB: {
    pointsPerStep: number;
    hint1Penalty: number; // Hint 2 always forfeits the step
    wrongAttemptPenalty: number;
  };
  moduleC: {
    pointsPerRound: number;
    hint1Penalty: number; // Hint 2 always forfeits the round
    missPenalty: number;
    hullPips: number;
  };
}

/* ── Result handed to the host app ────────────────────────────────── */
export interface Station1Result {
  operators: [string, string];
  endReason: EndReason;
  secondsRemaining: number;
  hullPips: number;
  moduleA: QuestionResult[];
  moduleB: StepResult[];
  moduleC: RoundResult[];
  scoreA: number;
  scoreB: number;
  scoreC: number;
  total: number;
  maxTotal: number;
}
