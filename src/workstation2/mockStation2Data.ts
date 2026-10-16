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
  q('Q16', 'COL-1', 'What does the TTL on a cached segment control?',
    ['How many viewers can watch it', 'How long it may be served before it must be refreshed', 'The video resolution', 'The packet size'], 1),
  q('Q17', 'COL-1', 'When an edge serves most requests from its cache, the origin load…',
    ['Drops sharply', 'Rises sharply', 'Stays at 100%', 'Doubles'], 0),
  q('Q18', 'COL-1', 'Why place edge servers near large viewer populations?',
    ['Cheaper cameras', 'A higher encoder bitrate', 'Smaller screens', 'Fewer hops and shorter distance for most viewers'], 3),
  q('Q19', 'COL-1', 'A flash crowd hits one edge node. Which feature spreads the load to other nodes?',
    ['A longer TTL on all content', 'A slower camera shutter', 'Load balancing / traffic steering', 'A larger playback buffer'], 2),
  q('Q20', 'COL-2', 'Which delay can NOT be reduced by simply buying more bandwidth?',
    ['The download time of a large file', 'Speed-of-light propagation delay', 'Queueing at a saturated link', 'Time to fetch a big segment'], 1),
  q('Q21', 'COL-2', 'A link has 100 Mbps bandwidth and 80 ms latency. Which statement is correct?',
    ['It can carry up to 100 Mbps and a packet takes about 80 ms to arrive', 'It carries 80 Mbps with 100 ms of jitter', 'Latency and bandwidth are the same thing', 'Bandwidth is the delay'], 0),
  q('Q22', 'COL-2', 'Jitter is best described as…',
    ['Average bandwidth', 'The cache-hit ratio', 'The size of a frame', 'Variation in packet delay'], 3),
  q('Q23', 'COL-2', 'Round-trip time (RTT) is…',
    ['The time to encode one frame', 'The length of a lap', 'The time for a request to reach a server and the reply to return', 'The time between cache refreshes'], 2),
  q('Q24', 'COL-3', 'ARQ recovers lost packets by…',
    ['Dropping the resolution to 360p', 'Asking the sender to resend them', 'Clearing the cache', 'Raising the TTL'], 1),
  q('Q25', 'COL-3', 'Compared with FEC, retransmission over a long link mainly costs…',
    ['Extra delay, because it waits a full round trip', 'Colour depth', 'Disk space', 'Camera range'], 0),
  q('Q26', 'COL-3', 'Two beams in a row each lose 1% of packets. The total loss is about…',
    ['0.01%', '1%', '10%', '2%'], 3),
  q('Q27', 'COL-3', 'Why can packet loss hurt live video more than a file download?',
    ['Files never lose packets', 'Video has no timing', 'A late resend arrives too late to be shown', 'Downloads only use UDP'], 2),
  q('Q28', 'COL-4', 'Bandwidth suddenly falls. What should an ABR player do?',
    ['Stay on the highest rung', 'Switch to a lower rung to avoid stalling', 'Pause the stream', 'Switch to audio only forever'], 1),
  q('Q29', 'COL-4', 'A 1080p stream needs 8 Mbps but the link delivers 6 Mbps. The likely result is…',
    ['Buffering and stalls', 'Smoother playback', 'Higher resolution', 'Lower latency'], 0),
  q('Q30', 'COL-4', 'Lowering bitrate to cut delay typically trades away…',
    ['Colour accuracy only', 'Cache hits', 'Packet ordering', 'Picture detail'], 3),
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

/**
 * Module B bank: 10 practice + 10 qualifying runs. A run draws 2 of each (logic.ts `pickSections`). P1..P2 / Q1..Q2 are the original
 * authored runs; P3.. / Q3.. were generated and then checked by a solver: 11 beams in the same four tiers (so every route has at
 * least four beams), one to three valid routes, at least two near-miss routes that fail exactly one NEED line (and not all the same
 * line), and the fastest, the cleanest and (qualifying) the widest route each fail. Beam labels were checked not to touch nodes or each other.
 */
