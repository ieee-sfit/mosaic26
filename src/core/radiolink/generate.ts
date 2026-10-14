import { RESEND_ANSWER } from './types';
import type { Bit, CodeEntry, Frame, GenOptions, RadioStream, StageSpec } from './types';

/** Small seeded PRNG (mulberry32): same seed, same stream. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix a run seed with a stage number so every stage gets its own stream. */
export const stageSeed = (seed: number, stage: number): number => (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + stage * 0x27d4eb2f) >>> 0;

const flip = (b: Bit): Bit => (b ? 0 : 1);

/** The frame on the wire for a codebook entry: d, run copies of the bit, d. */
export function frameBits(e: CodeEntry): Bit[] {
  const d = flip(e.bit);
  return [d, ...Array.from({ length: e.run }, () => e.bit), d];
}

const str = (bits: readonly Bit[]) => bits.join('');

/** Delimited pattern of an entry as a string, e.g. "0111110". */
const barePattern = (e: CodeEntry) => str(frameBits(e));
/** The same with the idle neighbours on both sides, e.g. "101111101". */
const fullPattern = (e: CodeEntry) => `${e.bit}${barePattern(e)}${e.bit}`;

export interface ScanHit { start: number; entry: number }

/**
 * Exact-pattern scan: every place the stream carries a codebook pattern. `strict` also requires the idle neighbour
 * on each side (what a clean frame looks like); the bare scan drops that requirement and is what a damaged frame
 * must never match. Hits are for the entries given in `codebook`, sorted by position.
 */
export function scanStream(bits: readonly Bit[], codebook: readonly CodeEntry[], strict = true): ScanHit[] {
  const s = str(bits);
  const hits: ScanHit[] = [];
  codebook.forEach((e, entry) => {
    const pat = strict ? fullPattern(e) : barePattern(e);
    const off = strict ? 1 : 0;
    for (let i = s.indexOf(pat); i !== -1; i = s.indexOf(pat, i + 1)) hits.push({ start: i + off, entry });
  });
  return hits.sort((x, y) => x.start - y.start);
}

/** Longest run of identical bits in a window. */
const longestRun = (bits: readonly Bit[]) => {
  let best = 0;
  let cur = 0;
  bits.forEach((b, i) => {
    cur = i > 0 && b === bits[i - 1] ? cur + 1 : 1;
    if (cur > best) best = cur;
  });
  return best;
};

/**
 * Is this damaged frame fair? `window` is the received span with two idle bits on each side (the idle neighbour and the bit beyond it, which can complete a pattern when a delimiter flips).
 * It must contain no exact codebook pattern (as a substring, from the FULL codebook, even in stages that only use a few
 * entries), and it must not have collapsed back into plain idle: a visible run of 2 or more must remain.
 */
export function damageIsFair(window: readonly Bit[], fullCodebook: readonly CodeEntry[]): boolean {
  if (scanStream(window, fullCodebook, false).length > 0) return false;
  return longestRun(window) >= 2;
}

/** Every way to flip 1..maxFlips positions of a span of `len` bits. */
function flipSets(len: number, maxFlips: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < len; i++) {
    out.push([i]);
    if (maxFlips >= 2) for (let j = i + 1; j < len; j++) out.push([i, j]);
  }
  return out;
}

/** Corrupted commands allowed back to back. */
export const MAX_BAD_RUN = 2;
const longestBadRun = (slots: number[], bad: Set<number>) => {
  let best = 0;
  let cur = 0;
  for (const k of slots) { cur = bad.has(k) ? cur + 1 : 0; best = Math.max(best, cur); }
  return best;
};

const shuffleWith = <T,>(arr: T[], rnd: () => number): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Build one stage's stream, deterministically from `seed`.
 * Flips land only inside a command's own span; each candidate flip is checked with `damageIsFair` and retried until it passes.
 */
