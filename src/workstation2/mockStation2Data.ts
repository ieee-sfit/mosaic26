/**
 * STATION 2 — DATA (isolated, swap this file to change content).
 * Questions, route sections and race laps (authored variants) live here, not in components.
 */
import type { CodeEntry, GenOptions, StageSpec } from '../core/radiolink/types';
import type { Beam, LapId, Need, QualityProfile, QuizQuestion, Section, Stint } from './types';

export const STATION2_CONFIG = {
  totalSeconds: 720,
  moduleMax: { A: 15, B: 40, C: 45, D: 20 }, // D is the optional bonus round, outside the 100-point base
  speedBonusMax: 20,
  questionsPerRun: 3,
  hintPenalty: { hint1: 0.4, hint2: 1.0 }, // fraction of that item's points
  wrongAnswerPenalty: 0.2, // fraction of the item's points per wrong try (same -20% as every station)
  utilLimit: 0.8,
  relayHopMs: 90, // BACKUP RELAY adds this much latency
  offerMinSeconds: 90, // Module D is only offered when at least this much shift time is left after Module C
  queueBaseMs: 45,
};

/** Expected clean-run time per module (seconds), used only to flag slow modules on the debrief. */
export const PAR = { A: 100, B: 180, C: 300, D: 110 } as const;
export const TIPS = {
  A: 'Read the whole question. Cross out the options you know are wrong before you guess.',
  B: 'Check every NEED line before you send. Latency adds, loss compounds, bandwidth is the narrowest link.',
  C: 'Stay in the green zones. Fix the node over 80% first, then latency. The relay is optional and adds 90 ms.',
  D: 'Count the run between the two opposite bits. A length that matches no codebook entry is corrupted: RESEND.',
} as const;

/** `column` is only a topic group (CDN, latency, loss, bitrate): the picker spreads a run across topics. */
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
 * Route builder. Each run is a route from the trackside tower (T) to the pit wall (P) over six relay sites (A-F).
 *   latency adds along the route, loss compounds (1 - product of what survives), bandwidth is the narrowest beam.
 * Any route that meets every NEED line scores full marks (rule-based; see routes in logic.ts).
 * The relays sit in three tiers, so every route has at least four beams (T to P never has a shortcut).
 * PRACTICE scores latency and loss. QUALIFYING adds bandwidth with tighter limits.
 * Two labs x 2 runs x 10 points = 40. Every run has a valid route, near-miss routes that fail exactly one NEED line,
 * and no single-metric shortcut (the fastest, the cleanest and the widest route each fail).
 */
export const LAP_LABEL: Record<LapId, string> = { practice: 'PRACTICE', qualifying: 'QUALIFYING' };
export const SECTIONS_PER_LAP = 2;
export const POINTS_PER_SECTION = 10;

type Pos = readonly [number, number];
type Row = readonly [string, string, number, number, number];

/** Each run covers half of the 13.629 km lap, so the two runs of a lab add up to one full lap time. */
const RUN_KM = 13.629 / SECTIONS_PER_LAP;

const run = (id: string, lap: LapId, name: string, need: Need, nodes: Record<string, Pos>, rows: Row[]): Section => {
  const beams: Beam[] = rows.map(([a, b, ms, loss, mbps]) => ({ a, b, ms, loss, mbps }));
  return {
    id, lap, index: Number(id[1]), name, km: RUN_KM, need, beams,
    nodes: Object.fromEntries(Object.entries(nodes).map(([k, [x, y]]) => [k, { x, y }])),
  };
};

