/**
 * STATION 2 — MOCK DATA (isolated, swap this file to change content).
 * Questions, cheat-sheet columns, lookup matrix, track nodes, beams and balancer configs live here.
 */
import type {
  Beam, CheatColumn, LookupStep, MatrixColumn, MatrixRow, QualityProfile, QuizQuestion, Stint, TrackNode,
} from './types';

export const STATION2_CONFIG = {
  totalSeconds: 720,
  idDigits: 6,
  moduleMax: { A: 15, B: 40, C: 45 },
  speedBonusMax: 20,
  questionsPerRun: 3,
  hintPenalty: { hint1: 0.4, hint2: 1.0 }, // fraction of that question's points
  wrongAnswerPenalty: 0.2, // fraction of question points per wrong transmit (same -20% as every station)
  stepWrongPenalty: 1, // points lost per wrong lookup entry
  gasketPips: 3,
  latencyLimitMs: 1500,
  utilLimit: 0.8,
  idleLimitMs: 25000,
  relayHopMs: 90,
  queueBaseMs: 45,
};

export const CHEAT_COLUMNS: CheatColumn[] = [
  { id: 'COL-1', label: 'CDN EDGE CACHING' },
  { id: 'COL-2', label: 'LATENCY vs BANDWIDTH' },
  { id: 'COL-3', label: 'PACKET LOSS' },
  { id: 'COL-4', label: 'BITRATE LADDER (4K vs 1080p)' },
];

const q = (
  id: string, column: string, prompt: string,
  options: [string, string, string, string], correct: number,
): QuizQuestion => ({ id, column, prompt, options, correct });

export const QUESTION_BANK: QuizQuestion[] = [
  q('Q01', 'COL-1', 'A viewer in Le Mans requests a segment already stored at the nearby edge server. What is this called?',
    ['Cache miss', 'Cache hit', 'Origin shield bypass', 'Cold start'], 1),
  q('Q02', 'COL-1', 'Which change most directly raises the CDN cache-hit ratio for live race segments?',
    ['Shorter TTL on every segment', 'Serving each viewer from the origin', 'Longer TTL on stable segments and request collapsing', 'Disabling edge servers'], 2),
  q('Q03', 'COL-1', 'What is the main job of an origin shield tier in front of the broadcast origin?',
    ['Encrypt viewer passwords', 'Collapse many edge misses into one origin fetch', 'Raise video resolution', 'Increase packet loss tolerance'], 1),
  q('Q04', 'COL-1', 'Why does moving the edge node closer to the viewer reduce lag?',
    ['It shortens round-trip distance', 'It increases the video bitrate', 'It removes the need for TCP', 'It compresses audio'], 0),
  q('Q05', 'COL-2', 'Latency is best described as…',
    ['Data volume per second', 'Time for a packet to travel source to destination', 'Number of viewers online', 'Pixels per frame'], 1),
  q('Q06', 'COL-2', 'Bandwidth is best described as…',
    ['Delay of one packet', 'Maximum data rate a link can carry', 'Jitter of the stream', 'Cache TTL'], 1),
  q('Q07', 'COL-2', 'Doubling the link bandwidth will mostly…',
    ['Halve the speed-of-light delay', 'Allow more data per second without fixing propagation delay', 'Eliminate all jitter', 'Reduce 4K to 1080p'], 1),
  q('Q08', 'COL-2', 'A "0-lag" live feed matters most for which metric?',
    ['Glass-to-glass latency', 'Disk capacity', 'Colour depth only', 'Number of CDN vendors'], 0),
  q('Q09', 'COL-3', 'What happens to a UDP video stream when packets are lost?',
    ['They are always retransmitted instantly', 'Glitches or freezes appear unless FEC/ARQ is used', 'Bitrate doubles automatically', 'The CDN clears its cache'], 1),
  q('Q10', 'COL-3', 'Forward Error Correction (FEC) helps packet loss by…',
    ['Sending redundant parity data so lost packets can be rebuilt', 'Slowing the camera shutter', 'Dropping the resolution to 360p always', 'Disabling the edge cache'], 0),
  q('Q11', 'COL-3', 'On a lossy link, which protocol behaviour adds delay due to retransmission?',
    ['UDP fire-and-forget', 'TCP acknowledgements and resends', 'ICMP echo', 'Multicast without feedback'], 1),
  q('Q12', 'COL-3', 'Which packet-loss level typically makes live HD video visibly break up?',
    ['0.0001%', 'Around 1–2% or more', '0%', 'Exactly 0.00%'], 1),
  q('Q13', 'COL-4', 'Compared with 1080p, a 4K stream needs roughly how much more bitrate (same codec)?',
    ['About the same', 'About 3–4× more', 'About half', 'About 100× more'], 1),
  q('Q14', 'COL-4', 'Adaptive bitrate (ABR) switches between ladder rungs to…',
    ['Keep playback smooth as bandwidth changes', 'Add audio tracks', 'Increase the origin TTL', 'Encrypt the segments'], 0),
  q('Q15', 'COL-4', 'Dropping from 4K RAW to 720p low-latency mainly trades…',
    ['Picture detail for lower bandwidth and delay', 'Colour for sound', 'Cache hits for misses', 'Packet loss for jitter'], 0),
];

