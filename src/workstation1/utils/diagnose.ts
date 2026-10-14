/* Pure maths for Module B · DIAGNOSE THE LEFTOVER.
   Everything here is built on the same noiseAt / antiAt / targetsFor that Module C uses, so a wave drawn in B
   is exactly the wave C would draw for the same noise and controls. No React, no DOM. */
import type { DiagWaveDef, WaveCalibration, WaveProfile } from '../types';
import { SCOPE_SAMPLES, angleDiff, antiAt, noiseAt, targetsFor, type Controls, type Targets } from './waves';

export type ControlKey = 'amp' | 'phase' | 'freq';
export const CONTROL_KEYS: ControlKey[] = ['amp', 'phase', 'freq'];

/** The three plain words the player learns. They match Module C's slider names. */
export const CONTROL_WORDS: Record<ControlKey, { name: string; plain: string }> = {
  amp: { name: 'AMPLITUDE', plain: 'LOUDNESS' },
  phase: { name: 'PHASE', plain: 'TIMING' },
  freq: { name: 'FREQUENCY', plain: 'PITCH' },
};

/** A wave definition seen as a Module C profile, so waves.ts can be reused unchanged. */
export const profileOf = (w: DiagWaveDef): WaveProfile => ({
  id: w.id,
  callsign: w.label,
  noise: w.noise,
  start: w.start,
  timeLimitSec: 0,
  ship: { x: 50, y: 50, scale: 1 },
});

export const targetsOf = (cal: WaveCalibration, w: DiagWaveDef): Targets => targetsFor(cal, profileOf(w));

export const residualAt = (cal: WaveCalibration, w: DiagWaveDef, c: Controls, x: number): number =>
  noiseAt(profileOf(w), x) + antiAt(cal, c, x);

const xs = Array.from({ length: SCOPE_SAMPLES }, (_, i) => i / (SCOPE_SAMPLES - 1));

/** RMS of the leftover over the scope window. */
export function leftoverRms(cal: WaveCalibration, w: DiagWaveDef, c: Controls): number {
  let s = 0;
  for (const x of xs) {
    const r = residualAt(cal, w, c, x);
    s += r * r;
  }
  return Math.sqrt(s / xs.length);
}

/** Leftover level relative to the raw noise RMS (1 = nothing cancelled, 0 = perfect). */
export const leftoverRatio = (cal: WaveCalibration, w: DiagWaveDef, c: Controls): number => {
  let n = 0;
  for (const x of xs) n += noiseAt(profileOf(w), x) ** 2;
  return leftoverRms(cal, w, c) / Math.sqrt(n / xs.length);
};

/** The controls with ONE control moved exactly onto its target. */
export function withFixed(cal: WaveCalibration, w: DiagWaveDef, c: Controls, key: ControlKey): Controls {
  const t = targetsOf(cal, w);
  return { ...c, [key]: t[key] };
}

export const allFixed = (cal: WaveCalibration, w: DiagWaveDef): Controls => {
  const t = targetsOf(cal, w);
  return { amp: t.amp, freq: t.freq, phase: t.phase };
};

/** Is this control inside the (8%) tolerance of its target? Phase tolerance is a fraction of 360 deg. */
export function withinTolerance(cal: WaveCalibration, tol: number, w: DiagWaveDef, c: Controls, key: ControlKey): boolean {
  const t = targetsOf(cal, w);
  return key === 'phase' ? angleDiff(c.phase, t.phase) <= tol * 360 : Math.abs(c[key] - t[key]) <= tol;
}

export interface StepAnalysis {
  /** Leftover RMS after fixing only that control (the others stay wrong). */
  after: Record<string, number>;
  rmsBefore: number;
  dominant: ControlKey;
  runnerUp: ControlKey;
  /** RMS reduction of the dominant fix divided by the runner-up's reduction (>= 2 is "clearly dominant"). */
  margin: number;
}

