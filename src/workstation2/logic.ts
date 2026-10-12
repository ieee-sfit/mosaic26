import { LOOKUP_STEPS, MATRIX, QUALITY_PROFILES, QUESTION_BANK, STATION2_CONFIG } from './mockStation2Data';
import type { LookupStep, QuizQuestion, Stint } from './types';

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

export function questionPoints(
  hint1: boolean, hint2: boolean, wrong: number,
): number {
  const base = STATION2_CONFIG.moduleMax.A / STATION2_CONFIG.questionsPerRun;
  if (hint2) return 0;
  const frac = 1 - (hint1 ? STATION2_CONFIG.hintPenalty.hint1 : 0) - wrong * STATION2_CONFIG.wrongAnswerPenalty;
  return Math.max(0, Math.round(base * frac * 100) / 100);
}

// ---- Module B lookups
export function resolveStep(step: LookupStep, prevAnswer: string | null) {
  const f = step.find;
  let value: string | number | null = f.value ?? null;
  if (f.fromPrev) {
    if (prevAnswer == null) return null;
    const n = Number(prevAnswer);
    value = f.offset !== undefined && !Number.isNaN(n) ? n + f.offset : prevAnswer;
  }
  const row = MATRIX.find((r) => String(r[f.column]).toUpperCase() === String(value).toUpperCase());
  return { value, row: row ?? null, answer: row ? String(row[step.read]) : null };
}

export function expectedAnswer(step: LookupStep, prevAnswer: string | null): string | null {
  return resolveStep(step, prevAnswer)?.answer ?? null;
}

export function describeStep(step: LookupStep, prevAnswer: string | null): string {
  const r = resolveStep(step, prevAnswer);
  const f = step.find;
  let target: string;
  if (f.fromPrev) {
    if (!r) target = '[PREVIOUS STEP RESULT]';
    else target = f.offset !== undefined
      ? `${prevAnswer} ${f.offset >= 0 ? '+' : '−'} ${Math.abs(f.offset)} = ${r.value}`
      : String(r.value);
  } else target = String(f.value);
  return `FIND ROW WHERE ${f.column} = ${target}  ▸  READ ${step.read}`;
}

export function stepsOfProblem(p: 1 | 2) {
  return LOOKUP_STEPS.filter((s) => s.problem === p);
}

// ---- Module C balancer
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
    { id: 'mulsanne', label: 'MULSANNE STRAIGHT', load: mul, cap: stint.capacity.mulsanne, active: true },
    { id: 'arnage', label: 'ARNAGE BACKUP', load: arn, cap: stint.capacity.arnage, active: c.divert },
    { id: 'pit', label: 'PIT STRAIGHT', load: pit, cap: stint.capacity.pit, active: true },
  ].map((n) => ({ ...n, util: n.load / n.cap }));

  const worstUtil = Math.max(...nodes.filter((n) => n.active).map((n) => n.util));
  const queue = cfg.queueBaseMs / Math.max(0.01, 1 - Math.min(worstUtil, 0.99));
  const latency = Math.round(stint.baseLatencyMs + prof.latencyMs + queue + (c.divert ? cfg.relayHopMs : 0));

  const latencyOk = latency < cfg.latencyLimitMs;
  const capacityOk = nodes.every((n) => !n.active || n.util < cfg.utilLimit);
  const qualityOk = c.qualityIdx <= stint.worstQualityIdx;
  const locked = latencyOk && capacityOk && qualityOk;

  // 0 (perfect) .. 1 (meltdown): drives waveform noise and tach strain
  const severity = locked ? 0 : Math.min(1,
    Math.max(0, (worstUtil - cfg.utilLimit) / 0.4) * 0.6 +
    Math.max(0, (latency - cfg.latencyLimitMs) / 1500) * 0.4 + (qualityOk ? 0 : 0.2) + 0.1);

  return { nodes, latency, latencyOk, capacityOk, qualityOk, locked, severity, worstUtil };
}

export function fmt(n: number, d = 1) {
  return Number.isInteger(n) ? String(n) : n.toFixed(d);
}
export function mmss(sec: number) {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