// ---------------------------------------------------------------- MODULE B
export const MATRIX_COLUMNS: MatrixColumn[] = [
  'UNIT', 'SECTOR', 'GEAR', 'RPM', 'FUEL_L', 'TYRE_PSI', 'RELAY_CH', 'NEXT_UNIT',
];

export const MATRIX: MatrixRow[] = [
  { UNIT: 'A1', SECTOR: 'MULSANNE', GEAR: 5, RPM: 6850, FUEL_L: 92, TYRE_PSI: 31, RELAY_CH: 'CH-14', NEXT_UNIT: 'C2' },
  { UNIT: 'A2', SECTOR: 'ARNAGE', GEAR: 2, RPM: 5400, FUEL_L: 88, TYRE_PSI: 29, RELAY_CH: 'CH-07', NEXT_UNIT: 'D1' },
  { UNIT: 'B1', SECTOR: 'PITS', GEAR: 3, RPM: 6200, FUEL_L: 75, TYRE_PSI: 33, RELAY_CH: 'CH-21', NEXT_UNIT: 'A2' },
  { UNIT: 'B2', SECTOR: 'INDIANAPOLIS', GEAR: 4, RPM: 6620, FUEL_L: 81, TYRE_PSI: 30, RELAY_CH: 'CH-03', NEXT_UNIT: 'E1' },
  { UNIT: 'C1', SECTOR: 'MULSANNE', GEAR: 6, RPM: 7000, FUEL_L: 67, TYRE_PSI: 32, RELAY_CH: 'CH-18', NEXT_UNIT: 'B1' },
  { UNIT: 'C2', SECTOR: 'ARNAGE', GEAR: 3, RPM: 5900, FUEL_L: 59, TYRE_PSI: 28, RELAY_CH: 'CH-11', NEXT_UNIT: 'B2' },
  { UNIT: 'D1', SECTOR: 'PITS', GEAR: 2, RPM: 4800, FUEL_L: 98, TYRE_PSI: 34, RELAY_CH: 'CH-26', NEXT_UNIT: 'C1' },
  { UNIT: 'D2', SECTOR: 'PORSCHE', GEAR: 4, RPM: 6400, FUEL_L: 52, TYRE_PSI: 27, RELAY_CH: 'CH-09', NEXT_UNIT: 'E2' },
  { UNIT: 'E1', SECTOR: 'INDIANAPOLIS', GEAR: 5, RPM: 6980, FUEL_L: 44, TYRE_PSI: 35, RELAY_CH: 'CH-30', NEXT_UNIT: 'A1' },
  { UNIT: 'E2', SECTOR: 'DUNLOP', GEAR: 3, RPM: 5600, FUEL_L: 71, TYRE_PSI: 26, RELAY_CH: 'CH-16', NEXT_UNIT: 'D2' },
];

