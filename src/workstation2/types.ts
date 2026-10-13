export interface CheatColumn { id: string; label: string }

export interface QuizQuestion {
  id: string;
  column: string; // CheatColumn id referenced by Hint 1
  prompt: string;
  options: [string, string, string, string];
  correct: number; // index into options
}

/** Module B: one beam between two relay sites. Latency adds, loss compounds, bandwidth is the narrowest link. */
export interface Beam { a: string; b: string; ms: number; loss: number; mbps: number }

/** The NEED lines of a run. `mbps` is null when bandwidth is not scored (practice). */
export interface Need { ms: number; loss: number; mbps: number | null }

export type LapId = 'practice' | 'qualifying';

/** One run: a route from the trackside tower (T) to the pit wall (P). Node positions are on the 1000x400 plate. */
export interface Section {
  id: string; // P1, P2, Q1, Q2
  lap: LapId;
  index: number; // 1..2 within its lap
  name: string; // landmark the tower stands at
  km: number;
  nodes: Record<string, { x: number; y: number }>;
  beams: Beam[];
  need: Need;
}

export interface QualityProfile { id: string; label: string; mbps: number; latencyMs: number }

export interface Stint {
  id: string;
  name: string; // short lap name
  tag: string; // one short line, e.g. "RAIN"
  viewersM: number; // millions of concurrent viewers
  spikeM: number; // extra viewers in the traffic spike
  spikeTarget: 'mulsanne' | 'pit';
  capacity: { mulsanne: number; pit: number; arnage: number }; // Tbps
  baseLatencyMs: number;
  /** Contract: worst accepted quality (index into QUALITY_PROFILES, 0 = 4K). */
  worstQualityIdx: number;
  /** Contract: latency must stay under this. */
  latencyLimitMs: number;
}
