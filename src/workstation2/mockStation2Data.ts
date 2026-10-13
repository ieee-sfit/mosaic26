/**
 * STATION 2 — DATA (isolated, swap this file to change content).
 * Questions, cheat-sheet columns, route sections and race stints live here, not in components.
 */
import type { Beam, CheatColumn, LapId, Need, QualityProfile, QuizQuestion, Section, Stint } from './types';

export const STATION2_CONFIG = {
  totalSeconds: 720,
  moduleMax: { A: 15, B: 40, C: 45 },
  speedBonusMax: 20,
  questionsPerRun: 3,
  hintPenalty: { hint1: 0.4, hint2: 1.0 }, // fraction of that item's points
  wrongAnswerPenalty: 0.2, // fraction of the item's points per wrong try (same -20% as every station)
  gasketPips: 3,
  utilLimit: 0.8,
  idleLimitMs: 40000, // no slider touched for this long while unbalanced: engine overheats, gasket blows
  relayHopMs: 90, // BACKUP RELAY adds this much latency
  queueBaseMs: 45,
};

/** Expected clean-run time per module (seconds), used only to flag slow modules on the debrief. */
export const PAR = { A: 100, B: 240, C: 300 } as const;
export const TIPS = {
  A: 'Read the whole question, then check the cheat sheet before guessing.',
  B: 'Check every NEED line before you send. Latency adds, loss compounds, bandwidth is the narrowest link.',
  C: 'Fix the node over 80% first, then latency, then quality. Use the relay only if a node cannot cope.',
} as const;

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
/**
 * Route builder. Each section is a route from the trackside tower (T) to the pit wall (P) over relay sites.
 *   latency adds along the route, loss compounds (1 - product of what survives), bandwidth is the narrowest beam.
 * Any route that meets every NEED line scores full marks (rule-based; see routes in logic.ts).
 * PRACTICE scores latency and loss with generous limits. QUALIFYING adds bandwidth with tighter limits.
 * Two laps x 4 sections x 5 points = 40. Every section has at least one valid route and several tempting wrong ones.
 */
export const LAP_NEED: Record<LapId, Need> = {
  practice: { ms: 82, loss: 3.0, mbps: null },
  qualifying: { ms: 64, loss: 1.6, mbps: 400 },
};
export const LAP_LABEL: Record<LapId, string> = { practice: 'PRACTICE', qualifying: 'QUALIFYING' };
export const SECTIONS_PER_LAP = 4;
export const POINTS_PER_SECTION = 5;

/** Landmark names and lap shares (km) of the four sections; they sum to the 13.629 km lap. */
const SITE: Record<'1' | '2' | '3' | '4', { name: string; km: number; nodes: Record<string, readonly [number, number]> }> = {
  '1': { name: 'ESSES', km: 3.12, nodes: { T: [104, 198], A: [190, 152], B: [358, 234], C: [513, 138], D: [625, 281], P: [330, 318] } },
  '2': { name: 'MULSANNE', km: 4.46, nodes: { T: [520, 84], A: [330, 150], B: [710, 150], C: [236, 222], D: [520, 232], E: [810, 232], P: [330, 318] } },
  '3': { name: 'INDY', km: 3.3, nodes: { T: [876, 222], A: [700, 130], B: [700, 285], C: [540, 200], D: [420, 238], P: [330, 318] } },
  '4': { name: 'S-CURVES', km: 2.749, nodes: { T: [700, 300], A: [600, 200], B: [820, 205], C: [430, 140], D: [500, 275], P: [330, 318] } },
};

const sec = (id: string, lap: LapId, rows: (readonly [string, string, number, number, number])[]): Section => {
  const index = Number(id[1]);
  const site = SITE[String(index) as '1' | '2' | '3' | '4'];
  const nodes = Object.fromEntries(Object.entries(site.nodes).map(([k, [x, y]]) => [k, { x, y }]));
  const beams: Beam[] = rows.map(([a, b, ms, loss, mbps]) => ({ a, b, ms, loss, mbps }));
  return { id, lap, index, name: site.name, km: site.km, nodes, beams, need: LAP_NEED[lap] };
};

