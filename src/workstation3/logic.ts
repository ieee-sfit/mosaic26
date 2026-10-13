/* ==========================================================================
   STATION 3 · pure puzzle logic (no React, no DOM) for Module B (Plate Rebuild)
   and Module D (Sighting Chains). The UI only draws and asks these functions;
   the same functions drive the solver checks that prove every round is
   solvable by logic, has exactly one answer, and has no single-rule shortcut.
   ========================================================================== */
import {
  SLOT_TYPES,
  type Clue,
  type RebuildRound,
  type Sighting,
} from './mockStation3Data';

/** Small deterministic PRNG so a seed always deals the same trays. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededShuffle = <T,>(items: readonly T[], seed: number): T[] => {
  const rnd = mulberry32(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- Module B · Plate Rebuild -------------------------------------- */

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';
export const fitsSlot = (idx: number, glyph: string): boolean => (SLOT_TYPES[idx] === 'D') === isDigit(glyph);

const serial = (plate: string): number[] => plate.slice(6).split('').map(Number);

/** Does a full plate satisfy a witness clue? */
export function clueHolds(c: Clue, plate: string): boolean {
  const s = serial(plate);
  const num = Number(plate.slice(6));
  switch (c.k) {
    case 'alpha': return plate[4] < plate[5];
    case 'before': return plate[4] < c.v;
    case 'after': return plate[4] > c.v;
    case 'gt': return num > c.v;
    case 'lt': return num < c.v;
    case 'odd': return s[3] % 2 === 1;
    case 'even': return s[3] % 2 === 0;
    case 'sum': return s.reduce((n, d) => n + d, 0) === c.v;
  }
}

export function clueText(c: Clue): string {
  switch (c.k) {
    case 'alpha': return 'Series letters are in A→Z order';
    case 'before': return `First series letter is before ${c.v}`;
    case 'after': return `First series letter is after ${c.v}`;
    case 'gt': return `Serial is above ${c.v}`;
    case 'lt': return `Serial is below ${c.v}`;
    case 'odd': return 'Serial ends in an odd digit';
    case 'even': return 'Serial ends in an even digit';
    case 'sum': return `Serial digits add up to ${c.v}`;
  }
}

const withGlyphs = (plate: string, picks: Record<number, string>): string =>
  plate.split('').map((ch, i) => picks[i] ?? ch).join('');

/**
 * Every plate a player could build for this round. `useSlotRule` applies the letter/digit slot types,
 * `clues` is the list of witness clues to apply (defaults to all of the round's clues).
 */
export function rebuildSolutions(round: RebuildRound, opts: { useSlotRule?: boolean; clues?: Clue[] } = {}): string[] {
  const useSlot = opts.useSlotRule ?? true;
  const clues = opts.clues ?? round.clues;
  let combos: Record<number, string>[] = [{}];
  for (const sm of round.smudges) {
    const options = sm.pair.filter((g) => !useSlot || fitsSlot(sm.idx, g));
    combos = combos.flatMap((c) => options.map((g) => ({ ...c, [sm.idx]: g })));
  }
  return combos.map((c) => withGlyphs(round.plate, c)).filter((p) => clues.every((c) => clueHolds(c, p)));
}

/** Number of smudged slots a player's picks get wrong (unfilled slots count as wrong). */
export const wrongSlots = (round: RebuildRound, picks: Record<number, string | undefined>): number =>
  round.smudges.filter((sm) => picks[sm.idx] !== round.plate[sm.idx]).length;

/* ---------- Module D · Sighting Chains ------------------------------------- */

export type Swaps = [boolean, boolean]; // [G2 swapped, G3 swapped] relative to the authored card order

/** The two non-anchor cards of a gantry, in authored order. */
export const gantryCards = (sightings: readonly Sighting[], g: 1 | 2 | 3): [Sighting, Sighting] => {
  const cards = sightings.filter((s) => s.gantry === g);
  return [cards[0], cards[1]];
};

/** The G1 anchor of each row (row 0 = Twin 1, row 1 = Twin 2): the card whose truth matches the row. */
export const anchors = (sightings: readonly Sighting[]): [Sighting, Sighting] => {
  const [x, y] = gantryCards(sightings, 1);
  return x.truth === 0 ? [x, y] : [y, x];
};

/** The three cards (G1 anchor, G2, G3) a row holds when the G2/G3 pairs are swapped or not. */
export function rowCards(sightings: readonly Sighting[], row: 0 | 1, swaps: Swaps): [Sighting, Sighting, Sighting] {
  const [g2a, g2b] = gantryCards(sightings, 2);
  const [g3a, g3b] = gantryCards(sightings, 3);
  const pick = (a: Sighting, b: Sighting, swapped: boolean) => (row === 0 ? (swapped ? b : a) : swapped ? a : b);
  return [anchors(sightings)[row], pick(g2a, g2b, swaps[0]), pick(g3a, g3b, swaps[1])];
}

/** Rule 1: one car never shows two different characters in the same plate position. */
export function platesAgree(cards: readonly Sighting[]): boolean {
  const seen: Record<number, string> = {};
  for (const c of cards) {
    for (const [k, v] of Object.entries(c.reads)) {
      const i = Number(k);
      if (seen[i] !== undefined && seen[i] !== v) return false;
      seen[i] = v as string;
    }
  }
  return true;
}

/** Rule 2: a car changes at most one lane between gantries. */
export const lanesReachable = (cards: readonly Sighting[]): boolean =>
  cards.every((c, i) => i === 0 || Math.abs(c.lane - cards[i - 1].lane) <= 1);

/** Every swap combination that satisfies the chosen rules. The real puzzle uses both rules and must have exactly one. */
export function chainSolutions(sightings: readonly Sighting[], rules: { plates: boolean; lanes: boolean }): Swaps[] {
  const out: Swaps[] = [];
  for (const s2 of [false, true]) {
    for (const s3 of [false, true]) {
      const swaps: Swaps = [s2, s3];
      const ok = ([0, 1] as const).every((r) => {
        const cards = rowCards(sightings, r, swaps);
        return (!rules.plates || platesAgree(cards)) && (!rules.lanes || lanesReachable(cards));
      });
      if (ok) out.push(swaps);
    }
  }
  return out;
}

/** The swap combination that matches what really happened (every card in its true twin's row). */
export function trueSwaps(sightings: readonly Sighting[]): Swaps {
  const [g2a] = gantryCards(sightings, 2);
  const [g3a] = gantryCards(sightings, 3);
  return [g2a.truth !== 0, g3a.truth !== 0];
}

/** Which row/twin ended in which lane at G3, for a swap combination. */
export const lastLane = (sightings: readonly Sighting[], row: 0 | 1, swaps: Swaps): number => rowCards(sightings, row, swaps)[2].lane;
