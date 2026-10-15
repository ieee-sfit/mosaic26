/* ==========================================================================
   STATION 3 · Module C data: the four filters, their reading scales, and the
   authored confidence tables for the three suspect rounds (two variants each).
   Pure data + pure functions (no React) so a solver script can check them.

   confidence = round peak (96-98) - sum of one cost per filter position.
   Three coarse filters (IR, polarizer, rain defog) cost a lot when a position is off;
   the binarization filter is the FINE-TUNE filter and costs only a few points.
   The correct position of each filter is the band its numeric reading falls into.
   ========================================================================== */

export type FilterKey = 'ir' | 'pol' | 'fog' | 'bin';
export const FILTER_KEYS: FilterKey[] = ['ir', 'pol', 'fog', 'bin'];
export type FilterLevels = Record<FilterKey, number>;

/** Four positions per filter: 0 = OFF, 1, 2, 3. */
export const POSITIONS = ['OFF', '1', '2', '3'] as const;

export interface FilterDef {
  key: FilterKey;
  label: string; // block title
  /** Short name of the number the scene reports, e.g. LUX. */
  reading: string;
  unit: string;
  /** Scale end, three band edges, scale end (OFF band first). Descending for IR: dim scenes need more IR. */
  scale: [number, number, number, number, number];
  decimals: number;
  /** The binarization filter is the fine-tune filter: a wrong position costs only a few points. */
  fine: boolean;
}

export const FILTER_DEFS: FilterDef[] = [
  { key: 'ir', label: 'IR', reading: 'LUX', unit: 'lx', scale: [90, 60, 35, 15, 0], decimals: 0, fine: false },
  { key: 'pol', label: 'POLARIZER', reading: 'GLARE', unit: '', scale: [0, 0.25, 0.5, 0.75, 1], decimals: 2, fine: false },
  { key: 'fog', label: 'RAIN DEFOG', reading: 'RAIN', unit: 'mm/h', scale: [0, 10, 25, 45, 60], decimals: 0, fine: false },
  { key: 'bin', label: 'BINARIZATION', reading: 'SMEAR', unit: 'px', scale: [0, 0.4, 0.8, 1.2, 1.6], decimals: 2, fine: true },
];
export const defOf = (k: FilterKey): FilterDef => FILTER_DEFS.find((d) => d.key === k) as FilterDef;

/** Which band (0-3) a reading falls into. */
export function bandOf(def: FilterDef, value: number): number {
  const s = def.scale;
  for (let i = 0; i < 4; i++) {
    const a = s[i];
    const b = s[i + 1];
    if (value >= Math.min(a, b) && value <= Math.max(a, b)) return i;
  }
  return value < Math.min(s[0], s[4]) ? (s[0] < s[4] ? 0 : 3) : s[0] < s[4] ? 3 : 0;
}

/** Where a reading sits on the 0..1 scale bar (bands are drawn equal width). */
export function scaleFraction(def: FilterDef, value: number): number {
  const i = bandOf(def, value);
  const a = def.scale[i];
  const b = def.scale[i + 1];
  const t = b === a ? 0.5 : (value - a) / (b - a);
  return (i + Math.max(0, Math.min(1, t))) / 4;
}

export const fmtReading = (def: FilterDef, value: number): string => `${value.toFixed(def.decimals)}${def.unit ? ` ${def.unit}` : ''}`;
export const fmtEdge = (def: FilterDef, value: number): string => value.toFixed(def.decimals);

export interface LensVariant {
  target: FilterLevels; // best position per filter
  peak: number; // confidence at the best combination
  reading: Record<FilterKey, number>; // the numbers the scene shows
  cost: Record<FilterKey, [number, number, number, number]>; // confidence lost per position (0 at the best one)
}

/** Round 1 = TWIN 1, round 2 = the traffic car, round 3 = TWIN 2. 15 variants each (the first two are authored, the other 13 were
 *  generated and checked: peak 96-97, a coarse filter two steps off always drops below the 80 pass mark, 16-24 of the 256 combinations
 *  pass, and the best combination reads 95+). The run seed picks one per round. */