export const SECTIONS: Section[] = [
  sec('P1', 'practice', [
    ['A', 'T', 14, 0.4, 800],
    ['B', 'T', 16, 2.5, 150],
    ['A', 'B', 21, 0.3, 150],
    ['A', 'C', 26, 0.8, 500],
    ['B', 'C', 26, 0.8, 500],
    ['B', 'D', 24, 0.6, 150],
    ['C', 'D', 14, 0.2, 250],
    ['C', 'P', 18, 2.5, 200],
    ['D', 'P', 19, 0.2, 500],
  ]),
  sec('P2', 'practice', [
    ['A', 'T', 13, 0.2, 500],
    ['B', 'T', 17, 0.6, 500],
    ['D', 'T', 21, 2.5, 1000],
    ['A', 'C', 24, 0.2, 500],
    ['A', 'D', 16, 1.5, 400],
    ['B', 'D', 26, 0.2, 800],
    ['B', 'E', 13, 1.5, 200],
    ['D', 'E', 19, 0.1, 300],
    ['C', 'P', 17, 0.1, 200],
    ['D', 'P', 23, 0.6, 1000],
  ]),
  sec('P3', 'practice', [
    ['A', 'T', 17, 1, 1000],
    ['B', 'T', 22, 0.8, 200],
    ['A', 'B', 13, 0.1, 800],
    ['A', 'C', 23, 0.2, 200],
    ['B', 'C', 24, 0.6, 1000],
    ['C', 'D', 19, 0.1, 600],
    ['D', 'P', 14, 1, 150],
    ['C', 'P', 36, 2, 500],
    ['B', 'D', 32, 2, 250],
  ]),
  sec('P4', 'practice', [
    ['A', 'T', 21, 1.5, 600],
    ['B', 'T', 21, 1.2, 800],
    ['D', 'T', 17, 2.5, 400],
    ['A', 'B', 18, 1.2, 500],
    ['A', 'C', 18, 0.1, 800],
    ['A', 'D', 22, 0.6, 400],
    ['C', 'D', 19, 1, 150],
    ['C', 'P', 26, 0.3, 1000],
    ['D', 'P', 15, 0.6, 600],
  ]),
  sec('Q1', 'qualifying', [
    ['A', 'T', 25, 0.4, 800],
    ['B', 'T', 16, 0.1, 400],
    ['A', 'B', 21, 0.6, 1000],
    ['A', 'C', 24, 0.4, 800],
    ['B', 'C', 18, 0.6, 500],
    ['B', 'D', 22, 1.5, 500],
    ['C', 'D', 12, 0.2, 400],
    ['C', 'P', 26, 0.2, 150],
    ['D', 'P', 14, 0.4, 400],
  ]),
  sec('Q2', 'qualifying', [
    ['A', 'T', 21, 0.2, 400],
    ['B', 'T', 23, 0.1, 400],
    ['D', 'T', 26, 1.2, 400],
    ['A', 'C', 16, 0.3, 250],
    ['A', 'D', 16, 0.2, 1000],
    ['B', 'D', 26, 0.4, 600],
    ['B', 'E', 11, 1.2, 800],
    ['D', 'E', 20, 0.3, 500],
    ['C', 'P', 12, 0.2, 200],
    ['D', 'P', 20, 1, 500],
  ]),
  sec('Q3', 'qualifying', [
    ['A', 'T', 15, 0.3, 400],
    ['B', 'T', 11, 0.3, 800],
    ['A', 'B', 14, 1, 150],
    ['A', 'C', 19, 0.4, 1000],
    ['B', 'C', 16, 0.3, 400],
    ['C', 'D', 16, 0.2, 500],
    ['D', 'P', 18, 0.4, 1000],
    ['C', 'P', 32, 1.2, 1000],
    ['B', 'D', 29, 0.8, 200],
  ]),
  sec('Q4', 'qualifying', [
    ['A', 'T', 11, 0.2, 1000],
    ['B', 'T', 11, 0.6, 500],
    ['D', 'T', 21, 2.5, 150],
    ['A', 'B', 15, 0.4, 1000],
    ['A', 'C', 21, 0.3, 800],
    ['A', 'D', 13, 0.8, 250],
    ['C', 'D', 13, 2, 500],
    ['C', 'P', 20, 0.1, 1000],
    ['D', 'P', 15, 0.6, 500],
  ]),
];

// ---------------------------------------------------------------- MODULE C
export const QUALITY_PROFILES: QualityProfile[] = [
  { id: '4K', label: '4K', mbps: 25, latencyMs: 700 },
  { id: '1080', label: '1080p', mbps: 8, latencyMs: 350 },
  { id: '720', label: '720p', mbps: 3, latencyMs: 120 },
];

/**
 * Three race laps. Contract per lap: latency under its limit, worst node under 80%, quality at or above the minimum.
 * Lap 1: no relay needed. Lap 2: the Mulsanne mast cannot take the spike, so BACKUP RELAY is required.
 * Lap 3: both ways work; the relay widens the split window but costs +90 ms against a tight limit.
 * (Checked by `solveStint` in logic.ts and by the Playwright run.)
 */
export const STINTS: Stint[] = [
  {
    id: 'dry', name: 'DRY', tag: 'LAP 1 · CLEAR', viewersM: 1.6, spikeM: 0.6, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 14, pit: 20, arnage: 20 }, baseLatencyMs: 180, worstQualityIdx: 1, latencyLimitMs: 1100,
  },
  {
    id: 'rain', name: 'RAIN', tag: 'LAP 2 · HEAVY RAIN', viewersM: 3.0, spikeM: 1.4, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 12, pit: 40, arnage: 30 }, baseLatencyMs: 420, worstQualityIdx: 1, latencyLimitMs: 1150,
  },
  {
    id: 'final', name: 'FINAL', tag: 'LAP 3 · CHEQUERED FLAG', viewersM: 4.0, spikeM: 1.0, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 30, pit: 26, arnage: 28 }, baseLatencyMs: 380, worstQualityIdx: 1, latencyLimitMs: 1000,
  },
];

export const BALANCER_DEFAULTS = { split: 50, qualityIdx: 0, divert: false };