export const SECTIONS: Section[] = [
  run('P1', 'practice', 'INDY', { ms: 82, loss: 1.6, mbps: null },
    { T: [876, 222], A: [785, 95], B: [768, 304], C: [602, 102], D: [636, 210], E: [433, 128], F: [503, 312], P: [330, 318] }, [
      ['T', 'A', 15, 0.1, 200],
      ['T', 'B', 27, 0.1, 250],
      ['A', 'C', 21, 0.1, 200],
      ['A', 'D', 16, 0.3, 600],
      ['B', 'D', 13, 0.3, 200],
      ['C', 'E', 26, 1, 600],
      ['C', 'F', 28, 0.3, 1000],
      ['D', 'E', 25, 0.2, 150],
      ['D', 'F', 22, 1.5, 150],
      ['E', 'P', 20, 0.4, 1000],
      ['F', 'P', 19, 0.1, 800],
    ]),
  run('P2', 'practice', 'MULSANNE', { ms: 72, loss: 1.4, mbps: null },
    { T: [900, 100], A: [707, 137], B: [800, 260], C: [553, 121], D: [580, 322], E: [402, 112], F: [457, 209], P: [330, 318] }, [
      ['T', 'A', 30, 0.2, 800],
      ['T', 'B', 18, 0.1, 400],
      ['A', 'C', 9, 1, 300],
      ['B', 'C', 14, 0.8, 200],
      ['B', 'D', 25, 0.1, 400],
      ['C', 'E', 17, 0.4, 150],
      ['C', 'F', 14, 1.5, 250],
      ['D', 'F', 11, 1, 1000],
      ['E', 'P', 19, 0.1, 250],
      ['F', 'P', 18, 0.2, 400],
      ['C', 'D', 13, 0.6, 500],
    ]),
  run('Q1', 'qualifying', 'ARNAGE', { ms: 70, loss: 1.7, mbps: 300 },
    { T: [868, 300], A: [790, 198], B: [694, 316], C: [545, 330], D: [621, 95], E: [475, 204], F: [445, 95], P: [330, 318] }, [
      ['T', 'A', 17, 0.2, 400],
      ['T', 'B', 9, 0.1, 300],
      ['A', 'C', 18, 0.1, 300],
      ['A', 'D', 22, 0.3, 1000],
      ['B', 'C', 27, 0.2, 300],
      ['B', 'D', 12, 0.4, 600],
      ['C', 'E', 25, 0.2, 800],
      ['D', 'E', 13, 0.4, 600],
      ['D', 'F', 22, 0.1, 1000],
      ['E', 'P', 9, 1.2, 300],
      ['F', 'P', 10, 0.6, 200],
    ]),
  run('Q2', 'qualifying', 'S-CURVES', { ms: 62, loss: 1.3, mbps: 300 },
    { T: [790, 300], A: [713, 100], B: [720, 205], C: [559, 103], D: [550, 330], E: [401, 95], F: [452, 207], P: [330, 318] }, [
      ['T', 'A', 21, 0.4, 800],
      ['T', 'B', 26, 0.1, 1000],
      ['A', 'C', 9, 0.1, 200],
      ['A', 'D', 16, 0.3, 400],
      ['B', 'D', 12, 0.1, 300],
      ['C', 'E', 29, 0.3, 250],
      ['C', 'F', 25, 0.3, 200],
      ['D', 'F', 14, 0.1, 600],
      ['E', 'P', 27, 0.2, 600],
      ['F', 'P', 9, 1, 300],
      ['E', 'F', 30, 0.3, 500],
    ]),
];

// ---------------------------------------------------------------- MODULE C
export const QUALITY_PROFILES: QualityProfile[] = [
  { id: '4K', label: '4K', mbps: 25, latencyMs: 700 },
  { id: '1080', label: '1080p', mbps: 8, latencyMs: 350 },
  { id: '720', label: '720p', mbps: 3, latencyMs: 120 },
];

/**
 * Three race laps, each authored as DATA with several variants. A seed picks one variant per lap (logic.ts `pickStints`),
 * so a repeat attempt gets different numbers. Nothing here is tuned to one answer: every variant has a wide band of valid splits
 * and more than one valid quality. Contract per lap: latency under its limit, every active node under 80%, quality at or above
 * the lap's minimum (`worstQualityIdx`: 2 = anything from 720p up, 1 = 1080p and up).
 *   Lap 1 (any quality allowed): 4K is too heavy, 1080p and 720p work.
 *   Lap 2 and 3 (1080p and up): 1080p works, and so does 4K with a modest split.
 * BACKUP RELAY is never required (every variant is solvable with it off). It can widen the safe split range, but it adds
 * +90 ms, so switching it on when it is not needed can break the latency line.
 * Every variant was checked by an exhaustive solver over quality x split x relay, and again in the browser.
 */
