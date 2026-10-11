import type { WaveCalibration, WaveProfile } from '../types';

export const SCOPE_SAMPLES = 240;
export const TAU = Math.PI * 2;

export interface WaveParams {
  amplitude: number;
  frequency: number; // cycles per scope window
  phase: number; // degrees
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Smallest angular distance between two angles, in degrees (0–180). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export const normDeg = (d: number) => ((d % 360) + 360) % 360;

/** Slider fraction (0–1) → physical wave parameter. */
export const ampFromSlider = (cal: WaveCalibration, s: number) => lerp(cal.ampMin, cal.ampMax, s);
export const freqFromSlider = (cal: WaveCalibration, s: number) => lerp(cal.freqMin, cal.freqMax, s);

export interface Targets {
  amp: number; // slider fraction
  freq: number; // slider fraction
  phase: number; // degrees
}

/** The control positions that cancel a profile's noise exactly. */
export function targetsFor(cal: WaveCalibration, p: WaveProfile): Targets {
  return {
    amp: (p.noise.amplitude - cal.ampMin) / (cal.ampMax - cal.ampMin),
    freq: (p.noise.frequency - cal.freqMin) / (cal.freqMax - cal.freqMin),
    phase: normDeg(p.noise.phase + 180),
  };
}

export interface Controls {
  amp: number;
  freq: number;
  phase: number;
}

export interface Alignment {
  amp: boolean;
  freq: boolean;
  phase: boolean;
  locked: boolean;
}

/** ±tolerance of full range on every parameter (phase: of 360°). */
export function alignmentFor(cal: WaveCalibration, p: WaveProfile, c: Controls): Alignment {
  const t = targetsFor(cal, p);
  const amp = Math.abs(c.amp - t.amp) <= cal.tolerance;
  const freq = Math.abs(c.freq - t.freq) <= cal.tolerance;
  const phase = angleDiff(c.phase, t.phase) <= cal.tolerance * 360;
  return { amp, freq, phase, locked: amp && freq && phase };
}

export const noiseAt = (p: WaveProfile, x: number, scroll = 0) =>
  p.noise.amplitude * Math.sin(TAU * p.noise.frequency * x + (p.noise.phase * Math.PI) / 180 + scroll);

export const antiAt = (cal: WaveCalibration, c: Controls, x: number, scroll = 0) =>
  ampFromSlider(cal, c.amp) *
  Math.sin(TAU * freqFromSlider(cal, c.freq) * x + (c.phase * Math.PI) / 180 + scroll);

/** Un-cancelled → baselineDb; perfect cancellation → floorDb. Time-independent (x-window RMS). */
export function disturbanceDb(cal: WaveCalibration, p: WaveProfile, c: Controls, locked: boolean): number {
  if (locked) return cal.floorDb;
  let resSq = 0;
  let noiseSq = 0;
  for (let i = 0; i < SCOPE_SAMPLES; i++) {
    const x = i / (SCOPE_SAMPLES - 1);
    const n = noiseAt(p, x);
    const r = n + antiAt(cal, c, x);
    noiseSq += n * n;
    resSq += r * r;
  }
  const ratio = Math.sqrt(resSq / Math.max(noiseSq, 1e-9));
  const db = cal.baselineDb + 20 * Math.log10(Math.max(ratio, 1e-3));
  return clamp(db, cal.floorDb, cal.baselineDb + 6);
}
