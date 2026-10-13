import { useEffect, useRef } from 'react';
import { trackAt } from '../track';

export interface CarSpec {
  id: string;
  /** Short text beside the marker: the car number, or YOU. */
  label: string;
  /** Final position as a fraction of the lap from the start line. */
  frac: number;
  you?: boolean;
  hue?: string;
}

interface Props {
  cars: CarSpec[];
  /** Reveal length. The leader drives a full lap; everyone else stops at their fraction. */
  ms?: number;
  /** Marker size multiplier (ghosts 1x, the player 1.7x of that). */
  size?: number;
}

const ARROW = '12,0 -9,-8 -4,0 -9,8';

/**
 * Car-arrow markers on the circuit plate. Ghosts are small numbered arrows; the player is a larger YOU arrow with a slow
 * pulsing ring. They move along the track once in a short reveal (transform only, no blinking) and then stay put.
 */
export default function Cars({ cars, ms = 2400, size = 1.5 }: Props) {
  const outer = useRef<(SVGGElement | null)[]>([]);
  const body = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    const place = (k: number) => {
      cars.forEach((c, i) => {
        const p = trackAt(c.frac * k);
        outer.current[i]?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        body.current[i]?.setAttribute('transform', `rotate(${p.angle.toFixed(1)}) scale(${c.you ? size * 1.7 : size})`);
      });
    };
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { place(1); return undefined; }
    place(0);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      place(1 - (1 - k) ** 3);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cars, ms, size]);

  // the player is drawn last so it is never hidden under a ghost
  const order = cars.map((c, i) => ({ c, i })).sort((a, b) => Number(!!a.c.you) - Number(!!b.c.you));
  return (
    <g className="ws2-cars">
      {order.map(({ c, i }) => (
        <g key={c.id} ref={(el) => { outer.current[i] = el; }} className={`ws2-car ${c.you ? 'is-you' : ''}`}>
          {c.you && <circle r={20 * size} className="ws2-car__ring" />}
          <g ref={(el) => { body.current[i] = el; }}>
            <polygon points={ARROW} className="ws2-car__arrow" style={c.you || !c.hue ? undefined : { fill: c.hue }} />
          </g>
          <text y={c.you ? -26 * size : -15 * size} textAnchor="middle" className="ws2-car__lbl">{c.label}</text>
        </g>
      ))}
    </g>
  );
}