export const SECTION_BANK: Section[] = [
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
  run('P3', 'practice', 'DUNLOP', { ms: 65, loss: 1.3, mbps: null },
    { P: [330, 318], T: [878, 326], A: [777, 256], B: [747, 335], C: [575, 286], D: [630, 184], E: [423, 209], F: [462, 330] }, [
      ['T', 'A', 9, 0.3, 200],
      ['T', 'B', 21, 0.8, 400],
      ['A', 'C', 10, 0.1, 300],
      ['B', 'D', 11, 0.1, 800],
      ['B', 'C', 19, 0.2, 150],
      ['C', 'F', 21, 1, 300],
      ['D', 'F', 16, 0.2, 300],
      ['D', 'E', 17, 1, 250],
      ['C', 'E', 26, 0.1, 150],
      ['E', 'P', 27, 0.3, 300],
      ['F', 'P', 15, 0.2, 600],
    ]),
  run('P4', 'practice', 'ESSES', { ms: 65, loss: 1.5, mbps: null },
    { P: [330, 318], T: [904, 234], A: [809, 318], B: [810, 237], C: [588, 310], D: [550, 169], E: [420, 128], F: [441, 232] }, [
      ['T', 'A', 10, 0.6, 200],
      ['T', 'B', 18, 0.6, 1000],
      ['A', 'D', 14, 0.8, 1000],
      ['B', 'D', 25, 0.4, 300],
      ['A', 'C', 14, 0.6, 1000],
      ['D', 'E', 11, 0.1, 300],
      ['C', 'E', 11, 0.1, 200],
      ['D', 'F', 24, 0.1, 150],
      ['C', 'F', 13, 1.2, 400],
      ['E', 'P', 11, 0.3, 300],
      ['F', 'P', 11, 0.1, 1000],
    ]),
  run('P5', 'practice', 'TERTRE ROUGE', { ms: 87, loss: 1, mbps: null },
    { P: [330, 318], T: [882, 259], A: [776, 125], B: [719, 230], C: [609, 274], D: [581, 187], E: [436, 297], F: [461, 170] }, [
      ['T', 'A', 24, 0.2, 300],
      ['T', 'B', 18, 0.6, 300],
      ['B', 'D', 19, 0.6, 600],
      ['B', 'C', 11, 0.8, 800],
      ['A', 'D', 12, 0.1, 300],
      ['C', 'F', 9, 0.3, 1000],
      ['C', 'E', 24, 0.1, 250],
      ['D', 'F', 16, 1.5, 600],
      ['C', 'D', 18, 0.2, 300],
      ['E', 'P', 9, 0.4, 200],
      ['F', 'P', 26, 0.1, 400],
    ]),
  run('P6', 'practice', 'HUNAUDIERES', { ms: 58, loss: 1.4, mbps: null },
    { P: [330, 318], T: [879, 156], A: [787, 230], B: [752, 106], C: [548, 132], D: [609, 231], E: [443, 114], F: [442, 196] }, [
      ['T', 'A', 13, 0.2, 200],
      ['T', 'B', 10, 0.1, 1000],
      ['A', 'C', 15, 0.1, 300],
      ['A', 'D', 12, 0.3, 200],
      ['B', 'C', 12, 1.5, 300],
      ['D', 'F', 21, 1.2, 300],
      ['C', 'E', 14, 0.1, 600],
      ['C', 'F', 28, 0.1, 300],
      ['D', 'E', 14, 1, 200],
      ['E', 'P', 14, 1, 800],
      ['F', 'P', 17, 0.3, 300],
    ]),
  run('P7', 'practice', 'GARAGE VERT', { ms: 92, loss: 1.4, mbps: null },
    { P: [330, 318], T: [822, 108], A: [805, 229], B: [705, 176], C: [640, 334], D: [560, 209], E: [398, 136], F: [426, 305] }, [
      ['T', 'A', 13, 0.6, 150],
      ['T', 'B', 13, 0.2, 250],
      ['A', 'C', 19, 1, 600],
      ['B', 'C', 17, 0.4, 400],
      ['B', 'D', 30, 0.1, 200],
      ['A', 'D', 9, 0.2, 400],
      ['D', 'F', 30, 0.1, 300],
      ['C', 'F', 26, 0.1, 150],
      ['D', 'E', 20, 1, 1000],
      ['E', 'P', 27, 0.1, 300],
      ['F', 'P', 25, 0.6, 150],
    ]),
  run('P8', 'practice', 'DUNLOP CHICANE', { ms: 76, loss: 1.7, mbps: null },
    { P: [330, 318], T: [811, 261], A: [758, 186], B: [713, 315], C: [632, 130], D: [592, 200], E: [447, 105], F: [436, 231] }, [
      ['T', 'A', 14, 0.6, 300],
      ['T', 'B', 21, 0.3, 300],
      ['A', 'D', 30, 0.3, 1000],
      ['B', 'C', 15, 1, 300],
      ['B', 'D', 30, 0.1, 300],
      ['D', 'E', 17, 1.5, 600],
      ['C', 'F', 18, 0.2, 300],
      ['C', 'E', 24, 0.1, 300],
      ['C', 'D', 20, 0.8, 250],
      ['E', 'P', 9, 1, 300],
      ['F', 'P', 21, 0.1, 300],
    ]),
  run('P9', 'practice', 'MAISON BLANCHE', { ms: 69, loss: 1.2, mbps: null },
    { P: [330, 318], T: [873, 127], A: [751, 304], B: [735, 180], C: [619, 308], D: [648, 106], E: [488, 97], F: [493, 268] }, [
      ['T', 'A', 12, 0.1, 1000],
      ['T', 'B', 28, 0.8, 200],
      ['B', 'C', 10, 1, 150],
      ['B', 'D', 10, 1, 1000],
      ['A', 'D', 20, 0.3, 150],
      ['C', 'E', 9, 1.2, 250],
      ['D', 'F', 24, 0.2, 150],
      ['D', 'E', 28, 0.2, 300],
      ['C', 'D', 27, 1, 1000],
      ['E', 'P', 9, 0.6, 1000],
      ['F', 'P', 17, 0.2, 300],
    ]),
  run('P10', 'practice', 'PIT EXIT', { ms: 89, loss: 2, mbps: null },
    { P: [330, 318], T: [857, 237], A: [709, 261], B: [776, 132], C: [627, 282], D: [544, 159], E: [476, 304], F: [402, 125] }, [
      ['T', 'A', 26, 0.4, 600],
      ['T', 'B', 27, 1, 250],
      ['A', 'D', 21, 0.2, 150],
      ['A', 'C', 21, 0.2, 400],
      ['B', 'C', 12, 1.2, 250],
      ['C', 'F', 14, 1, 400],
      ['C', 'E', 19, 1, 1000],
      ['D', 'F', 20, 0.2, 300],
      ['D', 'E', 30, 0.1, 600],
      ['E', 'P', 10, 1.2, 300],
      ['F', 'P', 30, 0.2, 150],
    ]),
  run('Q3', 'qualifying', 'PORSCHE CURVES', { ms: 87, loss: 1.3, mbps: 200 },
    { P: [330, 318], T: [845, 225], A: [748, 286], B: [693, 182], C: [567, 212], D: [643, 124], E: [442, 208], F: [424, 311] }, [
      ['T', 'A', 20, 1, 400],
      ['T', 'B', 30, 0.2, 800],
      ['A', 'C', 15, 0.1, 300],
      ['B', 'D', 16, 1, 600],
      ['B', 'C', 22, 0.1, 800],
      ['C', 'F', 25, 0.1, 800],
      ['C', 'E', 24, 0.8, 200],
      ['D', 'E', 14, 0.4, 150],
      ['E', 'F', 9, 0.2, 600],
      ['E', 'P', 9, 0.2, 300],
      ['F', 'P', 26, 0.1, 200],
    ]),
  run('Q4', 'qualifying', 'FORD CHICANE', { ms: 81, loss: 1.6, mbps: 200 },
    { P: [330, 318], T: [872, 237], A: [713, 334], B: [722, 105], C: [624, 114], D: [640, 268], E: [447, 186], F: [433, 116] }, [
      ['T', 'A', 17, 0.1, 1000],
      ['T', 'B', 18, 0.6, 250],
      ['B', 'C', 20, 0.2, 300],
      ['A', 'C', 18, 0.2, 600],
      ['A', 'D', 25, 1, 250],
      ['B', 'D', 11, 0.8, 250],
      ['D', 'F', 12, 0.2, 300],
      ['D', 'E', 18, 0.1, 800],
      ['C', 'F', 21, 0.4, 600],
      ['E', 'P', 21, 0.3, 300],
      ['F', 'P', 28, 1, 250],
    ]),
  run('Q5', 'qualifying', 'BUGATTI', { ms: 74, loss: 1.2, mbps: 200 },
    { P: [330, 318], T: [900, 267], A: [782, 240], B: [802, 107], C: [614, 227], D: [594, 330], E: [454, 117], F: [487, 298] }, [
      ['T', 'A', 19, 0.3, 400],
      ['T', 'B', 24, 0.6, 200],
      ['A', 'C', 25, 0.4, 400],
      ['A', 'D', 22, 0.6, 1000],
      ['B', 'C', 15, 0.6, 400],
      ['B', 'D', 16, 0.2, 600],
      ['D', 'F', 27, 1.2, 200],
      ['D', 'E', 9, 0.2, 1000],
      ['C', 'F', 20, 0.1, 400],
      ['E', 'P', 25, 0.2, 250],
      ['F', 'P', 13, 0.2, 200],
    ]),
  run('Q6', 'qualifying', 'START-FINISH', { ms: 89, loss: 2, mbps: 300 },
    { P: [330, 318], T: [876, 162], A: [783, 242], B: [750, 163], C: [622, 116], D: [618, 317], E: [486, 262], F: [458, 122] }, [
      ['T', 'A', 15, 0.4, 800],
      ['T', 'B', 30, 0.2, 800],
      ['B', 'D', 30, 0.1, 250],
      ['A', 'C', 19, 1.5, 800],
      ['B', 'C', 26, 0.3, 400],
      ['A', 'D', 15, 0.4, 600],
      ['D', 'F', 9, 0.1, 200],
      ['C', 'E', 30, 0.8, 1000],
      ['D', 'E', 30, 1, 800],
      ['E', 'P', 28, 0.1, 1000],
      ['F', 'P', 25, 0.2, 800],
    ]),
  run('Q7', 'qualifying', 'MULSANNE KINK', { ms: 77, loss: 2, mbps: 200 },
    { P: [330, 318], T: [900, 141], A: [746, 109], B: [720, 331], C: [612, 97], D: [614, 171], E: [433, 195], F: [433, 326] }, [
      ['T', 'A', 25, 0.1, 300],
      ['T', 'B', 12, 1, 800],
      ['B', 'D', 15, 0.4, 250],
      ['A', 'D', 19, 0.1, 250],
      ['A', 'C', 21, 0.1, 300],
      ['D', 'F', 24, 0.1, 200],
      ['D', 'E', 14, 0.6, 250],
      ['C', 'F', 27, 1, 800],
      ['E', 'F', 30, 0.4, 300],
      ['E', 'P', 16, 0.6, 150],
      ['F', 'P', 25, 0.4, 300],
    ]),
  run('Q8', 'qualifying', 'GRANDSTAND', { ms: 56, loss: 1, mbps: 200 },
    { P: [330, 318], T: [849, 295], A: [757, 136], B: [714, 254], C: [629, 112], D: [576, 298], E: [498, 313], F: [403, 108] }, [
      ['T', 'A', 30, 0.2, 1000],
      ['T', 'B', 13, 0.3, 300],
      ['B', 'D', 17, 0.2, 200],
      ['A', 'D', 13, 0.1, 200],
      ['A', 'C', 10, 0.1, 300],
      ['D', 'E', 12, 0.2, 600],
      ['D', 'F', 11, 0.1, 300],
      ['C', 'E', 9, 0.3, 400],
      ['C', 'F', 21, 0.1, 300],
      ['E', 'P', 14, 0.2, 400],
      ['F', 'P', 11, 0.8, 1000],
    ]),
  run('Q9', 'qualifying', 'TETRE ROUGE EXIT', { ms: 65, loss: 1.3, mbps: 250 },
    { P: [330, 318], T: [879, 324], A: [763, 209], B: [764, 290], C: [548, 314], D: [589, 201], E: [430, 98], F: [409, 228] }, [
      ['T', 'A', 18, 0.4, 300],
      ['T', 'B', 25, 0.3, 800],
      ['B', 'D', 10, 0.2, 800],
      ['B', 'C', 27, 0.2, 600],
      ['A', 'D', 16, 1.2, 600],
      ['D', 'F', 12, 0.6, 300],
      ['C', 'F', 12, 0.2, 1000],
      ['C', 'E', 16, 1.2, 1000],
      ['E', 'F', 28, 1.5, 800],
      ['E', 'P', 24, 0.2, 400],
      ['F', 'P', 16, 0.1, 250],
    ]),
  run('Q10', 'qualifying', 'FORET', { ms: 75, loss: 1.2, mbps: 200 },
    { P: [330, 318], T: [881, 274], A: [756, 199], B: [721, 308], C: [595, 334], D: [594, 97], E: [411, 99], F: [411, 255] }, [
      ['T', 'A', 12, 0.2, 300],
      ['T', 'B', 19, 0.6, 300],
      ['A', 'C', 17, 0.1, 1000],
      ['A', 'D', 22, 0.6, 250],
      ['B', 'D', 24, 1.5, 300],
      ['D', 'F', 19, 0.2, 600],
      ['D', 'E', 26, 1, 1000],
      ['C', 'F', 20, 1.5, 1000],
      ['E', 'F', 11, 0.1, 1000],
      ['E', 'P', 11, 0.1, 800],
      ['F', 'P', 26, 0.1, 400],
    ]),
];

