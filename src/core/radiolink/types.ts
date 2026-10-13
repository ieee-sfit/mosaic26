/**
 * RADIO LINK engine: a bonus round shared by every station.
 * Commands arrive as a stream of bits. A command is a run of identical bits bounded by the opposite bit on each side;
 * the run length picks the command, the bit value picks the pair member. Between commands the line idles 1 0 1 0 ...
 * (the alternation continues through the delimiters, so a frame is just one idle bit stretched into a run).
 */
export type Bit = 0 | 1;

/** One codebook entry: a run of `run` copies of `bit`. The frame on the wire is d + bit*run + d with d = 1 - bit. */
export interface CodeEntry {
  id: string;
  label: string;
  bit: Bit;
  run: number;
}

export interface StageSpec {
  /** How many commands this stage sends. */
  commands: number;
  /** How many of them are corrupted (flipped bits). 0 in stage 1. */
  corrupted: number;
  /** Only the first `active` codebook entries are used and shown. */
  active: number;
  /** Stream speed in bits per second. */
  bps: number;
  /** The answer window stays open this many bit-times after the closing bit reaches the pointer. */
  windowBits: number;
  /** Most bits flipped in one corrupted frame (1 = always a single flip). */
  maxFlips: number;
  /** Points for the whole stage, split equally across its commands. */
  points: number;
  /** Whether the RESEND answer exists in this stage. */
  resend: boolean;
}

export interface GenOptions {
  /** Idle bits before the first frame. */
  leadInBits: number;
  /** Fewest idle bits between two frames (so answer windows never overlap). */
  minGapBits: number;
  /** Up to this many extra idle bits between frames, chosen at random. */
  gapJitter: number;
}

export interface Frame {
  /** Index into the stream of the opening delimiter. */
  start: number;
  /** Index of the closing delimiter: the answer window opens when this bit reaches the pointer. */
  end: number;
  /** The frame as sent: d + run + d. */
  sent: Bit[];
  /** The frame as received (equals `sent` when not corrupted). */
  got: Bit[];
  /** Codebook index of the command that was sent. */
  entry: number;
  corrupted: boolean;
  /** 0-based positions inside the span that were flipped. */
  flips: number[];
  /** Correct answer: a codebook index, or RESEND_ANSWER for a corrupted frame. */
  answer: number;
}

/** Answer value for "RESEND". Valid commands are answered with their codebook index. */
export const RESEND_ANSWER = -1;

export interface RadioStream {
  seed: number;
  bits: Bit[];
  frames: Frame[];
}
