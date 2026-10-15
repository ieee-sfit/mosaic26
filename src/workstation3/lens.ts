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

/** Round 1 = TWIN 1, round 2 = the traffic car, round 3 = TWIN 2. Two authored variants each, picked by the run seed. */
export const LENS_VARIANTS: [LensVariant, LensVariant][] = [
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
  ],
];

/** Variant for a suspect round: a different bit of the seed per round, so a repeat attempt can differ. */
export const lensFor = (roundIdx: number, seed: number): LensVariant => LENS_VARIANTS[roundIdx][(seed >>> (3 + roundIdx)) & 1];

/** Live ANPR confidence (0-100, one decimal) for a combination of filter positions. */
export const computeConfidence = (v: LensVariant, levels: FilterLevels): number => {
  let c = v.peak;
  for (const k of FILTER_KEYS) c -= v.cost[k][levels[k]];
  return Math.max(5, Math.min(99.9, Math.round(c * 10) / 10));
};

/** Confidence lost to one filter at its current position. */
export const costOf = (v: LensVariant, k: FilterKey, pos: number): number => v.cost[k][pos];