/** The four original runs: used by the tutorial and when no draw is supplied. */
export const SECTIONS: Section[] = SECTION_BANK.slice(0, 4);

// ---------------------------------------------------------------- MODULE C
export const QUALITY_PROFILES: QualityProfile[] = [
  { id: '4K', label: '4K', mbps: 25, latencyMs: 700 },
  { id: '1080', label: '1080p', mbps: 8, latencyMs: 350 },
  { id: '720', label: '720p', mbps: 3, latencyMs: 120 },
];

/**
 * Three race laps, each a bank of 15 variants (the first three of each are the originals, the rest were generated by a solver search). A seed picks one variant per lap (logic.ts `pickStints`),
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
    lap('dry-d', 'DRY', 'LAP 1 · FORMATION', 2, 3.4, 0.8, 'mulsanne', cap(28, 40, 30), 240, 1000),
    lap('dry-e', 'DRY', 'LAP 1 · SUNRISE', 2, 4, 0.6, 'mulsanne', cap(34, 34, 22), 180, 1000),
    lap('dry-f', 'DRY', 'LAP 1 · GRID WALK', 2, 4.2, 1, 'pit', cap(38, 36, 32), 420, 1000),
    lap('dry-g', 'DRY', 'LAP 1 · PIT OPEN', 2, 3, 1.2, 'pit', cap(52, 48, 28), 360, 800),
    lap('dry-h', 'DRY', 'LAP 1 · CLOUDS', 2, 4, 1, 'pit', cap(36, 36, 20), 360, 900),
    lap('dry-i', 'DRY', 'LAP 1 · DRY LINE', 2, 3, 0.8, 'pit', cap(54, 32, 32), 180, 800),
    lap('dry-j', 'DRY', 'LAP 1 · TYRE TEST', 2, 3.8, 0.6, 'mulsanne', cap(28, 34, 30), 300, 900),
    lap('dry-k', 'DRY', 'LAP 1 · SIGHTING', 2, 2.8, 1, 'mulsanne', cap(32, 50, 24), 360, 900),
    lap('dry-l', 'DRY', 'LAP 1 · OUT-LAP', 2, 3.8, 1.2, 'mulsanne', cap(46, 32, 20), 360, 900),
    lap('dry-m', 'DRY', 'LAP 1 · GREEN FLAG', 2, 2.8, 0.8, 'mulsanne', cap(32, 40, 24), 360, 800),
    lap('dry-n', 'DRY', 'LAP 1 · FIRST LIGHT', 2, 2.8, 1.2, 'mulsanne', cap(46, 34, 26), 360, 800),
    lap('dry-o', 'DRY', 'LAP 1 · WARM TRACK', 2, 2.6, 1.4, 'mulsanne', cap(32, 40, 24), 240, 800),
  ],
  [
    lap('rain-a', 'RAIN', 'LAP 2 · HEAVY RAIN', 1, 2.0, 0.6, 'mulsanne', cap(48, 52, 28), 240, 1200),
    lap('rain-b', 'RAIN', 'LAP 2 · NIGHT RAIN', 1, 1.6, 0.6, 'pit', cap(54, 42, 22), 360, 1300),
    lap('rain-c', 'RAIN', 'LAP 2 · SPRAY', 1, 1.4, 0.4, 'mulsanne', cap(34, 54, 24), 420, 1300),
    lap('rain-d', 'RAIN', 'LAP 2 · DRIZZLE', 1, 2.2, 0.6, 'pit', cap(50, 50, 22), 240, 1300),
    lap('rain-e', 'RAIN', 'LAP 2 · STORM FRONT', 1, 1.2, 1, 'mulsanne', cap(52, 30, 24), 420, 1300),
    lap('rain-f', 'RAIN', 'LAP 2 · WET LINE', 1, 1.4, 0.8, 'mulsanne', cap(52, 46, 26), 420, 1300),
    lap('rain-g', 'RAIN', 'LAP 2 · FOG', 1, 1.6, 1, 'mulsanne', cap(52, 46, 28), 240, 1200),
    lap('rain-h', 'RAIN', 'LAP 2 · PUDDLES', 1, 1.6, 0.6, 'pit', cap(38, 42, 34), 240, 1300),
    lap('rain-i', 'RAIN', 'LAP 2 · MIST', 1, 1.8, 0.8, 'mulsanne', cap(48, 46, 20), 180, 1200),
    lap('rain-j', 'RAIN', 'LAP 2 · SLICK PATCH', 1, 1.4, 0.8, 'pit', cap(40, 44, 20), 300, 1200),
    lap('rain-k', 'RAIN', 'LAP 2 · CLOUDBURST', 1, 1.4, 0.6, 'pit', cap(44, 50, 32), 360, 1200),
    lap('rain-l', 'RAIN', 'LAP 2 · AQUAPLANE', 1, 1.4, 0.8, 'pit', cap(46, 46, 28), 360, 1300),
    lap('rain-m', 'RAIN', 'LAP 2 · RAIN DELAY', 1, 1.6, 1, 'mulsanne', cap(48, 52, 26), 300, 1300),
    lap('rain-n', 'RAIN', 'LAP 2 · SAFETY CAR', 1, 1.4, 0.6, 'pit', cap(56, 42, 34), 180, 1100),
    lap('rain-o', 'RAIN', 'LAP 2 · DAMP', 1, 2, 0.4, 'mulsanne', cap(38, 50, 24), 240, 1200),
  ],
  [
    lap('final-a', 'FINAL', 'LAP 3 · CHEQUERED FLAG', 1, 2.0, 0.6, 'pit', cap(48, 46, 26), 360, 1300),
    lap('final-b', 'FINAL', 'LAP 3 · LAST STINT', 1, 1.2, 0.4, 'mulsanne', cap(36, 52, 20), 180, 1000),
    lap('final-c', 'FINAL', 'LAP 3 · RESTART', 1, 1.2, 1.0, 'pit', cap(46, 48, 34), 240, 1200),
    lap('final-d', 'FINAL', 'LAP 3 · FINAL HOUR', 1, 1.6, 0.6, 'pit', cap(36, 48, 22), 300, 1200),
    lap('final-e', 'FINAL', 'LAP 3 · DOUBLE FILE', 1, 1.6, 0.6, 'pit', cap(44, 48, 32), 180, 1300),
    lap('final-f', 'FINAL', 'LAP 3 · LAST LAP', 1, 1.4, 1, 'mulsanne', cap(52, 52, 30), 300, 1300),
    lap('final-g', 'FINAL', 'LAP 3 · NIGHT FINISH', 1, 1.4, 0.6, 'pit', cap(54, 36, 34), 300, 1200),
    lap('final-h', 'FINAL', 'LAP 3 · PIT RUSH', 1, 1.2, 0.6, 'mulsanne', cap(34, 46, 32), 300, 1200),
    lap('final-i', 'FINAL', 'LAP 3 · FUEL SAVE', 1, 1.4, 0.8, 'mulsanne', cap(48, 48, 20), 300, 1300),
    lap('final-j', 'FINAL', 'LAP 3 · TOP SPEED', 1, 1.6, 0.6, 'mulsanne', cap(56, 56, 28), 360, 1200),
    lap('final-k', 'FINAL', 'LAP 3 · PHOTO FINISH', 1, 1.4, 0.8, 'pit', cap(34, 48, 24), 420, 1300),
    lap('final-l', 'FINAL', 'LAP 3 · VICTORY LAP', 1, 1.8, 0.6, 'mulsanne', cap(48, 36, 22), 240, 1200),
    lap('final-m', 'FINAL', 'LAP 3 · CHASE PACK', 1, 1.2, 0.8, 'mulsanne', cap(50, 30, 32), 300, 1200),
    lap('final-n', 'FINAL', 'LAP 3 · LEAD CHANGE', 1, 1.2, 0.4, 'mulsanne', cap(28, 50, 24), 240, 1100),
    lap('final-o', 'FINAL', 'LAP 3 · SPRINT', 1, 1.8, 0.6, 'pit', cap(28, 56, 28), 180, 1100),
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
