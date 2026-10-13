/**
 * STATION 2 — DATA (isolated, swap this file to change content).
 * Questions, cheat-sheet columns, relay circuits and balancer stints live here, not in components.
 */
import type { Circuit, CheatColumn, QualityProfile, QuizQuestion, Stint } from './types';

export const STATION2_CONFIG = {
  totalSeconds: 720,
  moduleMax: { A: 15, B: 40, C: 45 },
  speedBonusMax: 20,
  questionsPerRun: 3,
  hintPenalty: { hint1: 0.4, hint2: 1.0 }, // fraction of that item's points
  wrongAnswerPenalty: 0.2, // fraction of the item's points per wrong try (same -20% as every station)
  gasketPips: 3,
  latencyLimitMs: 1500,
  utilLimit: 0.8,
  idleLimitMs: 40000, // no slider touched for this long while unbalanced: engine overheats, gasket blows
  relayHopMs: 90,
  queueBaseMs: 45,
};

/** Expected clean-run time per module (seconds), used only to flag slow modules on the debrief. */
export const PAR = { A: 100, B: 240, C: 300 } as const;
export const TIPS = {
  A: 'Read the whole question, then check the cheat sheet before guessing.',
  B: 'Start with the anchor tower. Its neighbours cannot match it.',
  C: 'Fix the red node first, then check latency, then quality.',
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
 * Relay tower channel plan. Rule: towers joined by a link may not share a channel.
 * Each tower can only use the channels its row on the TOWER SHEET lists. Anchors are pre-locked.
 * A lock is accepted when the plan can still be completed, so any valid plan scores (see logic.ts).
 * Every circuit has 5 towers, 1 anchor and 4 scored towers (8 scored towers x 5 pts = 40).
 */
export const CIRCUITS: Circuit[] = [
  {
    id: 'c1',
    name: 'CIRCUIT 1',
    channels: ['CH-03', 'CH-07', 'CH-11'],
    towers: [
      { id: 'T1', label: 'MULSANNE', x: 800, y: 134, allowed: ['CH-03', 'CH-07'] },
      { id: 'T2', label: 'INDIANAPOLIS', x: 822, y: 258, allowed: ['CH-03', 'CH-07', 'CH-11'] },
      { id: 'T3', label: 'ARNAGE', x: 620, y: 262, allowed: ['CH-07', 'CH-11'] },
      { id: 'T4', label: 'S-CURVES', x: 450, y: 250, allowed: ['CH-03', 'CH-07', 'CH-11'] },
      { id: 'T5', label: 'PIT WALL', x: 330, y: 296, allowed: ['CH-11'], anchor: 'CH-11' },
    ],
    links: [['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T4', 'T5'], ['T5', 'T1'], ['T2', 'T5']],
  },
  {
    id: 'c2',
    name: 'CIRCUIT 2',
    channels: ['CH-03', 'CH-07', 'CH-11', 'CH-14'],
    towers: [
      { id: 'T1', label: 'DUNLOP', x: 206, y: 250, allowed: ['CH-03', 'CH-07', 'CH-14'] },
      { id: 'T2', label: 'HUNAUDIERES', x: 470, y: 138, allowed: ['CH-07', 'CH-11'] },
      { id: 'T3', label: 'TERTRE ROUGE', x: 236, y: 136, allowed: ['CH-11'], anchor: 'CH-11' },
      { id: 'T4', label: 'PITS', x: 420, y: 262, allowed: ['CH-07', 'CH-11', 'CH-14'] },
      { id: 'T5', label: 'INDY', x: 690, y: 236, allowed: ['CH-03', 'CH-07', 'CH-11'] },
    ],
    links: [['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T4', 'T5'], ['T5', 'T1'], ['T3', 'T5']],
  },
];

// ---------------------------------------------------------------- MODULE C
export const QUALITY_PROFILES: QualityProfile[] = [
  { id: '4K', label: '4K', mbps: 25, latencyMs: 700 },
  { id: '1080', label: '1080p', mbps: 8, latencyMs: 350 },
  { id: '720', label: '720p', mbps: 3, latencyMs: 120 },
];

export const STINTS: Stint[] = [
  {
    id: 'day', name: 'DAY', tag: 'SAT 16:00 · CLEAR', goal: 'CONTRACT: 4K',
    viewersM: 2.4, spikeM: 0.8, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 45, pit: 45, arnage: 30 }, baseLatencyMs: 180, worstQualityIdx: 0,
  },
  {
    id: 'rain', name: 'RAIN', tag: 'SAT 23:40 · HEAVY RAIN', goal: 'CONTRACT: 1080p OR BETTER',
    viewersM: 5.0, spikeM: 1.6, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 30, pit: 55, arnage: 35 }, baseLatencyMs: 520, worstQualityIdx: 1,
  },
  {
    id: 'sprint', name: 'FINAL', tag: 'SUN 15:30 · CHEQUERED FLAG', goal: 'CONTRACT: 1080p OR BETTER',
    viewersM: 6.5, spikeM: 2.5, spikeTarget: 'mulsanne',
    capacity: { mulsanne: 34, pit: 40, arnage: 28 }, baseLatencyMs: 380, worstQualityIdx: 1,
  },
];

export const BALANCER_DEFAULTS = { split: 50, qualityIdx: 0, divert: false };
