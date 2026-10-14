/**
 * Own vector drawing of the La Sarthe circuit, laid out horizontally: the Mulsanne straight runs along the top edge,
 * the pit straight along the bottom. Plate is 1000x400. Control points start at the start/finish line and run in the
 * direction of travel. Nothing here is traced from a source image: it is a schematic.
 */
export const MAP_W = 1000;
export const MAP_H = 400;

type Pt = readonly [number, number];

const CONTROL: Pt[] = [
  [330, 352], [262, 350], [226, 343], [200, 350], [160, 345], [112, 330], [84, 296], [80, 252], [96, 214], [72, 180], [88, 146],
  [76, 110], [102, 78], [152, 64], [230, 56], [400, 54], [600, 54], [780, 56], [852, 58], [906, 74], [934, 108], [942, 150],
  [928, 196], [906, 222], [874, 238], [846, 252], [838, 284], [858, 314], [880, 338], [840, 352], [790, 348], [746, 330],
  [706, 320], [668, 332], [630, 350], [586, 346], [546, 328], [470, 348], [400, 354],
];

/** Uniform Catmull-Rom through the points, closed. Returns the SVG path and an arc-length sampled polyline. */
function build(points: Pt[]) {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${at(0)[0]} ${at(0)[1]}`;
  const samples: { x: number; y: number; len: number }[] = [{ x: at(0)[0], y: at(0)[1], len: 0 }];
  let len = 0;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    let prev = p1;
    for (let k = 1; k <= 12; k++) {
      const t = k / 12, u = 1 - t;
      const x = u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0];
      const y = u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1];
      len += Math.hypot(x - prev[0], y - prev[1]);
      samples.push({ x, y, len });
      prev = [x, y];
    }
  }
  return { d: `${d} Z`, samples, total: len };
}

const B = build(CONTROL);
export const CIRCUIT_D = B.d;
export const LAP_KM = 13.629;

/** Point and heading (degrees, 0 = pointing right) at a fraction 0..1 of the lap, measured from the start line. */
export function trackAt(frac: number): { x: number; y: number; angle: number } {
  const f = ((frac % 1) + 1) % 1;
  const target = f * B.total;
  let lo = 0, hi = B.samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (B.samples[mid].len <= target) lo = mid; else hi = mid;
  }
  const a = B.samples[lo], b = B.samples[hi];
  const span = Math.max(1e-6, b.len - a.len);
  const k = (target - a.len) / span;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

/** Fraction of the lap at which each landmark sits (found once from the geometry). */
const nearest = (x: number, y: number): number => {
  let best = 0, bd = Infinity;
  for (const s of B.samples) {
    const d2 = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d2 < bd) { bd = d2; best = s.len / B.total; }
  }
  return best;
};

export interface Landmark { id: string; label: string; x: number; y: number; lx: number; ly: number; anchor?: 'start' | 'middle' | 'end'; frac: number }
const mk = (id: string, label: string, x: number, y: number, lx: number, ly: number, anchor: Landmark['anchor'] = 'middle'): Landmark =>
  ({ id, label, x, y, lx, ly, anchor, frac: nearest(x, y) });

/** Named places. (x, y) is on the track; (lx, ly) is where the label sits. */
export const LANDMARKS: Landmark[] = [
  mk('dunlop', 'DUNLOP', 96, 322, 40, 336, 'middle'),
  mk('esses', 'ESSES', 80, 200, 42, 200, 'middle'),
  mk('tertre', 'TERTRE ROUGE', 100, 80, 110, 34, 'start'),
  mk('mulsanne', 'MULSANNE', 934, 108, 934, 34, 'end'),
  mk('indy', 'INDY', 914, 214, 968, 218, 'end'),
  mk('arnage', 'ARNAGE', 868, 322, 940, 346, 'end'),
  mk('scurves', 'S-CURVES', 688, 322, 688, 382, 'middle'),
];

export const START_FRAC = 0;
export const PIT_WALL = { x: 330, y: 352 };
