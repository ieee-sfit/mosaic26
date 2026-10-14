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

/** Module C lock windows, per control: amplitude / frequency as a fraction of their range (slider units), phase in degrees. */
export function alignmentFor(cal: WaveCalibration, p: WaveProfile, c: Controls): Alignment {
  const t = targetsFor(cal, p);
  const amp = Math.abs(c.amp - t.amp) <= cal.window.amp;
  const freq = Math.abs(c.freq - t.freq) <= cal.window.freq;
  const phase = angleDiff(c.phase, t.phase) <= cal.window.phase;
  return { amp, freq, phase, locked: amp && freq && phase };
}

/** A control that enters its window snaps exactly onto the target, so the residual goes perfectly flat. */
export function snapToWindows(cal: WaveCalibration, p: WaveProfile, c: Controls): Controls {
  const t = targetsFor(cal, p);
  const a = alignmentFor(cal, p, c);
  return { amp: a.amp ? t.amp : c.amp, freq: a.freq ? t.freq : c.freq, phase: a.phase ? t.phase : c.phase };
}

/** The distance that fills a meter from empty to full, per control (amp / freq: slider units, phase: degrees). */
export const METER_SPAN = { amp: 0.6, freq: 0.6, phase: 180 } as const;

export interface Closeness {
  /** 0 (far) .. 1 (on target). */
  value: number;
  /** Where the lock window starts on the same 0..1 scale: inside the window means value >= zone. */
  zone: number;
  inside: boolean;
}

/** One closeness reading per control; each depends on its own control only. */
export function closenessFor(cal: WaveCalibration, p: WaveProfile, c: Controls): Record<keyof Controls, Closeness> {
  const t = targetsFor(cal, p);
  const a = alignmentFor(cal, p, c);
  const one = (err: number, win: number, span: number, inside: boolean): Closeness => ({
    value: 1 - clamp(err / span, 0, 1),
    zone: 1 - win / span,
    inside,
  });
  return {
    amp: one(Math.abs(c.amp - t.amp), cal.window.amp, METER_SPAN.amp, a.amp),
    freq: one(Math.abs(c.freq - t.freq), cal.window.freq, METER_SPAN.freq, a.freq),
    phase: one(angleDiff(c.phase, t.phase), cal.window.phase, METER_SPAN.phase, a.phase),
  };
}

export const noiseAt = (p: WaveProfile, x: number, scroll = 0) =>
  p.noise.amplitude * Math.sin(TAU * p.noise.frequency * x + (p.noise.phase * Math.PI) / 180 + scroll);

export const antiAt = (cal: WaveCalibration, c: Controls, x: number, scroll = 0) =>
  ampFromSlider(cal, c.amp) *
  Math.sin(TAU * freqFromSlider(cal, c.freq) * x + (c.phase * Math.PI) / 180 + scroll);

/**
 * Module C scope waves. The x axis is centred (x - 0.5), so a frequency change squeezes the wave about the middle of the scope,
 * a phase change slides it sideways and an amplitude change only changes its height. Module B keeps noiseAt / antiAt above.
 */
export const noiseAtC = (p: WaveProfile, x: number) =>
  p.noise.amplitude * Math.sin(TAU * p.noise.frequency * (x - 0.5) + (p.noise.phase * Math.PI) / 180);

export const antiAtC = (cal: WaveCalibration, c: Controls, x: number) =>
  ampFromSlider(cal, c.amp) * Math.sin(TAU * freqFromSlider(cal, c.freq) * (x - 0.5) + (c.phase * Math.PI) / 180);

/** Un-cancelled → baselineDb; perfect cancellation → floorDb. Time-independent (x-window RMS). */
export function disturbanceDb(cal: WaveCalibration, p: WaveProfile, c: Controls, locked: boolean): number {
  if (locked) return cal.floorDb;
  let resSq = 0;
  let noiseSq = 0;
  for (let i = 0; i < SCOPE_SAMPLES; i++) {
    const x = i / (SCOPE_SAMPLES - 1);
    const n = noiseAtC(p, x);
    const r = n + antiAtC(cal, c, x);
    noiseSq += n * n;
    resSq += r * r;
  }
  const ratio = Math.sqrt(resSq / Math.max(noiseSq, 1e-9));
  const db = cal.baselineDb + 20 * Math.log10(Math.max(ratio, 1e-3));
  return clamp(db, cal.floorDb, cal.baselineDb + 6);
}
