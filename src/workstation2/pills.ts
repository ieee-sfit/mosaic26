/**
 * Places each beam's label pill. Candidates run along the beam and slightly to either side of it; the first one that
 * clears every node box and every pill already placed wins. Pure and deterministic, computed once per section.
 */
import type { Section } from './types';

export const PILL_W = 90;
export const PILL_H = 40;
const NODE_HALF_W = { T: 29, P: 29, relay: 19 };
const NODE_HALF_H = 17;
const GAP = 5;

interface Box { x: number; y: number; w: number; h: number }
const hit = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + GAP && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP;

const TS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.2, 0.8, 0.15, 0.85];
const OFFS = [0, 24, -24, 40, -40, 58, -58];

export function pillPositions(s: Section): Record<string, { x: number; y: number }> {
  const nodes: Box[] = Object.entries(s.nodes).map(([id, p]) => ({ x: p.x, y: p.y, w: 2 * (id === 'T' || id === 'P' ? NODE_HALF_W.T : NODE_HALF_W.relay) + 10, h: 2 * NODE_HALF_H + 10 }));
  const placed: Box[] = [];
  const out: Record<string, { x: number; y: number }> = {};
  const len = (b: Section['beams'][number]) => Math.hypot(s.nodes[b.a].x - s.nodes[b.b].x, s.nodes[b.a].y - s.nodes[b.b].y);
  // short beams first: they have the least room
  for (const b of [...s.beams].sort((p, q) => len(p) - len(q))) {
    const A = s.nodes[b.a];
    const B = s.nodes[b.b];
    const L = len(b);
    const ux = (B.x - A.x) / L;
    const uy = (B.y - A.y) / L;
    let best: { x: number; y: number; cost: number } | null = null;
    for (const off of OFFS) {
      for (const t of TS) {
        const x = A.x + ux * L * t - uy * off;
        const y = A.y + uy * L * t + ux * off;
        const box: Box = { x, y, w: PILL_W, h: PILL_H };
        let cost = Math.abs(off) * 0.02 + Math.abs(t - 0.5);
        if (x < PILL_W / 2 + 6 || x > 1000 - PILL_W / 2 - 6 || y < PILL_H / 2 + 24 || y > 400 - PILL_H / 2 - 4) cost += 50;
        cost += nodes.filter((n) => hit(box, n)).length * 20;
        cost += placed.filter((p) => hit(box, p)).length * 20;
        if (!best || cost < best.cost) best = { x, y, cost };
        if (cost < 1.2) { best = { x, y, cost }; break; }
      }
      if (best && best.cost < 1.2) break;
    }
    const pick = best as { x: number; y: number };
    placed.push({ x: pick.x, y: pick.y, w: PILL_W, h: PILL_H });
    out[`${b.a}${b.b}`] = { x: Math.round(pick.x), y: Math.round(pick.y) };
  }
  return out;
}
