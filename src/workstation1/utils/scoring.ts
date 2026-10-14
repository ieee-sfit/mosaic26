import type { QuestionResult, RoundResult, ScoringConfig, StepResult } from '../types';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Hint 2 forfeits everything; Hint 1 costs a flat fraction; wrong picks cost extra. */
export function scoreQuestion(
  cfg: ScoringConfig['moduleA'],
  hintsUsed: 0 | 1 | 2,
  wrongAttempts: number,
): number {
  if (hintsUsed === 2) return 0;
  const lost = (hintsUsed === 1 ? cfg.hint1Penalty : 0) + wrongAttempts * cfg.wrongAttemptPenalty;
  return round2(cfg.pointsPerQuestion * clamp01(1 - lost));
}

/** One diagnose-and-fix step of Module B: `stepIndex` picks its 7 / 7 / 6 points. */
export function scoreStep(cfg: ScoringConfig['moduleB'], stepIndex: number, wrongAttempts: number, hintsUsed: 0 | 1 | 2 = 0): number {
  if (hintsUsed === 2) return 0;
  const lost = (hintsUsed === 1 ? cfg.hint1Penalty : 0) + wrongAttempts * cfg.wrongAttemptPenalty;
  return round2(cfg.stepPoints[stepIndex] * clamp01(1 - lost));
}

export function scoreRound(cfg: ScoringConfig['moduleC'], misses: number, hintsUsed: 0 | 1 | 2 = 0): number {
  if (hintsUsed === 2) return 0;
  const lost = (hintsUsed === 1 ? cfg.hint1Penalty : 0) + misses * cfg.missPenalty;
  return round2(cfg.pointsPerRound * clamp01(1 - lost));
}

export const sum = (xs: { points: number }[]) => xs.reduce((a, x) => a + x.points, 0);

export function maxTotals(cfg: ScoringConfig) {
  const a = cfg.moduleA.questionCount * cfg.moduleA.pointsPerQuestion;
  const b = cfg.moduleB.waves * cfg.moduleB.stepPoints.reduce((n, p) => n + p, 0);
  const c = 3 * cfg.moduleC.pointsPerRound;
  return { a, b, c, total: a + b + c };
}

export function gradeFor(total: number, max: number): string {
  const r = max === 0 ? 0 : total / max;
  if (r >= 0.9) return 'S';
  if (r >= 0.75) return 'A';
  if (r >= 0.55) return 'B';
  if (r >= 0.35) return 'C';
  return 'D';
}

export type AnyResult = QuestionResult | StepResult | RoundResult;