export const LENS_VARIANTS: LensVariant[][] = [
  [
    {
      target: { ir: 3, pol: 1, fog: 0, bin: 2 },
      peak: 97,
      reading: { ir: 11, pol: 0.29, fog: 6, bin: 0.84 },
      cost: {
        ir: [33.8, 19.9, 8.8, 0.0],
        pol: [6.5, 0.0, 8.8, 18.1],
        fog: [0.0, 8.6, 17.5, 29.5],
        bin: [6.5, 2.1, 0.0, 2.4],
      },
    },
    {
      target: { ir: 0, pol: 2, fog: 3, bin: 1 },
      peak: 96,
      reading: { ir: 66, pol: 0.58, fog: 52, bin: 0.46 },
      cost: {
        ir: [0.0, 7.1, 18.0, 33.9],
        pol: [19.1, 9.0, 0.0, 9.0],
        fog: [29.2, 16.2, 7.2, 0.0],
        bin: [2.1, 0.0, 2.5, 5.4],
      },
    },
    {
      target: { ir: 3, pol: 2, fog: 3, bin: 0 },
      peak: 96,
      reading: { ir: 4, pol: 0.67, fog: 49, bin: 0.15 },
      cost: {
        ir: [36.6, 17.8, 7.6, 0.0],
        pol: [18.8, 7.2, 0.0, 7.6],
        fog: [31.4, 18.1, 6.8, 0.0],
        bin: [0.0, 2.4, 5.9, 10.0],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 0, bin: 2 },
      peak: 96,
      reading: { ir: 68, pol: 0.19, fog: 4, bin: 1.02 },
      cost: {
        ir: [0.0, 7.7, 17.0, 37.1],
        pol: [0.0, 8.2, 17.1, 33.6],
        fog: [0.0, 7.6, 18.2, 29.6],
        bin: [6.5, 2.5, 0.0, 2.4],
      },
    },
    {
      target: { ir: 0, pol: 1, fog: 0, bin: 2 },
      peak: 97,
      reading: { ir: 69, pol: 0.34, fog: 4, bin: 1.05 },
      cost: {
        ir: [0.0, 7.9, 18.0, 36.3],
        pol: [8.8, 0.0, 8.8, 18.4],
        fog: [0.0, 8.6, 19.3, 33.3],
        bin: [5.7, 2.4, 0.0, 2.5],
      },
    },
    {
      target: { ir: 0, pol: 1, fog: 3, bin: 3 },
      peak: 97,
      reading: { ir: 74, pol: 0.41, fog: 54, bin: 1.49 },
      cost: {
        ir: [0.0, 6.9, 18.0, 29.4],
        pol: [7.9, 0.0, 8.8, 18.5],
        fog: [37.1, 19.9, 7.6, 0.0],
        bin: [10.7, 6.4, 2.4, 0.0],
      },
    },
    {
      target: { ir: 3, pol: 0, fog: 1, bin: 1 },
      peak: 96,
      reading: { ir: 8, pol: 0.16, fog: 20, bin: 0.53 },
      cost: {
        ir: [27.6, 17.2, 9.0, 0.0],
        pol: [0.0, 7.8, 18.5, 31.8],
        fog: [7.2, 0.0, 7.4, 17.4],
        bin: [2.4, 0.0, 2.5, 6.0],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 1, bin: 3 },
      peak: 96,
      reading: { ir: 74, pol: 0.06, fog: 21, bin: 1.3 },
      cost: {
        ir: [0.0, 8.4, 18.9, 29.8],
        pol: [0.0, 8.5, 16.5, 32.2],
        fog: [8.1, 0.0, 7.0, 19.7],
        bin: [10.7, 6.0, 2.3, 0.0],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 0, bin: 0 },
      peak: 97,
      reading: { ir: 67, pol: 0.08, fog: 7, bin: 0.29 },
      cost: {
        ir: [0.0, 7.6, 19.2, 29.8],
        pol: [0.0, 7.7, 18.4, 35.1],
        fog: [0.0, 7.0, 19.5, 35.7],
        bin: [0.0, 2.1, 5.6, 10.9],
      },
    },
    {
      target: { ir: 0, pol: 1, fog: 0, bin: 3 },
      peak: 97,
      reading: { ir: 67, pol: 0.3, fog: 5, bin: 1.33 },
      cost: {
        ir: [0.0, 8.0, 17.7, 37.4],
        pol: [7.7, 0.0, 8.6, 19.2],
        fog: [0.0, 8.9, 18.7, 30.2],
        bin: [10.4, 5.5, 2.0, 0.0],
      },
    },
    {
      target: { ir: 0, pol: 2, fog: 3, bin: 1 },
      peak: 96,
      reading: { ir: 83, pol: 0.68, fog: 49, bin: 0.57 },
      cost: {
        ir: [0.0, 7.9, 18.7, 30.5],
        pol: [19.4, 8.5, 0.0, 8.8],
        fog: [37.1, 19.6, 7.0, 0.0],
        bin: [2.1, 0.0, 2.3, 6.3],
      },
    },
    {
      target: { ir: 0, pol: 2, fog: 3, bin: 3 },
      peak: 97,
      reading: { ir: 77, pol: 0.66, fog: 55, bin: 1.29 },
      cost: {
        ir: [0.0, 7.6, 18.5, 36.9],
        pol: [18.8, 6.7, 0.0, 8.9],
        fog: [32.1, 19.5, 9.0, 0.0],
        bin: [11.0, 6.2, 2.2, 0.0],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 2, bin: 0 },
      peak: 97,
      reading: { ir: 8, pol: 0.88, fog: 37, bin: 0.19 },
      cost: {
        ir: [32.5, 17.9, 7.2, 0.0],
        pol: [34.8, 17.5, 7.5, 0.0],
        fog: [19.7, 7.9, 0.0, 8.6],
        bin: [0.0, 2.1, 5.9, 10.7],
      },
    },
    {
      target: { ir: 0, pol: 3, fog: 1, bin: 0 },
      peak: 97,
      reading: { ir: 81, pol: 0.79, fog: 18, bin: 0.32 },
      cost: {
        ir: [0.0, 8.8, 18.2, 29.3],
        pol: [31.5, 19.3, 6.5, 0.0],
        fog: [7.5, 0.0, 7.4, 18.9],
        bin: [0.0, 2.5, 6.5, 10.1],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 0, bin: 1 },
      peak: 97,
      reading: { ir: 10, pol: 0.86, fog: 8, bin: 0.55 },
      cost: {
        ir: [31.7, 18.5, 8.0, 0.0],
        pol: [32.6, 17.9, 6.6, 0.0],
        fog: [0.0, 8.7, 18.5, 37.5],
        bin: [2.2, 0.0, 2.2, 5.6],
      },
    },
  ],
  [
    {
      target: { ir: 1, pol: 3, fog: 0, bin: 3 },
      peak: 96,
      reading: { ir: 38, pol: 0.88, fog: 4, bin: 1.41 },
      cost: {
        ir: [6.5, 0.0, 9.0, 18.2],
        pol: [35.6, 19.9, 7.9, 0.0],
        fog: [0.0, 8.2, 19.2, 32.7],
        bin: [10.4, 5.8, 2.0, 0.0],
      },
    },
    {
      target: { ir: 2, pol: 0, fog: 3, bin: 0 },
      peak: 97,
      reading: { ir: 19, pol: 0.11, fog: 49, bin: 0.36 },
      cost: {
        ir: [19.0, 6.6, 0.0, 8.8],
        pol: [0.0, 8.6, 19.4, 36.0],
        fog: [37.6, 19.4, 8.5, 0.0],
        bin: [0.0, 2.1, 5.9, 10.8],
      },
    },
    {
      target: { ir: 1, pol: 3, fog: 0, bin: 1 },
      peak: 97,
      reading: { ir: 45, pol: 0.86, fog: 3, bin: 0.48 },
      cost: {
        ir: [8.7, 0.0, 8.2, 18.8],
        pol: [35.5, 17.7, 8.9, 0.0],
        fog: [0.0, 7.4, 19.7, 29.2],
        bin: [2.4, 0.0, 2.2, 6.3],
      },
    },
    {
      target: { ir: 0, pol: 2, fog: 3, bin: 3 },
      peak: 96,
      reading: { ir: 78, pol: 0.55, fog: 49, bin: 1.28 },
      cost: {
        ir: [0.0, 8.3, 19.3, 28.1],
        pol: [19.1, 8.2, 0.0, 8.2],
        fog: [29.1, 17.9, 7.7, 0.0],
        bin: [10.5, 5.6, 2.2, 0.0],
      },
    },
    {
      target: { ir: 1, pol: 0, fog: 0, bin: 0 },
      peak: 97,
      reading: { ir: 44, pol: 0.1, fog: 3, bin: 0.29 },
      cost: {
        ir: [8.0, 0.0, 7.1, 18.6],
        pol: [0.0, 8.3, 19.4, 34.1],
        fog: [0.0, 9.0, 19.0, 34.5],
        bin: [0.0, 2.0, 5.7, 10.9],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 2, bin: 0 },
      peak: 97,
      reading: { ir: 7, pol: 0.79, fog: 35, bin: 0.06 },
      cost: {
        ir: [30.9, 19.6, 8.9, 0.0],
        pol: [27.7, 18.9, 6.9, 0.0],
        fog: [18.4, 8.4, 0.0, 7.8],
        bin: [0.0, 2.4, 6.1, 10.2],
      },
    },
    {
      target: { ir: 0, pol: 1, fog: 3, bin: 0 },
      peak: 97,
      reading: { ir: 81, pol: 0.32, fog: 51, bin: 0.21 },
      cost: {
        ir: [0.0, 7.2, 19.7, 32.7],
        pol: [8.3, 0.0, 6.6, 19.4],
        fog: [28.8, 18.0, 7.8, 0.0],
        bin: [0.0, 2.2, 6.1, 10.4],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 1, bin: 0 },
      peak: 97,
      reading: { ir: 9, pol: 0.9, fog: 22, bin: 0.22 },
      cost: {
        ir: [29.3, 19.8, 7.7, 0.0],
        pol: [29.2, 19.0, 8.1, 0.0],
        fog: [6.6, 0.0, 7.0, 19.3],
        bin: [0.0, 2.4, 5.9, 10.6],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 2, bin: 3 },
      peak: 96,
      reading: { ir: 78, pol: 0.11, fog: 30, bin: 1.49 },
      cost: {
        ir: [0.0, 6.9, 17.6, 29.3],
        pol: [0.0, 8.4, 18.2, 29.1],
        fog: [18.0, 8.7, 0.0, 8.4],
        bin: [10.3, 5.9, 2.4, 0.0],
      },
    },
    {
      target: { ir: 3, pol: 2, fog: 0, bin: 0 },
      peak: 97,
      reading: { ir: 12, pol: 0.59, fog: 6, bin: 0.25 },
      cost: {
        ir: [33.7, 17.7, 6.9, 0.0],
        pol: [18.5, 7.4, 0.0, 7.4],
        fog: [0.0, 8.5, 19.0, 35.2],
        bin: [0.0, 2.3, 5.8, 11.0],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 2, bin: 0 },
      peak: 96,
      reading: { ir: 11, pol: 0.93, fog: 41, bin: 0.17 },
      cost: {
        ir: [31.8, 19.7, 6.6, 0.0],
        pol: [34.1, 19.2, 7.7, 0.0],
        fog: [18.4, 7.8, 0.0, 6.8],
        bin: [0.0, 2.3, 6.5, 10.1],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 0, bin: 1 },
      peak: 96,
      reading: { ir: 65, pol: 0.12, fog: 2, bin: 0.62 },
      cost: {
        ir: [0.0, 7.7, 19.9, 29.8],
        pol: [0.0, 8.5, 18.6, 34.4],
        fog: [0.0, 6.6, 16.6, 36.9],
        bin: [2.3, 0.0, 2.1, 6.1],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 2, bin: 0 },
      peak: 96,
      reading: { ir: 82, pol: 0.1, fog: 41, bin: 0.08 },
      cost: {
        ir: [0.0, 6.5, 18.9, 28.2],
        pol: [0.0, 7.7, 17.1, 37.3],
        fog: [19.8, 8.9, 0.0, 7.6],
        bin: [0.0, 2.2, 5.4, 10.7],
      },
    },
    {
      target: { ir: 2, pol: 1, fog: 0, bin: 3 },
      peak: 96,
      reading: { ir: 31, pol: 0.45, fog: 3, bin: 1.27 },
      cost: {
        ir: [19.7, 8.1, 0.0, 7.1],
        pol: [7.9, 0.0, 8.1, 17.3],
        fog: [0.0, 8.3, 19.7, 28.1],
        bin: [10.9, 6.5, 2.4, 0.0],
      },
    },
    {
      target: { ir: 0, pol: 3, fog: 0, bin: 2 },
      peak: 97,
      reading: { ir: 83, pol: 0.9, fog: 7, bin: 1.11 },
      cost: {
        ir: [0.0, 8.6, 19.9, 30.7],
        pol: [29.7, 19.3, 7.6, 0.0],
        fog: [0.0, 6.8, 19.4, 32.2],
        bin: [6.3, 2.3, 0.0, 2.4],
      },
    },
  ],
  [
    {
      target: { ir: 0, pol: 3, fog: 2, bin: 2 },
      peak: 96,
      reading: { ir: 83, pol: 0.79, fog: 33, bin: 1.07 },
      cost: {
        ir: [0.0, 8.9, 19.3, 31.2],
        pol: [26.8, 17.2, 7.5, 0.0],
        fog: [19.0, 8.6, 0.0, 6.6],
        bin: [5.8, 2.3, 0.0, 2.3],
      },
    },
    {
      target: { ir: 3, pol: 0, fog: 1, bin: 1 },
      peak: 97,
      reading: { ir: 7, pol: 0.19, fog: 14, bin: 0.52 },
      cost: {
        ir: [32.7, 19.6, 8.5, 0.0],
        pol: [0.0, 8.8, 18.5, 30.8],
        fog: [6.5, 0.0, 8.6, 19.5],
        bin: [2.1, 0.0, 2.2, 6.6],
      },
    },
    {
      target: { ir: 0, pol: 3, fog: 3, bin: 0 },
      peak: 97,
      reading: { ir: 68, pol: 0.89, fog: 54, bin: 0.21 },
      cost: {
        ir: [0.0, 8.1, 18.3, 29.4],
        pol: [27.2, 19.9, 8.6, 0.0],
        fog: [36.3, 18.2, 8.2, 0.0],
        bin: [0.0, 2.4, 5.6, 11.0],
      },
    },
    {
      target: { ir: 3, pol: 2, fog: 0, bin: 3 },
      peak: 97,
      reading: { ir: 9, pol: 0.57, fog: 8, bin: 1.27 },
      cost: {
        ir: [29.2, 18.1, 7.1, 0.0],
        pol: [19.2, 8.8, 0.0, 7.9],
        fog: [0.0, 7.3, 18.4, 36.7],
        bin: [10.9, 6.1, 2.0, 0.0],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 3, bin: 3 },
      peak: 97,
      reading: { ir: 66, pol: 0.18, fog: 54, bin: 1.53 },
      cost: {
        ir: [0.0, 7.5, 19.3, 35.7],
        pol: [0.0, 8.2, 19.4, 36.7],
        fog: [37.2, 19.5, 8.6, 0.0],
        bin: [10.6, 6.3, 2.3, 0.0],
      },
    },
    {
      target: { ir: 3, pol: 0, fog: 3, bin: 3 },
      peak: 97,
      reading: { ir: 9, pol: 0.04, fog: 50, bin: 1.43 },
      cost: {
        ir: [34.2, 19.1, 7.8, 0.0],
        pol: [0.0, 6.5, 17.9, 35.6],
        fog: [31.8, 18.1, 8.6, 0.0],
        bin: [10.5, 5.5, 2.3, 0.0],
      },
    },
    {
      target: { ir: 3, pol: 0, fog: 2, bin: 0 },
      peak: 96,
      reading: { ir: 8, pol: 0.11, fog: 33, bin: 0.2 },
      cost: {
        ir: [27.7, 19.7, 8.0, 0.0],
        pol: [0.0, 8.2, 19.9, 27.2],
        fog: [16.6, 7.2, 0.0, 7.8],
        bin: [0.0, 2.2, 5.9, 10.7],
      },
    },
    {
      target: { ir: 2, pol: 0, fog: 3, bin: 3 },
      peak: 96,
      reading: { ir: 26, pol: 0.16, fog: 52, bin: 1.5 },
      cost: {
        ir: [19.3, 6.6, 0.0, 7.7],
        pol: [0.0, 6.8, 18.1, 27.3],
        fog: [28.3, 19.6, 7.0, 0.0],
        bin: [10.6, 6.2, 2.2, 0.0],
      },
    },
    {
      target: { ir: 1, pol: 1, fog: 3, bin: 0 },
      peak: 96,
      reading: { ir: 43, pol: 0.41, fog: 57, bin: 0.28 },
      cost: {
        ir: [8.8, 0.0, 8.9, 18.2],
        pol: [7.3, 0.0, 7.2, 19.8],
        fog: [34.8, 17.9, 7.9, 0.0],
        bin: [0.0, 2.4, 6.6, 10.2],
      },
    },
    {
      target: { ir: 3, pol: 2, fog: 0, bin: 0 },
      peak: 96,
      reading: { ir: 7, pol: 0.62, fog: 7, bin: 0.07 },
      cost: {
        ir: [28.7, 17.6, 7.1, 0.0],
        pol: [17.6, 7.7, 0.0, 6.7],
        fog: [0.0, 8.2, 17.3, 33.1],
        bin: [0.0, 2.3, 6.0, 10.7],
      },
    },
    {
      target: { ir: 3, pol: 1, fog: 3, bin: 3 },
      peak: 96,
      reading: { ir: 9, pol: 0.42, fog: 57, bin: 1.51 },
      cost: {
        ir: [34.1, 17.5, 6.9, 0.0],
        pol: [7.7, 0.0, 7.8, 16.9],
        fog: [33.2, 19.6, 8.7, 0.0],
        bin: [10.6, 5.4, 2.5, 0.0],
      },
    },
    {
      target: { ir: 0, pol: 3, fog: 1, bin: 0 },
      peak: 97,
      reading: { ir: 85, pol: 0.85, fog: 14, bin: 0.28 },
      cost: {
        ir: [0.0, 6.9, 18.0, 29.6],
        pol: [37.4, 17.5, 7.4, 0.0],
        fog: [7.0, 0.0, 8.9, 17.9],
        bin: [0.0, 2.3, 6.2, 10.8],
      },
    },
    {
      target: { ir: 0, pol: 0, fog: 0, bin: 0 },
      peak: 97,
      reading: { ir: 78, pol: 0.08, fog: 5, bin: 0.21 },
      cost: {
        ir: [0.0, 6.6, 19.2, 33.1],
        pol: [0.0, 7.2, 18.8, 29.7],
        fog: [0.0, 8.6, 17.7, 37.6],
        bin: [0.0, 2.5, 5.9, 10.1],
      },
    },
    {
      target: { ir: 3, pol: 3, fog: 3, bin: 2 },
      peak: 97,
      reading: { ir: 11, pol: 0.94, fog: 53, bin: 0.96 },
      cost: {
        ir: [29.2, 18.6, 8.5, 0.0],
        pol: [37.1, 17.7, 8.6, 0.0],
        fog: [34.3, 19.2, 8.8, 0.0],
        bin: [6.4, 2.4, 0.0, 2.4],
      },
    },
    {
      target: { ir: 0, pol: 3, fog: 0, bin: 2 },
      peak: 97,
      reading: { ir: 67, pol: 0.9, fog: 3, bin: 1.06 },
      cost: {
        ir: [0.0, 7.3, 19.9, 34.2],
        pol: [31.5, 17.8, 8.5, 0.0],
        fog: [0.0, 8.0, 19.3, 28.1],
        bin: [6.3, 2.2, 0.0, 2.4],
      },
    },
  ],
];

/** Variant for a suspect round: a different bit of the seed per round, so a repeat attempt can differ. */
export const lensFor = (roundIdx: number, seed: number): LensVariant => {
  const bank = LENS_VARIANTS[roundIdx];
  return bank[(Math.imul((seed >>> 0) ^ (0x85ebca6b * (roundIdx + 1)), 2654435761) >>> 0) % bank.length];
};

/** Live ANPR confidence (0-100, one decimal) for a combination of filter positions. */
export const computeConfidence = (v: LensVariant, levels: FilterLevels): number => {
  let c = v.peak;
  for (const k of FILTER_KEYS) c -= v.cost[k][levels[k]];
  return Math.max(5, Math.min(99.9, Math.round(c * 10) / 10));
};

/** Confidence lost to one filter at its current position. */
export const costOf = (v: LensVariant, k: FilterKey, pos: number): number => v.cost[k][pos];
