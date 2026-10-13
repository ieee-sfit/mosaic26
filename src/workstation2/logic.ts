import { QUALITY_PROFILES, QUESTION_BANK, STATION2_CONFIG } from './mockStation2Data';
import type { Circuit, QuizQuestion, Stint } from './types';

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

// ---------------------------------------------------------------- Module B: channel plan
export type Plan = Record<string, string>; // tower id -> channel

export const anchorsOf = (c: Circuit): Plan =>
  Object.fromEntries(c.towers.filter((t) => t.anchor).map((t) => [t.id, t.anchor as string]));

export const neighbours = (c: Circuit, id: string): string[] =>
  c.links.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

/** Every complete valid plan that extends `fixed` (stops after `limit`). */
export function solutions(c: Circuit, fixed: Plan, limit = 64): Plan[] {
  const out: Plan[] = [];
  const free = c.towers.filter((t) => !(t.id in fixed));
  const walk = (i: number, plan: Plan) => {
    if (out.length >= limit) return;
    if (i === free.length) { out.push({ ...plan }); return; }
    const t = free[i];
    for (const ch of t.allowed) {
      if (neighbours(c, t.id).some((n) => plan[n] === ch)) continue;
      plan[t.id] = ch;
      walk(i + 1, plan);
      delete plan[t.id];
    }
  };
  walk(0, { ...fixed });
  return out;
}

export type LockResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'clash' | 'dead'; with?: string };

/**
 * Rule-based check, not a single answer key: a lock is accepted when the channel is on the tower's sheet row,
 * no linked tower already holds it, and the rest of the circuit can still be completed.
 */
export function checkLock(c: Circuit, plan: Plan, towerId: string, ch: string): LockResult {
  const t = c.towers.find((x) => x.id === towerId);
  if (!t || !t.allowed.includes(ch)) return { ok: false, reason: 'unsupported' };
  const clash = neighbours(c, towerId).find((n) => plan[n] === ch);
  if (clash) return { ok: false, reason: 'clash', with: clash };
  return solutions(c, { ...plan, [towerId]: ch }, 1).length ? { ok: true } : { ok: false, reason: 'dead' };
}

/** A channel Hint 2 can lock for this tower (always completable). */
export function solveTower(c: Circuit, plan: Plan, towerId: string): string | null {
  return solutions(c, plan, 1)[0]?.[towerId] ?? null;
}

// ---------------------------------------------------------------- Module C: balancer
export interface Controls { split: number; qualityIdx: number; divert: boolean }

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
    { id: 'arnage', label: 'ARNAGE RELAY', load: arn, cap: stint.capacity.arnage, active: c.divert },
    { id: 'pit', label: 'PIT STRAIGHT', load: pit, cap: stint.capacity.pit, active: true },
  ].map((n) => ({ ...n, util: n.load / n.cap }));

  const worstUtil = Math.max(...nodes.filter((n) => n.active).map((n) => n.util));
  const queue = cfg.queueBaseMs / Math.max(0.01, 1 - Math.min(worstUtil, 0.99));
  const latency = Math.round(stint.baseLatencyMs + prof.latencyMs + queue + (c.divert ? cfg.relayHopMs : 0));

  const latencyOk = latency < cfg.latencyLimitMs;
  const capacityOk = nodes.every((n) => !n.active || n.util < cfg.utilLimit);
  const qualityOk = c.qualityIdx <= stint.worstQualityIdx;
  const locked = latencyOk && capacityOk && qualityOk;
  return { nodes, latency, latencyOk, capacityOk, qualityOk, locked, worstUtil };
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
