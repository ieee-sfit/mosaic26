/**
 * One scoring contract for every station:
 *   raw_score = base (0-100) + speed bonus (0-20, only when all three modules are cleared) + bonus module D (0-20)  -> 0..140
 * Module D ("final push") is an optional round offered after the three modules; it never counts toward the base or the letter grade.
 * Station 1 reports its own payload (points on a base of `maxTotal`, normally 100) and is rescaled here; the others already report on 0-100.
 */
export const SCORING = {
  baseMax: 100,
  speedBonusMax: 20,
  bonusModuleMax: 20, // optional Module D, offered after all three modules are cleared
  rawMax: 140, // base 100 + speed bonus 20 + Module D 20; the server (submit_run) and the leaderboard cap at this
  totalSeconds: 720,
  hint1Penalty: 0.4, // fraction of the question's points
  hint2Penalty: 1.0, // answer revealed and auto-submitted, 0 points
} as const

/**
 * Speed bonus (0-20): only when all three modules are cleared, and scaled by the share of the base score earned,
 * so auto-solving everything with Hint 2 cannot farm a bonus.
 */
export const speedBonus = (secondsLeft: number, cleared: boolean, base: number = SCORING.baseMax): number =>
  cleared
    ? Math.floor(
        SCORING.speedBonusMax *
          (Math.max(0, secondsLeft) / SCORING.totalSeconds) *
          (Math.max(0, Math.min(base, SCORING.baseMax)) / SCORING.baseMax),
      )
    : 0

export interface Station1Payload {
  total: number
  maxTotal: number
  /** Time left when Module C ended (frozen: playing Module D never changes it). */
  secondsRemaining: number
  endReason: 'COMPLETE' | 'TIME_EXPIRED' | 'HULL_BREACH'
  /** Bonus Module D points (0-20). Absent or 0 when D was skipped or never offered. */
  scoreD?: number
}

/**
 * Station 1 payload -> normalized { raw_score, time_left } on the shared scale:
 * base (total / maxTotal * 100) + speed bonus (frozen at Module C's end) + Module D, range 0..140.
 * D only counts on a COMPLETE run and is clamped to the bonus maximum.
 */
export function normalizeStation1(p: Station1Payload): { raw_score: number; time_left: number } {
  const base = p.maxTotal > 0 ? (p.total / p.maxTotal) * SCORING.baseMax : 0
  const complete = p.endReason === 'COMPLETE'
  const bonus = speedBonus(p.secondsRemaining, complete, base)
  const d = complete ? Math.max(0, Math.min(SCORING.bonusModuleMax, p.scoreD ?? 0)) : 0
  return { raw_score: Math.round((base + bonus + d) * 100) / 100, time_left: p.secondsRemaining }
}

/** Letter rating from the base score (0-100), same bands on every station. */
export function gradeFor(base: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  const r = base / SCORING.baseMax
  if (r >= 0.9) return 'S'
  if (r >= 0.75) return 'A'
  if (r >= 0.55) return 'B'
  if (r >= 0.35) return 'C'
  return 'D'
}