/** Which of the still-wrong controls is the dominant error right now: the one whose fix lowers the leftover RMS the most. */
export function analyseStep(cal: WaveCalibration, w: DiagWaveDef, c: Controls, remaining: ControlKey[]): StepAnalysis {
  const rmsBefore = leftoverRms(cal, w, c);
  const gains = remaining
    .map((k) => ({ k, after: leftoverRms(cal, w, withFixed(cal, w, c, k)) }))
    .map((g) => ({ ...g, gain: rmsBefore - g.after }))
    .sort((a, b) => b.gain - a.gain);
  const [first, second] = gains;
  return {
    after: Object.fromEntries(gains.map((g) => [g.k, g.after])),
    rmsBefore,
    dominant: first.k,
    runnerUp: (second ?? first).k,
    margin: second ? first.gain / Math.max(second.gain, 1e-9) : Infinity,
  };
}

/** Full fix order for a wave: dominant first, re-evaluated after each fix. */
export function fixOrder(cal: WaveCalibration, w: DiagWaveDef): { order: ControlKey[]; steps: StepAnalysis[] } {
  let c = { ...w.start };
  let remaining: ControlKey[] = [...CONTROL_KEYS];
  const order: ControlKey[] = [];
  const steps: StepAnalysis[] = [];
  while (remaining.length) {
    const a = analyseStep(cal, w, c, remaining);
    steps.push(a);
    order.push(a.dominant);
    c = withFixed(cal, w, c, a.dominant);
    remaining = remaining.filter((k) => k !== a.dominant);
  }
  return { order, steps };
}

/** Positions (0..1) of the local maxima of a curve over the scope window. */
export function peakPositions(fn: (x: number) => number): number[] {
  const out: number[] = [];
  for (let i = 1; i < xs.length - 1; i++) {
    const a = fn(xs[i - 1]);
    const b = fn(xs[i]);
    const d = fn(xs[i + 1]);
    if (b > a && b >= d && b > 0) out.push(xs[i]);
  }
  return out;
}

/** The visual signatures a student is taught to read. */
export interface Signature {
  /** Tallest extreme of the leftover divided by the shortest (1 = a steady wave, much more = it swells and shrinks). */
  swell: number;
  /** Offset between the leftover's peaks and the noise's peaks, as a fraction of one noise cycle, folded to 0..0.5 (0 = lined up, 0.25 = between). */
  peakOffset: number;
}

export function signature(cal: WaveCalibration, w: DiagWaveDef, c: Controls): Signature {
  const res = (x: number) => residualAt(cal, w, c, x);
  // heights of every interior peak and trough of the leftover
  const heights: number[] = [];
  for (let i = 1; i < xs.length - 1; i++) {
    const a = res(xs[i - 1]);
    const b = res(xs[i]);
    const d = res(xs[i + 1]);
    if ((b > a && b >= d) || (b < a && b <= d)) heights.push(Math.abs(b));
  }
  const swell = heights.length > 1 ? Math.max(...heights) / Math.max(Math.min(...heights), 1e-9) : 1;

  const nPk = peakPositions((x) => noiseAt(profileOf(w), x));
  const rPk = peakPositions(res);
  const cycle = 1 / w.noise.frequency;
  let best = 0.5;
  if (nPk.length && rPk.length) {
    // mean folded distance from every leftover peak to its nearest noise peak
    const offs = rPk.map((p) => {
      const d = Math.min(...nPk.map((q) => Math.abs(p - q))) / cycle;
      return Math.min(d, 1 - d);
    });
    best = offs.reduce((a, b) => a + b, 0) / offs.length;
  }
  return { swell, peakOffset: best };
}

/** One-line reason shown for a wrong diagnosis and for Hint 1. Uses the teaching words exactly. */
export const REASON: Record<ControlKey, string> = {
  freq: 'The leftover swells and shrinks, so it is PITCH.',
  amp: 'No swelling, and the peaks line up with the noise, so it is LOUDNESS.',
  phase: 'No swelling, and the peaks sit between the noise peaks, so it is TIMING.',
};
