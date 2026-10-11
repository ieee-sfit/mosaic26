import type { LookupProblemDef, TelemetrySheet } from '../types';

/** Case/punctuation-insensitive compare key: "u-07" and "U07" are the same answer. */
export const normalizeAnswer = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Returns the cell in `readColumn` of the row whose `matchColumn` equals `key`, or null. */
export function lookupCell(
  sheet: TelemetrySheet,
  matchColumn: number,
  readColumn: number,
  key: string,
): string | null {
  const target = normalizeAnswer(key);
  const row = sheet.rows.find((r) => normalizeAnswer(r[matchColumn - 1] ?? '') === target);
  return row ? row[readColumn - 1] ?? null : null;
}

/** Walks a problem's chain and returns the expected answer for every step. */
export function resolveProblem(sheet: TelemetrySheet, problem: LookupProblemDef): string[] {
  const answers: string[] = [];
  let key = problem.seed;
  for (const step of problem.steps) {
    const next = lookupCell(sheet, step.matchColumn, step.readColumn, key);
    if (next === null) {
      throw new Error(`Problem ${problem.id}: "${key}" not found in column ${step.matchColumn}`);
    }
    answers.push(next);
    key = next;
  }
  return answers;
}

/** Dev-time sanity check for swapped-in datasets. Returns a list of problems (empty = OK). */
export function validateSheet(sheet: TelemetrySheet, problems: LookupProblemDef[]): string[] {
  const issues: string[] = [];
  sheet.columns.forEach((col, i) => {
    const cells = sheet.rows.map((r) => normalizeAnswer(r[i] ?? ''));
    if (new Set(cells).size !== cells.length) issues.push(`Column ${col.index} has duplicate values`);
  });
  for (const p of problems) {
    try {
      const answers = resolveProblem(sheet, p);
      if (new Set(answers.map(normalizeAnswer)).size !== answers.length) {
        issues.push(`Problem ${p.id}: repeated answers in chain`);
      }
    } catch (e) {
      issues.push((e as Error).message);
    }
  }
  return issues;
}