export function generateStream(seed: number, spec: StageSpec, codebook: readonly CodeEntry[], opt: GenOptions): RadioStream {
  const rnd = makeRng(seed);
  const active = codebook.slice(0, spec.active);

  // which command slots are corrupted: never the first, so every stage opens with a clean command
  const slots = Array.from({ length: spec.commands }, (_, i) => i);
  const pool = spec.corrupted > 0 && spec.commands > 1 ? slots.slice(1) : slots;
  // and never more than MAX_BAD_RUN corrupted in a row, so a damaged stretch cannot swallow a whole stage
  let corruptSet = new Set<number>();
  for (let attempt = 0; attempt < 200; attempt++) {
    corruptSet = new Set(shuffleWith(pool, rnd).slice(0, spec.corrupted));
    if (longestBadRun(slots, corruptSet) <= MAX_BAD_RUN) break;
  }

  // command types come out of a shuffled bag, so they spread evenly; no type three times in a row
  let bag: number[] = [];
  const draw = (avoid: number[]) => {
    for (let guard = 0; guard < 50; guard++) {
      if (bag.length === 0) bag = shuffleWith(active.map((_, i) => i), rnd);
      const pick = bag.pop() as number;
      const bad = avoid.length >= 2 && avoid[avoid.length - 1] === pick && avoid[avoid.length - 2] === pick;
      if (!bad) return pick;
      bag.unshift(pick);
    }
    return 0;
  };

  const bits: Bit[] = [];
  // The idle line alternates from the bit that was SENT: damage never changes the idle bits that follow a frame.
  let lastSent: Bit | null = null;
  const idleTo = (want: Bit, minIdle: number) => {
    // alternate until at least minIdle idle bits are out and the last one is `want`
    let n = 0;
    while (n < minIdle || lastSent !== want) {
      lastSent = lastSent === null ? 0 : flip(lastSent);
      bits.push(lastSent);
      n++;
    }
  };

  const frames: Frame[] = [];
  const used: number[] = [];
  for (let k = 0; k < spec.commands; k++) {
    const corrupt = corruptSet.has(k);
    let entry = draw(used);
    let flips: number[] = [];
    let got: Bit[] = [];
    let sent: Bit[] = [];
    // find a type that admits a fair damage; a flip set that fails is simply discarded
    for (let tries = 0; ; tries++) {
      const e = active[entry];
      sent = frameBits(e);
      if (!corrupt) { got = sent.slice(); flips = []; break; }
      const options = shuffleWith(flipSets(sent.length, spec.maxFlips), rnd);
      const fair = options.filter((f) => {
        const d = sent.map((b, i) => (f.includes(i) ? flip(b) : b));
        const dl = flip(e.bit);
        return damageIsFair([dl, e.bit, ...d, e.bit, dl], codebook);
      });
      if (fair.length) {
        // single flips most of the time, so the teaching moment stays simple
        const singles = fair.filter((f) => f.length === 1);
        const multi = fair.filter((f) => f.length > 1);
        flips = multi.length && (singles.length === 0 || rnd() < 0.4) ? multi[Math.floor(rnd() * multi.length)] : singles[Math.floor(rnd() * singles.length)];
        got = sent.map((b, i) => (flips.includes(i) ? flip(b) : b));
        break;
      }
      if (tries > 20) throw new Error('radiolink: no fair damage for any command type');
      entry = draw(used);
    }
    used.push(entry);

    const e = active[entry];
    const gap = k === 0 ? opt.leadInBits : opt.minGapBits + Math.floor(rnd() * (opt.gapJitter + 1));
    idleTo(e.bit, gap); // last idle bit equals the run bit, so the delimiter alternates after it
    const start = bits.length;
    bits.push(...got);
    lastSent = sent[sent.length - 1];
    frames.push({
      start, end: start + got.length - 1, sent, got, entry, corrupted: corrupt, flips,
      answer: corrupt ? RESEND_ANSWER : entry,
    });
  }
  // idle tail so the last window has a line to scroll over
  for (let i = 0; i < 24; i++) {
    lastSent = flip(lastSent as Bit);
    bits.push(lastSent);
  }
  return { seed, bits, frames };
}

