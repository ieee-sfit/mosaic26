/**
 * One scoring contract for every station:
 *   raw_score = base (0-100) + speed bonus (0-20, only when all three modules are cleared)  -> 0..120
 * Station 1 reports on a 0-1000 scale and is rescaled here; the others already report on 0-100.
 */
export const SCORING = {
  baseMax: 100,
  speedBonusMax: 20,
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
  secondsRemaining: number
  endReason: 'COMPLETE' | 'TIME_EXPIRED' | 'HULL_BREACH'
}

/** Station 1 payload -> normalized { raw_score, time_left } on the shared 0-120 scale. */
export function normalizeStation1(p: Station1Payload): { raw_score: number; time_left: number } {
  const base = p.maxTotal > 0 ? (p.total / p.maxTotal) * SCORING.baseMax : 0
  const bonus = speedBonus(p.secondsRemaining, p.endReason === 'COMPLETE', base)
  return { raw_score: Math.round(base + bonus), time_left: p.secondsRemaining }
}
