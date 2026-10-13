import type { ReactNode } from 'react';
import { CIRCUIT_D, LANDMARKS, MAP_H, MAP_W, PIT_WALL } from '../track';

interface Props {
  children?: ReactNode;
  className?: string;
  label?: string;
  /** Named corners. Off for compact maps. */
  names?: boolean;
  /** Tiny labels for the faint chicanes and Bugatti loop. */
  faintLabels?: boolean;
}

const CHICANES = [
  { d: 'M 326 54 L 350 54 L 362 67 L 392 67 L 404 54 L 428 54', lx: 377, ly: 38, t: 'CHICANE 1' },
  { d: 'M 556 54 L 580 54 L 592 67 L 622 67 L 634 54 L 658 54', lx: 607, ly: 38, t: 'CHICANE 2' },
];
const BUGATTI = 'M 152 306 C 140 272 196 250 246 262 C 296 274 296 318 258 326 C 222 334 164 330 152 306 Z';

/** Schematic circuit plate. Chicanes and the Bugatti loop are drawn faint. Children are drawn on top, in plate units. */
export default function LeMansMap({ children, className = '', label = 'Circuit map', names = true, faintLabels = true }: Props) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={`ws2-lm ${className}`} role="group" aria-label={label}>
      {faintLabels && (
      <g className="ws2-lm__faintlbl" aria-hidden>
        <text x="222" y="298" textAnchor="middle">BUGATTI</text>
        {CHICANES.map((c) => <text key={c.t} x={c.lx} y={c.ly} textAnchor="middle">{c.t}</text>)}
      </g>
      )}

      <path d={CIRCUIT_D} className="ws2-lm__edge" />
      <path d={CIRCUIT_D} className="ws2-lm__road" />
      <path d={CIRCUIT_D} className="ws2-lm__centre" />
      <g className="ws2-lm__faint" aria-hidden>
        <path d={BUGATTI} className="ws2-lm__bugatti" />
        {CHICANES.map((c) => <path key={c.t} d={c.d} className="ws2-lm__chicane" />)}
      </g>

      <g aria-hidden>
        <rect x={PIT_WALL.x - 62} y="368" width="150" height="6" className="ws2-lm__pit" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={PIT_WALL.x - 2} y={341 + i * 6} width="4" height="6" className={i % 2 ? 'ws2-lm__chq-a' : 'ws2-lm__chq-b'} />
        ))}
        {names && LANDMARKS.map((l) => (
          <text key={l.id} x={l.lx} y={l.ly} textAnchor={l.anchor} className="ws2-lm__name">{l.label}</text>
        ))}
      </g>
      {children}
    </svg>
  );
}
