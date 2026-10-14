import type { StageSpec } from './types';

/** Points for a stage: equal share per correct command; Hint 1 takes `hint1Cost` of the stage's points; Hint 2 zeroes the stage. */
export function stageScore(spec: StageSpec, correct: number, hint: 0 | 1 | 2, hint1Cost = 0.4): number {
  if (hint >= 2) return 0;
  const raw = (spec.points * Math.max(0, Math.min(correct, spec.commands))) / spec.commands;
  return Math.round(raw * (hint === 1 ? 1 - hint1Cost : 1) * 100) / 100;
}
