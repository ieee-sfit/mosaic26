/**
 * Module D // CODE BREAKER: pure model of the demolition charges. No React, no DOM.
 *
 * A charge is a relay circuit between the battery and the detonator, driven by n bit switches B1..Bn.
 *   - a RUNG is a set of side-by-side contacts: current passes the rung when ANY contact conducts (OR)
 *   - the rungs sit one after another in a row: current reaches the detonator only when EVERY rung passes (AND)
 *   - a contact is written as a signed bit number: +k conducts when Bk = 1, -k (a NOT contact) conducts when Bk = 0
 * So a charge is a list of rungs, each rung a list of signed bit numbers, e.g. [[1], [-1, 2], [-2, 3]].
 * Bit k is stored at index k - 1 of the player's code array.
 */

export const contactOn = (c, bits) => (c > 0 ? bits[c - 1] === 1 : bits[-c - 1] === 0)
export const rungOn = (rung, bits) => rung.some((c) => contactOn(c, bits))
export const rungsOn = (charge, bits) => charge.rungs.map((r) => rungOn(r, bits))
export const conducts = (charge, bits) => rungsOn(charge, bits).every(Boolean)

/** How far the current gets: the number of leading rungs that pass (all of them = reaches the detonator). */
export const reach = (charge, bits) => {
  const on = rungsOn(charge, bits)
  const open = on.indexOf(false)
  return open < 0 ? on.length : open
}

const allCodes = (n) => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, k) => (m >> (n - 1 - k)) & 1))

/** Every code that makes the charge conduct. */
export const solutions = (charge) => allCodes(charge.bits).filter((b) => conducts(charge, b))
export const solutionOf = (charge) => solutions(charge)[0]

/** The same charge with one rung removed (or one contact removed from a rung). */
const withoutRung = (charge, i) => ({ ...charge, rungs: charge.rungs.filter((_, k) => k !== i) })
const withoutContact = (charge, i, j) => ({ ...charge, rungs: charge.rungs.map((r, k) => (k === i ? r.filter((_, m) => m !== j) : r)) })

/**
 * Unit propagation, the only inference a player needs: a rung left with one open contact fixes that bit; a rung already
 * passed by a fixed bit is finished; a contact already dead is crossed out. Returns the bits it settled (null = unknown).
 */
export function propagate(charge) {
  const val = Array(charge.bits).fill(null)
  let moved = true
  while (moved) {
    moved = false
    for (const rung of charge.rungs) {
      if (rung.some((c) => (c > 0 ? val[c - 1] === 1 : val[-c - 1] === 0))) continue // rung already passed
      const live = rung.filter((c) => (c > 0 ? val[c - 1] !== 0 : val[-c - 1] !== 1))
      if (live.length === 0) return { val, contradiction: true }
      if (live.length === 1) {
        const c = live[0]
        const bit = Math.abs(c) - 1
        const want = c > 0 ? 1 : 0
        if (val[bit] === null) { val[bit] = want; moved = true }
      }
    }
  }
  return { val, contradiction: false }
}

/**
 * Proves one charge is fair:
 *  1. exactly one code makes the current reach the detonator
 *  2. every rung is needed: take any rung away and the code is no longer unique
 *  3. every contact is needed: in the answer each rung passes through exactly one contact (take that one out and the answer
 *     is gone); the other contacts of the rung are the decoys the player has to rule out by logic
 *  4. no single rung is enough on its own to give the code
 *  5. pure logic solves it: unit propagation alone settles every bit (no guessing)
 *  6. every bit is used, the code is not all-0 or all-1, and no rung repeats a bit
 * Returns { ok, problems[], solution }.
 */
export function verifyCharge(charge) {
  const problems = []
  const sols = solutions(charge)
  if (sols.length !== 1) problems.push(`${sols.length} solutions (need exactly 1)`)
  const sol = sols[0]

  charge.rungs.forEach((_, i) => {
    const rest = withoutRung(charge, i)
    if (solutions(rest).length === 1) problems.push(`rung ${i + 1} is not needed (answer is still unique without it)`)
  })
  charge.rungs.forEach((r, i) => {
    const through = sol ? r.filter((c) => contactOn(c, sol)).length : 0
    if (through !== 1) problems.push(`rung ${i + 1} passes through ${through} contacts in the answer (need exactly 1)`)
    r.forEach((c, j) => {
      if (r.length > 1 && sol && contactOn(c, sol) && solutions(withoutContact(charge, i, j)).length !== 0) {
        problems.push(`contact ${c} in rung ${i + 1} is not needed`)
      }
    })
  })
  charge.rungs.forEach((r, i) => {
    const alone = { ...charge, rungs: [r] }
    const n = solutions(alone).length
    if (n === 1) problems.push(`rung ${i + 1} alone is enough`)
    if (new Set(r.map(Math.abs)).size !== r.length) problems.push(`rung ${i + 1} repeats a bit`)
  })
  const used = new Set(charge.rungs.flat().map(Math.abs))
  for (let k = 1; k <= charge.bits; k++) if (!used.has(k)) problems.push(`bit ${k} is never used`)
  const p = propagate(charge)
  if (p.contradiction || p.val.some((v) => v === null)) problems.push('logic alone does not settle every bit (guessing needed)')
  else if (sol && p.val.join('') !== sol.join('')) problems.push('propagation disagrees with the brute-force solution')
  if (sol && (sol.every((b) => b === 0) || sol.every((b) => b === 1))) problems.push('code is all 0 or all 1')

  return { ok: problems.length === 0, problems, solution: sol }
}

// ---------------------------------------------------------------------------
// Scoring, hints and variant picking
// ---------------------------------------------------------------------------
const round2 = (n) => Math.round(n * 100) / 100

/** Points a charge is worth: each wrong ARM costs 20% of its points, Hint 1 costs 40%, Hint 2 leaves 0. Never below 0. */
export function chargePoints(base, { wrong, hint }, cfg) {
  if (hint >= 2) return 0
  const frac = wrong * cfg.wrongPenaltyFraction + (hint >= 1 ? cfg.hint1PenaltyFraction : 0)
  return round2(base * Math.max(0, 1 - frac))
}

/** Hint 1: the next bit the player has not set correctly yet (lowest number first), or null when the code is already right. */
export function nextWrongBit(charge, bits, revealed = []) {
  const sol = solutionOf(charge)
  const i = sol.findIndex((v, k) => bits[k] !== v && !revealed.includes(k))
  return i < 0 ? null : i
}

/** Small deterministic PRNG so a seed picks the same variants every time. */
export function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
export function pickVariants(boards, seed) {
  const rnd = mulberry32(seed)
  return boards.map((list) => list[Math.floor(rnd() * list.length)])
}
