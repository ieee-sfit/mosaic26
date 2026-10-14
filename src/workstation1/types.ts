/* Shared contracts for Station 1 · GOAT ANC.
   Content lives in mockStation1Data.ts and is typed against these shapes,
   so real data can be dropped in without touching any logic or components. */

/* ── Flow ─────────────────────────────────────────────────────────── */
export type Phase = 'launcher' | 'moduleA' | 'moduleB' | 'mapC' | 'moduleC' | 'offer' | 'moduleD' | 'summary';
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
  anomaly: SensorAnomaly;
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
export interface StepResult {
  waveId: string; // 'B1' | 'B2'
  stepIndex: number; // 0-based, 0..2
  /** The control that was the dominant error in this step. */
  control: 'amp' | 'phase' | 'freq';
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
    waves: number;
    stepPoints: readonly number[]; // points of the three steps of one waveform
    hint1Penalty: number; // Hint 2 always forfeits the step
    wrongAttemptPenalty: number; // fraction of the step removed per wrong diagnosis
    tolerance: number; // fraction of a control's range that counts as fixed
  };
  moduleC: {
    pointsPerRound: number;
    hint1Penalty: number; // Hint 2 always forfeits the round
    missPenalty: number;
    hullPips: number;
  };
  moduleD: {
    maxPoints: number;
    maxSeconds: number;
    offerSeconds: number;
    hint1Penalty: number;
    successAt: number; // points needed for LINK RESTORED
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
  moduleD: HandshakeResult[];
  scoreA: number;
  scoreB: number;
  scoreC: number;
  /** Bonus Module D, 0..20. Not part of `total` (the base) or the letter grade. */
  scoreD: number;
  dPlayed: boolean;
  dEnding: 'success' | 'fail' | null;
  /** Seconds spent per module, for the debrief. */
  moduleSeconds: { A: number; B: number; C: number; D: number };
  total: number;
  maxTotal: number;
}

/* ── Module B · Diagnose the leftover ─────────────────────────────── */
export interface DiagWaveDef {
  id: string;
  label: string;
  /** The incoming noise (violet). */
  noise: { amplitude: number; frequency: number; phase: number };
  /** Where the player's anti-wave (coral) starts: ALL THREE conditions are wrong. */
  start: { amp: number; freq: number; phase: number };
  /** Authored fix order (dominant error first). The fairness script proves it equals the computed order. */
  order: ('amp' | 'phase' | 'freq')[];
  /** Waveform 1 is guided: peak ticks, guide lines and a legend. */
  guided: boolean;
}

/* ── Module D · Secret handshake ──────────────────────────────────── */
export type HopRule =
  | { kind: 'step'; d: number } // constant jump
  | { kind: 'alt'; d1: number; d2: number } // jumps alternate d1, d2
  | { kind: 'inter'; c: number; e: number } // two trails take turns, each moving by its own step
  | { kind: 'grow'; d0: number; g: number } // jump grows by g each hop
  | { kind: 'fib' }; // next = sum of the last two

export interface HandshakeVariant {
  id: string;
  rule: HopRule;
}

export interface HandshakeRoundDef {
  points: number;
  hopMs: number;
  scoredHops: number;
  variants: HandshakeVariant[];
}

export interface HandshakeResult {
  round: number; // 0-based
  variantId: string;
  locks: number; // hops the player locked on their own (auto-played hops are not counted)
  misses: number;
  scoredHops: number;
  hintsUsed: 0 | 1 | 2;
  points: number;
  maxPoints: number;
}
