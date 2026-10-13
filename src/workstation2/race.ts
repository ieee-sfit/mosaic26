/**
 * Race maths. Everything here is derived from POINTS ONLY (never from how long the player took), so time cannot change
 * a lap time or a rank. Points -> speed -> lap time -> rank among scripted rivals.
 */
import { LAP_KM } from './track';

/** Speed (km/h) at full marks and at zero marks. */
export const V_BEST = 240;
export const V_WORST = 170;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const speedFor = (frac: number) => V_WORST + (V_BEST - V_WORST) * clamp01(frac);
/** Seconds to cover `km` at the speed earned by `frac` of the available points. */
export const secondsFor = (km: number, frac: number) => (km / speedFor(frac)) * 3600;
/** A whole lap at one earned fraction (used for the three race laps). */
export const lapSeconds = (frac: number) => secondsFor(LAP_KM, frac);
export const PERFECT_LAP = lapSeconds(1);

/** 3:24.435 */
export function fmtLap(sec: number): string {
  const ms = Math.round(sec * 1000);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
/** Race total, 10:13.305 */
export const fmtTotal = fmtLap;
/** Gap to the leader: +1.234 (or +1:02.345 beyond a minute). */
export function fmtGap(sec: number): string {
  if (sec <= 0.0005) return '';
  const ms = Math.round(sec * 1000);
  if (ms < 60000) return `+${Math.floor(ms / 1000)}.${String(ms % 1000).padStart(3, '0')}`;
  return `+${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

export interface Rival {
  num: number;
  /** Invented 3-letter code. No real drivers. */
  code: string;
  /** Plain colour bar, no team marks. */
  hue: string;
  quali: number; // scripted qualifying lap, seconds
  laps: [number, number, number]; // scripted race laps, seconds
}

/** Every scripted rival is slower than a perfect lap (204.435 s) on every lap, so full marks always wins. */
export const RIVALS: Rival[] = [
  { num: 11, code: 'KVR', hue: '#38bdf8', quali: 205.912, laps: [206.4, 205.9, 206.8] },
  { num: 27, code: 'TOZ', hue: '#a78bfa', quali: 207.204, laps: [207.9, 207.3, 208.4] },
  { num: 8, code: 'BEX', hue: '#34d399', quali: 208.731, laps: [209.1, 208.2, 209.9] },
  { num: 52, code: 'MIR', hue: '#f59e0b', quali: 210.418, laps: [210.6, 211.2, 210.1] },
  { num: 19, code: 'SYN', hue: '#e879f9', quali: 212.126, laps: [212.4, 211.7, 213.0] },
  { num: 64, code: 'DRK', hue: '#94a3b8', quali: 214.043, laps: [214.6, 213.9, 215.2] },
  { num: 33, code: 'OLM', hue: '#2dd4bf', quali: 216.337, laps: [216.8, 217.5, 216.2] },
  { num: 7, code: 'FJA', hue: '#fb923c', quali: 219.215, laps: [219.9, 219.1, 220.6] },
  { num: 90, code: 'NOV', hue: '#60a5fa', quali: 223.508, laps: [224.0, 223.2, 225.1] },
];

export const FIELD = RIVALS.length + 1;
export const YOU_NUM = 0;

const sum = (a: readonly number[]) => a.reduce((n, x) => n + x, 0);
export const rivalBest = (r: Rival) => Math.min(...r.laps);
export const rivalTotal = (r: Rival) => sum(r.laps);

/** 1 = fastest. Floored at last place, so a terrible time never ranks below the field. */
export function rankAmong(time: number, others: readonly number[]): number {
  return Math.min(others.length + 1, 1 + others.filter((t) => t < time).length);
}
export const gridPosition = (qualiSec: number) => rankAmong(qualiSec, RIVALS.map((r) => r.quali));
export const racePosition = (totalSec: number) => rankAmong(totalSec, RIVALS.map(rivalTotal));