type Cap = Stint['capacity'];
const lap = (
  id: string, name: string, tag: string, worstQualityIdx: number, viewersM: number, spikeM: number, spikeTarget: Stint['spikeTarget'],
  capacity: Cap, baseLatencyMs: number, latencyLimitMs: number,
): Stint => ({ id, name, tag, viewersM, spikeM, spikeTarget, capacity, baseLatencyMs, worstQualityIdx, latencyLimitMs });
const cap = (mulsanne: number, pit: number, arnage: number): Cap => ({ mulsanne, pit, arnage });

export const LAP_VARIANTS: Stint[][] = [
  [
    lap('dry-a', 'DRY', 'LAP 1 · CLEAR', 2, 2.8, 1.4, 'pit', cap(26, 34, 24), 300, 900),
    lap('dry-b', 'DRY', 'LAP 1 · DUSK', 2, 3.2, 0.4, 'mulsanne', cap(34, 38, 20), 240, 700),
    lap('dry-c', 'DRY', 'LAP 1 · WARM-UP', 2, 4.4, 0.8, 'mulsanne', cap(38, 28, 30), 420, 1000),
  ],
  [
    lap('rain-a', 'RAIN', 'LAP 2 · HEAVY RAIN', 1, 2.0, 0.6, 'mulsanne', cap(48, 52, 28), 240, 1200),
    lap('rain-b', 'RAIN', 'LAP 2 · NIGHT RAIN', 1, 1.6, 0.6, 'pit', cap(54, 42, 22), 360, 1300),
    lap('rain-c', 'RAIN', 'LAP 2 · SPRAY', 1, 1.4, 0.4, 'mulsanne', cap(34, 54, 24), 420, 1300),
  ],
  [
    lap('final-a', 'FINAL', 'LAP 3 · CHEQUERED FLAG', 1, 2.0, 0.6, 'pit', cap(48, 46, 26), 360, 1300),
    lap('final-b', 'FINAL', 'LAP 3 · LAST STINT', 1, 1.2, 0.4, 'mulsanne', cap(36, 52, 20), 180, 1000),
    lap('final-c', 'FINAL', 'LAP 3 · RESTART', 1, 1.2, 1.0, 'pit', cap(46, 48, 34), 240, 1200),
  ],
];

export const BALANCER_DEFAULTS = { split: 50, qualityIdx: 0, divert: false };

// ---------------------------------------------------------------- MODULE D (FINAL PUSH · RADIO LINK)
/**
 * Codebook order matters: stage 1 uses the first 2 entries, stage 2 the first 4, stage 3 all 6.
 * A command is a run of identical bits bounded by the opposite bit on each side; run length picks the command, bit value the pair member.
 */
export const RADIO_CODEBOOK: CodeEntry[] = [
  { id: 'drs-on', label: 'DRS ON', bit: 1, run: 5 },
  { id: 'drs-off', label: 'DRS OFF', bit: 0, run: 5 },
  { id: 'ot-in', label: 'OVERTAKE INSIDE', bit: 1, run: 3 },
  { id: 'ot-out', label: 'OVERTAKE OUTSIDE', bit: 0, run: 3 },
  { id: 'brake', label: 'BRAKE NOW', bit: 1, run: 4 },
  { id: 'lift', label: 'LIFT OFF', bit: 0, run: 4 },
];

/** All Module D numbers live here so they can be tuned after a playtest. */
export const RADIO_CONFIG = {
  /** Auto-skip of the PLAY / SKIP offer, so an abandoned kiosk still saves its run. */
  offerSeconds: 20,
  hint1SpeedFactor: 0.5, // Hint 1: the stage's stream runs at this share of its speed
  hint1Cost: 0.4, // fraction of that stage's points
  gen: { leadInBits: 8, minGapBits: 5, gapJitter: 2 } satisfies GenOptions,
  stages: [
    { commands: 6, corrupted: 0, active: 2, bps: 1.5, windowBits: 8, freeze: true, maxFlips: 1, points: 5, resend: false },
    { commands: 8, corrupted: 3, active: 4, bps: 1.75, windowBits: 8, freeze: true, maxFlips: 1, points: 7, resend: true },
    { commands: 10, corrupted: 4, active: 6, bps: 2, windowBits: 8, freeze: true, maxFlips: 2, points: 8, resend: true },
  ] satisfies StageSpec[],
};