export const LOOKUP_STEPS: LookupStep[] = [
  { id: 'P1S1', problem: 1, n: 1, brief: 'Ken Miles radios in from the Mulsanne tower zone.',
    find: { column: 'UNIT', value: 'A1' }, read: 'NEXT_UNIT' },
  { id: 'P1S2', problem: 1, n: 2, brief: 'Route the relay to the unit you just found.',
    find: { column: 'UNIT', fromPrev: true }, read: 'RPM' },
  { id: 'P1S3', problem: 1, n: 3, brief: 'Engine note drifts up. Track the unit running hotter.',
    find: { column: 'RPM', fromPrev: true, offset: 300 }, read: 'TYRE_PSI' },
  { id: 'P1S4', problem: 1, n: 4, brief: 'Tyre pressure bleeds off. Find the matching unit and lock its channel.',
    find: { column: 'TYRE_PSI', fromPrev: true, offset: -3 }, read: 'RELAY_CH' },

  { id: 'P2S1', problem: 2, n: 1, brief: 'Arnage tower reports a second car on the relay.',
    find: { column: 'UNIT', value: 'D2' }, read: 'NEXT_UNIT' },
  { id: 'P2S2', problem: 2, n: 2, brief: 'Check how much fuel the next unit carries.',
    find: { column: 'UNIT', fromPrev: true }, read: 'FUEL_L' },
  { id: 'P2S3', problem: 2, n: 3, brief: 'Pit wall tops up the tank. Find the refuelled unit.',
    find: { column: 'FUEL_L', fromPrev: true, offset: 10 }, read: 'RPM' },
  { id: 'P2S4', problem: 2, n: 4, brief: 'Final sprint to the Pit Straight. Lock the closing channel.',
    find: { column: 'RPM', fromPrev: true, offset: 360 }, read: 'RELAY_CH' },
];

/** Track nodes sit on the SVG track at the given path fraction (0..1). */
export const TRACK_PATH =
  'M 150 335 L 400 335 C 470 335 500 310 560 310 C 620 310 650 345 700 320 C 740 300 735 250 700 235 ' +
  'C 665 225 650 190 690 170 C 730 150 745 100 710 80 L 230 70 C 170 66 130 90 130 130 ' +
  'C 130 180 190 190 190 230 C 190 280 100 280 100 310 C 100 330 120 335 150 335 Z';

export const TRACK_NODES: TrackNode[] = [
  { id: 'pit', label: 'PIT STRAIGHT', fraction: 0.06 },
  { id: 'arnage', label: 'ARNAGE', fraction: 0.4 },
  { id: 'mulsanne', label: 'MULSANNE', fraction: 0.68 },
];

/** GT40 waypoints: index = number of verified lookup steps (0..8). */
export const CAR_FRACTIONS = [0.02, 0.12, 0.22, 0.33, 0.45, 0.55, 0.66, 0.78, 0.9];

/** Beams light up one per verified step, in order. `car` is Ken Miles' GT40. */
export const BEAMS: Beam[] = [
  { id: 'b1', from: 'car', to: 'mulsanne', bow: 40 },
  { id: 'b2', from: 'car', to: 'arnage', bow: -40 },
  { id: 'b3', from: 'car', to: 'pit', bow: 40 },
  { id: 'b4', from: 'mulsanne', to: 'arnage', bow: -50 },
  { id: 'b5', from: 'arnage', to: 'pit', bow: 50 },
  { id: 'b6', from: 'mulsanne', to: 'pit', bow: 60 },
  { id: 'b7', from: 'car', to: 'mulsanne', bow: -70 },
  { id: 'b8', from: 'car', to: 'pit', bow: -70 },
];

// ---------------------------------------------------------------- MODULE C
export const QUALITY_PROFILES: QualityProfile[] = [
  { id: '4K', label: '4K RAW', mbps: 25, latencyMs: 700 },
  { id: '1080', label: '1080p', mbps: 8, latencyMs: 350 },
  { id: '720', label: '720p LOW LATENCY', mbps: 3, latencyMs: 120 },
];

export const STINTS: Stint[] = [
  {
    id: 'day', name: 'DAY STINT', tag: 'SAT 16:00 // CLEAR',
    briefing: 'Fans flood in. Mulsanne gets a 0.8M viewer spike. Broadcast contract demands 4K RAW.',
    viewersM: 2.4, spikeM: 0.8, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 45, pit: 45, arnage: 30 }, baseLatencyMs: 180, worstQualityIdx: 0,
  },
  {
    id: 'rain', name: 'RAIN STINT', tag: 'SAT 23:40 // HEAVY RAIN',
    briefing: 'Rain fade chokes Mulsanne. Pit lane crowd surges. Contract allows 1080p or better.',
    viewersM: 5.0, spikeM: 1.6, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 30, pit: 55, arnage: 35 }, baseLatencyMs: 520, worstQualityIdx: 1,
  },
  {
    id: 'sprint', name: 'FINAL SPRINT', tag: 'SUN 15:30 // CHEQUERED FLAG',
    briefing: 'Record audience. Every node near the ceiling. Hold 1080p or better to the flag.',
    viewersM: 6.5, spikeM: 2.5, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 32, pit: 38, arnage: 28 }, baseLatencyMs: 380, worstQualityIdx: 1,
  },
];

export const BALANCER_DEFAULTS = { split: 50, qualityIdx: 0, divert: false };
