import { useMemo } from 'react';
import { BEAMS, CAR_FRACTIONS, TRACK_NODES, TRACK_PATH } from '../mockStation2Data';

type Pt = { x: number; y: number };

function samplePoints() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', TRACK_PATH);
  const len = path.getTotalLength();
  const at = (f: number): Pt => {
    const p = path.getPointAtLength(((f % 1) + 1) % 1 * len);
    return { x: p.x, y: p.y };
  };
  const nodes: Record<string, Pt> = {};
  TRACK_NODES.forEach((n) => { nodes[n.id] = at(n.fraction); });
  return { nodes, car: CAR_FRACTIONS.map(at) };
}

function arc(a: Pt, b: Pt, bow: number) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow, cy = my + (dx / len) * bow;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export default function TrackMap({ verified, interlocked }: { verified: number; interlocked: boolean }) {
  const pts = useMemo(samplePoints, []);
  const idx = Math.min(verified, CAR_FRACTIONS.length - 1);
  const car = pts.car[interlocked ? CAR_FRACTIONS.length - 1 : idx];
  const pos = (id: string) => (id === 'car' ? car : pts.nodes[id]);
  const lit = interlocked ? BEAMS.length : verified;

  const pct = (towerId: string) => {
    const touching = BEAMS.map((b, i) => ({ b, i })).filter(({ b }) => b.from === towerId || b.to === towerId);
    const on = touching.filter(({ i }) => i < lit).length;
    return Math.round((on / touching.length) * 100);
  };

  return (
    <svg viewBox="0 0 800 400" className="ws2-map" role="img" aria-label="Circuit de la Sarthe track relay map">
      <defs>
        <pattern id="ws2-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.6" />
        </pattern>
        <filter id="ws2-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="800" height="400" fill="url(#ws2-grid)" />
      <text x="16" y="24" className="ws2-map-txt">CIRCUIT DE LA SARTHE // 13.629 KM</text>
      <text x="16" y="40" className="ws2-map-txt ws2-dim-svg">1966 24H LE MANS // RELAY NET</text>

      <path d={TRACK_PATH} fill="none" stroke="#334155" strokeWidth="22" strokeLinejoin="round" />
      <path d={TRACK_PATH} fill="none" stroke="#090d16" strokeWidth="18" strokeLinejoin="round" />
      <path d={TRACK_PATH} fill="none" stroke={interlocked ? '#22c55e' : '#38bdf8'} strokeWidth="1.4" strokeDasharray="10 8"
        className={interlocked ? 'ws2-flow ws2-flow-fast' : 'ws2-flow'} opacity="0.85" />

      {BEAMS.map((b, i) => {
        if (i >= lit) return null;
        const a = pos(b.from), z = pos(b.to);
        const color = interlocked ? '#f59e0b' : i < 4 ? '#f59e0b' : '#ef4444';
        return (
          <g key={b.id}>
            <path d={arc(a, z, b.bow)} stroke={color} strokeWidth="5" fill="none" opacity="0.25" filter="url(#ws2-glow)" />
            <path d={arc(a, z, b.bow)} stroke={color} strokeWidth="1.8" fill="none" strokeDasharray="6 5" className="ws2-beam" />
          </g>
        );
      })}

      {TRACK_NODES.map((n) => {
        const p = pts.nodes[n.id];
        const v = pct(n.id);
        const full = v === 100;
        const c = full ? '#22c55e' : v > 0 ? '#f59e0b' : '#64748b';
        const labelRight = p.x < 400;
        return (
          <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
            <circle r="14" fill="#090d16" stroke={c} strokeWidth="1.5" opacity="0.9" />
            <path d="M 0 -9 L 6 7 L -6 7 Z" fill="none" stroke={c} strokeWidth="1.6" />
            <line x1="0" y1="-9" x2="0" y2="-17" stroke={c} strokeWidth="1.6" />
            {v > 0 && <circle r="20" fill="none" stroke={c} strokeWidth="1" className="ws2-pulse" />}
            <text x={labelRight ? 24 : -24} y="-2" textAnchor={labelRight ? 'start' : 'end'} className="ws2-map-txt" fill={c}>{n.label}</text>
            <text x={labelRight ? 24 : -24} y="12" textAnchor={labelRight ? 'start' : 'end'} className="ws2-map-txt" fill={c}>LINK {v}%</text>
          </g>
        );
      })}

      <g transform={`translate(${car.x} ${car.y})`} className="ws2-car">
        <polygon points="-11,-5 9,-5 14,0 9,5 -11,5" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.2" />
        <rect x="-4" y="-2.5" width="7" height="5" fill="#090d16" />
        <text y="-12" textAnchor="middle" className="ws2-map-txt" fill="#fef08a">GT40 #1 K.MILES</text>
      </g>

      {interlocked && (
        <text x="400" y="385" textAnchor="middle" className="ws2-map-txt" fill="#22c55e">
          TELEMETRY LOOP STABILIZED // 3/3 BEACONS 100%
        </text>
      )}
    </svg>
  );
}