export interface Violation { frame: number | null; rule: string }

/**
 * Check a generated stream against the fairness rules. Returns the violations (empty = fair).
 *  - the strict pattern scan returns exactly the intended valid frames, and nothing else
 *  - the bare scan (no neighbour requirement) agrees, so nothing hides in a damaged frame
 *  - corrupted frames: flips only inside the span, no pattern inside, not plain idle, a visible anomaly
 *  - idle bits really alternate, gaps >= minGapBits, command and corrupted counts match the spec
 */
export function verifyStream(stream: RadioStream, spec: StageSpec, codebook: readonly CodeEntry[], opt: GenOptions): Violation[] {
  const v: Violation[] = [];
  const { bits, frames } = stream;
  const add = (frame: number | null, rule: string) => v.push({ frame, rule });
  if (frames.length !== spec.commands) add(null, `command count ${frames.length} != ${spec.commands}`);
  if (frames.filter((f) => f.corrupted).length !== spec.corrupted) add(null, 'corrupted count differs from spec');

  let run = 0;
  frames.forEach((f, i) => {
    run = f.corrupted ? run + 1 : 0;
    if (run > MAX_BAD_RUN) add(i, `more than ${MAX_BAD_RUN} corrupted frames in a row`);
  });
  if (frames[0] && frames[0].corrupted && spec.commands > 1) add(0, 'first command must be clean');

  const valid = frames.filter((f) => !f.corrupted);
  const strict = scanStream(bits, codebook, true);
  const bare = scanStream(bits, codebook, false);
  if (strict.length !== valid.length || strict.some((h, i) => h.start !== valid[i].start || h.entry !== valid[i].entry)) add(null, 'strict scan != intended valid frames');
  if (bare.length !== strict.length) add(null, 'bare scan finds a pattern the strict scan does not');

  const inSpan = new Set<number>();
  frames.forEach((f, i) => {
    for (let p = f.start; p <= f.end; p++) inSpan.add(p);
    if (str(bits.slice(f.start, f.end + 1)) !== str(f.got)) add(i, 'stream differs from frame');
    if (f.corrupted) {
      if (f.flips.length < 1 || f.flips.length > spec.maxFlips) add(i, 'flip count out of range');
      f.flips.forEach((p) => { if (p < 0 || p >= f.sent.length) add(i, 'flip outside the span'); });
      const diff = f.sent.map((b, p) => (b !== f.got[p] ? p : -1)).filter((p) => p >= 0);
      if (diff.join(',') !== [...f.flips].sort((a, b) => a - b).join(',')) add(i, 'recorded flips differ from the damage');
      const win = bits.slice(f.start - 2, f.end + 3);
      if (scanStream(win, codebook, false).length > 0) add(i, 'damaged frame contains a codebook pattern');
      if (longestRun(win) < 2) add(i, 'damaged frame collapsed into idle');
      if (f.answer !== RESEND_ANSWER) add(i, 'corrupted frame must answer RESEND');
    } else if (f.answer !== f.entry) add(i, 'valid frame answer mismatch');
    if (f.entry >= spec.active) add(i, 'type outside the active set');
  });
  // idle bits (outside every span) alternate with each other and with the delimiters around them
  for (let p = 1; p < bits.length; p++) {
    if (inSpan.has(p) || inSpan.has(p - 1)) continue;
    if (bits[p] === bits[p - 1]) add(null, `idle bits not alternating at ${p}`);
  }
  frames.forEach((f, i) => {
    if (bits[f.start - 1] === f.got[0] && !f.corrupted) add(i, 'idle neighbour does not alternate into the delimiter');
    if (i > 0) {
      const gap = f.start - frames[i - 1].end - 1;
      if (gap < opt.minGapBits) add(i, `gap ${gap} < ${opt.minGapBits}`);
    } else if (f.start < opt.leadInBits) add(i, 'lead-in too short');
  });
  return v;
}
