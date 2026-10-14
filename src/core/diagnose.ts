export interface ModuleStat {
  id: string
  label: string
  score: number
  max: number
  seconds: number
  /** Expected time for a clean run, used to flag slow modules. */
  par: number
  wrong: number
  hints: number
  /** Short item tags for the worst moments, e.g. "Q2 H2", "S3 WRONG". */
  flags: string[]
}

export interface Diagnosis {
  /** Module to practise next, or null when the run was clean. */
  focus: ModuleStat | null
  /** 0 = clean, higher = more trouble. */
  trouble: Record<string, number>
}

/** Trouble score: lost points weigh most, then hints, wrong tries and time over par. */
export function diagnose(stats: ModuleStat[]): Diagnosis {
  const trouble: Record<string, number> = {}
  for (const s of stats) {
    const lost = s.max > 0 ? 1 - s.score / s.max : 0
    const slow = s.par > 0 ? Math.max(0, s.seconds / s.par - 1) : 0
    trouble[s.id] = lost * 3 + s.hints * 0.8 + s.wrong * 0.5 + slow * 1.5
  }
  const worst = [...stats].sort((a, b) => trouble[b.id] - trouble[a.id])[0]
  return { focus: worst && trouble[worst.id] >= 0.8 ? worst : null, trouble }
}

export const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
