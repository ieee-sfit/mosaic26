import { QUALITY_PROFILES, QUESTION_BANK, STATION2_CONFIG } from './mockStation2Data';
import type { Beam, QuizQuestion, Section, Stint } from './types';

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick N questions, preferring distinct cheat-sheet columns, with shuffled options. */
export function pickQuestions(n = STATION2_CONFIG.questionsPerRun): QuizQuestion[] {
  const pool = shuffle(QUESTION_BANK);
  const picked: QuizQuestion[] = [];
  for (const item of pool) {
    if (picked.length >= n) break;
    if (!picked.some((p) => p.column === item.column)) picked.push(item);
  }
  for (const item of pool) {
    if (picked.length >= n) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.map((item) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      ...item,
      options: order.map((i) => item.options[i]) as QuizQuestion['options'],
      correct: order.indexOf(item.correct),
    };
  });
}

/** Points an item is worth after hints and wrong tries: Hint 2 = 0, Hint 1 = -40%, each wrong try = -20%. */
export function itemPoints(base: number, hint: 0 | 1 | 2, wrong: number): number {
  if (hint >= 2) return 0;
  const frac = 1 - (hint >= 1 ? STATION2_CONFIG.hintPenalty.hint1 : 0) - wrong * STATION2_CONFIG.wrongAnswerPenalty;
  return Math.max(0, Math.round(base * frac * 100) / 100);
}

// ---------------------------------------------------------------- Module B: route builder
export interface Metrics { ms: number; loss: number; mbps: number }
export interface Verdict { lat: boolean; loss: boolean; bw: boolean; ok: boolean }

const beamKey = (a: string, b: string) => (a < b ? `${a}${b}` : `${b}${a}`);
const beamOf = (s: Section, a: string, b: string): Beam | undefined => s.beams.find((x) => beamKey(x.a, x.b) === beamKey(a, b));

/** Sites that have a beam to `id`. */
export const neighbours = (s: Section, id: string): string[] =>
  s.beams.filter((b) => b.a === id || b.b === id).map((b) => (b.a === id ? b.b : b.a));

/**
 * Totals for a route (an ordered list of sites, T first):
 * latency adds, loss compounds (1 - product of what survives each beam), bandwidth is the narrowest beam.
 * A route with no beam yet has zero latency and loss and unlimited bandwidth (shown as the tower's best).
 */
export function metricsOf(s: Section, route: string[]): Metrics {
  let ms = 0;
  let keep = 1;
  let mbps = Infinity;
  for (let i = 0; i + 1 < route.length; i++) {
    const b = beamOf(s, route[i], route[i + 1]);
    if (!b) continue;
    ms += b.ms;
    keep *= 1 - b.loss / 100;
    mbps = Math.min(mbps, b.mbps);
  }
  return { ms, loss: Math.round((1 - keep) * 10000) / 100, mbps };
}

/** Each NEED line separately, then all together. Bandwidth only counts when the lap scores it. */
export function verdictOf(s: Section, m: Metrics): Verdict {
  const lat = m.ms <= s.need.ms;
  const loss = m.loss <= s.need.loss;
  const bw = s.need.mbps === null || m.mbps >= s.need.mbps;
  return { lat, loss, bw, ok: lat && loss && bw };
}

/** Every simple route from T to P. */
export function allRoutes(s: Section): string[][] {
  const out: string[][] = [];
  const walk = (route: string[]) => {
    const last = route[route.length - 1];
    if (last === 'P') { out.push(route.slice()); return; }
    for (const n of neighbours(s, last)) {
      if (route.includes(n)) continue;
      route.push(n);
      walk(route);
      route.pop();
    }
  };
  walk(['T']);
  return out;
}

/** Routes that meet every NEED line (the rule-based answer set). */
export const validRoutes = (s: Section): string[][] => allRoutes(s).filter((r) => verdictOf(s, metricsOf(s, r)).ok);

/** A route Hint 2 can send (fewest hops among the valid ones). Null only if a section was authored without an answer. */
export function solveSection(s: Section): string[] | null {
  return validRoutes(s).sort((a, b) => a.length - b.length)[0] ?? null;
}

export const fmtMs = (n: number) => `${Math.round(n)} ms`;
export const fmtLoss = (n: number) => `${n.toFixed(2).replace(/0$/, '')}%`;
export const fmtMbps = (n: number) => (Number.isFinite(n) ? `${Math.round(n)}` : '--');

// ---------------------------------------------------------------- Module C: balancer
export interface Controls { split: number; qualityIdx: number; divert: boolean }

/** Whole percent, rounded down so a displayed 80% is never shown as passing the 80% limit. */
export const pctOf = (u: number) => Math.floor(u * 100 + 1e-9);

export function simulate(stint: Stint, c: Controls) {
  const prof = QUALITY_PROFILES[c.qualityIdx];
  const cfg = STATION2_CONFIG;
  const s = c.split / 100;
  const base = stint.viewersM * prof.mbps;
  const spike = stint.spikeM * prof.mbps;
  let mul = base * s;
  let pit = base * (1 - s);
  let arn = 0;
  if (c.divert) arn = spike;
  else if (stint.spikeTarget === 'mulsanne') mul += spike;
  else pit += spike;

  const nodes = [
    { id: 'mulsanne', label: 'MULSANNE', load: mul, cap: stint.capacity.mulsanne, active: true },
    { id: 'arnage', label: 'BACKUP RELAY', load: arn, cap: stint.capacity.arnage, active: c.divert },
    { id: 'pit', label: 'PIT STRAIGHT', load: pit, cap: stint.capacity.pit, active: true },
  ].map((n) => ({ ...n, util: n.load / n.cap }));

  const worstUtil = Math.max(...nodes.filter((n) => n.active).map((n) => n.util));
  const queue = cfg.queueBaseMs / Math.max(0.01, 1 - Math.min(worstUtil, 0.99));
  const latency = Math.round(stint.baseLatencyMs + prof.latencyMs + queue + (c.divert ? cfg.relayHopMs : 0));

  const latencyOk = latency < stint.latencyLimitMs;
  const capacityOk = nodes.every((n) => !n.active || n.util < cfg.utilLimit);
  const qualityOk = c.qualityIdx <= stint.worstQualityIdx;
  const locked = latencyOk && capacityOk && qualityOk;
  return { nodes, latency, latencyOk, capacityOk, qualityOk, locked, worstUtil, worstPct: pctOf(worstUtil) };
}

/** Finds a control setting that locks the stint (Hint 2 uses it; solves for 0 points). */
export function solveStint(stint: Stint): Controls | null {
  for (const divert of [false, true]) {
    for (let qualityIdx = 0; qualityIdx < QUALITY_PROFILES.length; qualityIdx++) {
      for (let split = 0; split <= 100; split++) {
        const c = { split, qualityIdx, divert };
        if (simulate(stint, c).locked) return c;
      }
    }
  }
  return null;
}

export const fmt = (n: number, d = 1) => (Number.isInteger(n) ? String(n) : n.toFixed(d));
export const mmss = (sec: number) => {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
