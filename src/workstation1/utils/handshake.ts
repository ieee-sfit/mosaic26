/* Pure logic for Module D · SECRET HANDSHAKE (frequency hopping). No React, no DOM.
   Channels are labelled 1..12 and wrap: after 12 comes 1. Every rule works directly on the labels the player sees. */
import type { HandshakeRoundDef, HandshakeVariant, HopRule } from '../types';

export const CHANNELS = 12;
export const DEMO_HOPS = 4;

/** Wrap any integer onto a channel label 1..12. */
export const wrap = (x: number): number => ((((x - 1) % CHANNELS) + CHANNELS) % CHANNELS) + 1;

/** Small deterministic PRNG so a seed always deals the same handshakes. */
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

/**
 * The beacon's channel at every moment s[0..n]. s0 is where it sits at the start, s1 only matters for rules that
 * need two starting points (interleaved trails, add-the-last-two).
 */
export function sequence(rule: HopRule, s0: number, s1: number, n: number): number[] {
  const s: number[] = [wrap(s0)];
  if (n >= 1) {
    switch (rule.kind) {
      case 'inter':
      case 'fib':
        s.push(wrap(s1));
        break;
      default:
        s.push(wrap(s[0] + stepOf(rule, 0)));
    }
  }
  for (let t = 1; t < n; t++) {
    switch (rule.kind) {
      case 'step':
      case 'alt':
      case 'grow':
        s.push(wrap(s[t] + stepOf(rule, t)));
        break;
      case 'inter':
        // two trails take turns: hop t+1 is the same trail's previous spot (t-1) plus that trail's step
        s.push(wrap(s[t - 1] + (t % 2 === 1 ? rule.c : rule.e)));
        break;
      case 'fib':
        s.push(wrap(s[t - 1] + s[t]));
        break;
    }
  }
  return s;
}

/** Jump size taken at hop index t (t = 0 is the first hop). Only for the single-position rules. */
function stepOf(rule: HopRule, t: number): number {
  switch (rule.kind) {
    case 'step': return rule.d;
    case 'alt': return t % 2 === 0 ? rule.d1 : rule.d2;
    case 'grow': return rule.d0 + rule.g * t;
    default: return 0;
  }
}

/** Plain-words version of a rule (Hint 1). */
export function describe(rule: HopRule): string {
  const sg = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  switch (rule.kind) {
    case 'step': return `Every hop jumps ${sg(rule.d)} channels. After CH 12 it wraps to CH 1.`;
    case 'alt': return `Jumps alternate: ${sg(rule.d1)}, then ${sg(rule.d2)}, then ${sg(rule.d1)} again…`;
    case 'inter': return `Two trails take turns. Trail A moves ${sg(rule.c)} each time it hops, trail B moves ${sg(rule.e)}.`;
    case 'grow': return `Each jump is ${rule.g === 1 ? '1 bigger' : `${rule.g} bigger`} than the last: ${[0, 1, 2, 3].map((i) => sg(rule.d0 + rule.g * i)).join(', ')}…`;
    case 'fib': return 'The next channel is the sum of the last two channels. It wraps past 12.';
  }
}

/* ── the families of rules a round may use (what "consistent with the demo" is checked against) ───────────── */

export type RuleFamily = (s0: number, s1: number) => HopRule[];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const FAMILY_STEP: HopRule[] = range(CHANNELS).map((d) => ({ kind: 'step', d }));
export const FAMILY_ALT: HopRule[] = range(CHANNELS).flatMap((d1) => range(CHANNELS).map((d2) => ({ kind: 'alt', d1, d2 }) as HopRule));
export const FAMILY_INTER: HopRule[] = range(CHANNELS).flatMap((c) => range(CHANNELS).map((e) => ({ kind: 'inter', c, e }) as HopRule));
export const FAMILY_GROW: HopRule[] = range(CHANNELS).flatMap((d0) => range(CHANNELS).map((g) => ({ kind: 'grow', d0, g }) as HopRule));
export const FAMILY_FIB: HopRule[] = [{ kind: 'fib' }];

/** Allowed rules per round index: each round's family includes the simpler rounds' families, so nothing simpler can explain it. */
export const FAMILIES: HopRule[][] = [
  FAMILY_STEP,
  [...FAMILY_STEP, ...FAMILY_ALT, ...FAMILY_INTER],
  [...FAMILY_STEP, ...FAMILY_ALT, ...FAMILY_INTER, ...FAMILY_GROW, ...FAMILY_FIB],
];

export interface Pattern {
  round: number;
  variantId: string;
  rule: HopRule;
  /** Channel at every moment: s[0] is the start, s[1..4] the demo hops, s[5..] the scored hops. */
  s: number[];
  scored: number;
}

/** Every rule of the family that reproduces the demo (s[0..DEMO_HOPS]) and what it predicts for the scored hops. */
export function consistentRules(family: HopRule[], demo: number[], scored: number): { rule: HopRule; future: number[] }[] {
  const n = DEMO_HOPS + scored;
  const out: { rule: HopRule; future: number[] }[] = [];
  for (const rule of family) {
    // inter / fib rules need two start points; for the others s1 follows from the rule itself
    const s = sequence(rule, demo[0], demo[1], n);
    if (demo.every((v, i) => s[i] === v)) out.push({ rule, future: s.slice(DEMO_HOPS + 1) });
  }
  return out;
}

/** Builds the round's pattern from a seed: picks an authored variant, a start channel and (when needed) a second start point. */
export function generatePattern(def: HandshakeRoundDef, round: number, seed: number): Pattern {
  const n = DEMO_HOPS + def.scoredHops;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rnd = mulberry32((seed ^ (0x9e3779b1 * (round + 1))) + attempt * 7919);
    const variant: HandshakeVariant = def.variants[Math.floor(rnd() * def.variants.length)];
    const s0 = 1 + Math.floor(rnd() * CHANNELS);
    const s1 = wrap(s0 + 1 + Math.floor(rnd() * (CHANNELS - 1))); // never equal to s0
    const s = sequence(variant.rule, s0, s1, n);
    // the beacon must really move at every hop, and must not hide behind a few repeated channels
    const moves = s.every((v, i) => i === 0 || v !== s[i - 1]);
    const scored = s.slice(DEMO_HOPS + 1);
    const counts = new Map<number, number>();
    for (const v of scored) counts.set(v, (counts.get(v) ?? 0) + 1);
    // parking on one channel must not pay: no channel may come up more than twice (once in a short round)
    const cap = def.scoredHops <= 6 ? 1 : 2;
    if (moves && Math.max(...counts.values()) <= cap) return { round, variantId: variant.id, rule: variant.rule, s, scored: def.scoredHops };
  }
  throw new Error('no valid handshake pattern for this seed');
}

/** Points for a round: split equally over the scored hops; Hint 1 takes 40%, Hint 2 (auto-play) scores 0. */
export function roundPoints(def: HandshakeRoundDef, locks: number, hint: 0 | 1 | 2, hint1Penalty: number): number {
  if (hint === 2) return 0;
  const base = (def.points * locks) / def.scoredHops;
  return Math.round(base * (hint === 1 ? 1 - hint1Penalty : 1) * 100) / 100;
}
