export interface CheatColumn { id: string; label: string }

export interface QuizQuestion {
  id: string;
  column: string; // CheatColumn id referenced by Hint 1
  prompt: string;
  options: [string, string, string, string];
  correct: number; // index into options
}

/** Module B: one relay tower on the circuit map. `allowed` is what the TOWER SHEET lists for it. */
export interface Tower {
  id: string;
  label: string; // sector name shown on the sheet
  x: number; // map position in the 1000x400 plate
  y: number;
  allowed: string[];
  /** Pre-locked at the start (not scored). */
  anchor?: string;
}

export interface Circuit {
  id: string;
  name: string;
  channels: string[];
  towers: Tower[];
  /** Pairs of towers in radio range of each other: they may not share a channel. */
  links: [string, string][];
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
