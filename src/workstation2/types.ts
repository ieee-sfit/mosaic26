export interface CheatColumn { id: string; label: string }

export interface QuizQuestion {
  id: string;
  column: string; // CheatColumn id referenced by Hint 1
  prompt: string;
  options: [string, string, string, string];
  correct: number; // index into options
}

export interface MatrixRow {
  UNIT: string;
  SECTOR: string;
  GEAR: number;
  RPM: number;
  FUEL_L: number;
  TYRE_PSI: number;
  RELAY_CH: string;
  NEXT_UNIT: string;
}
export type MatrixColumn = keyof MatrixRow;

export interface LookupStep {
  id: string;
  problem: 1 | 2;
  n: 1 | 2 | 3 | 4;
  brief: string;
  // Row selector: match `column` against a literal, or the previous step's answer (+ optional numeric offset)
  find: { column: MatrixColumn; value?: string | number; fromPrev?: boolean; offset?: number };
  read: MatrixColumn;
}

export interface TrackNode { id: string; label: string; fraction: number }
export interface Beam { id: string; from: string; to: string; bow: number }

export interface QualityProfile { id: string; label: string; mbps: number; latencyMs: number }

export interface Stint {
  id: string;
  name: string;
  tag: string;
  briefing: string;
  viewersM: number; // millions of concurrent viewers
  spikeM: number; // extra viewers in the traffic spike
  spikeTarget: 'mulsanne' | 'pit';
  capacity: { mulsanne: number; pit: number; arnage: number }; // Tbps
  baseLatencyMs: number;
  worstQualityIdx: number; // lowest profile index (0=4K) the broadcast contract accepts
}
