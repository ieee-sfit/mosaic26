import { useId } from 'react';

interface Props {
  /** 0..1 needle position. */
  value: number;
  /** Fraction where the red zone starts. */
  redFrom?: number;
  label: string;
  readout: string;
  /** Small tag above the face, e.g. "SPIKE +0.8M". */
  badge?: string;
  active?: boolean;
  alert?: boolean;
  /** Tick numerals, shown as percent of full scale unless `scale` is given. */
  scale?: string[];
}

const START = -120;
const SWEEP = 240;
const C = 100;
const pt = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = pt(START + from * SWEEP, r);
  const [x2, y2] = pt(START + to * SWEEP, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${(to - from) * SWEEP > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
const TICKS = Array.from({ length: 21 }, (_, i) => i);

/** Silver-faced analog gauge with a red danger arc. The needle moves by CSS transform with a spring-like overshoot. */
export default function Gauge({ value, redFrom = 0.8, label, readout, badge, active = true, alert = false, scale = ['0', '25', '50', '75', '100'] }: Props) {
  const uid = useId().replace(/:/g, '');
  const v = active ? Math.max(0, Math.min(1.04, value)) : 0;
  const deg = START + v * SWEEP;
  return (
    <figure className={`ws2-gauge ${active ? '' : 'is-standby'} ${alert ? 'is-alert' : ''}`}>
      <div className={`ws2-gauge__badge ${badge ? 'on' : ''}`}>{badge ?? '\u00a0'}</div>
      <svg viewBox="0 0 200 200" role="meter" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
        <defs>
          <radialGradient id={`f${uid}`} cx="42%" cy="34%" r="80%">
            <stop offset="0" stopColor="#f3eee2" />
            <stop offset="0.7" stopColor="#c9c1b0" />
            <stop offset="1" stopColor="#8f8878" />
          </radialGradient>
          <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6b5a3c" />
            <stop offset="0.5" stopColor="#2a2116" />
            <stop offset="1" stopColor="#8a7347" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill={`url(#b${uid})`} />
        <circle cx="100" cy="100" r="90" className="ws2-gauge__alert" />
        <circle cx="100" cy="100" r="90" fill={`url(#f${uid})`} />
        <path d={arc(redFrom, 1, 78)} className="ws2-gauge__red" />
        {TICKS.map((i) => {
          const major = i % 5 === 0;
          const a = START + (i / 20) * SWEEP;
          const [x1, y1] = pt(a, major ? 70 : 74);
          const [x2, y2] = pt(a, 82);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'ws2-gtick ws2-gtick--major' : 'ws2-gtick'} />;
        })}
        {scale.map((n, i) => {
          const [x, y] = pt(START + (i / (scale.length - 1)) * SWEEP, 56);
          return <text key={n + i} x={x} y={y + 3.5} className="ws2-gnum" textAnchor="middle">{n}</text>;
        })}
        <text x="100" y="146" className="ws2-glabel" textAnchor="middle">{label}</text>
        <text x="100" y="168" className="ws2-gread" textAnchor="middle">{active ? readout : '--'}</text>
        <g className="ws2-needle" style={{ transform: `rotate(${deg}deg)` }}>
          <polygon points="100,22 96,104 104,104" className="ws2-needle__blade" />
          <polygon points="96,104 104,104 103,120 97,120" className="ws2-needle__tail" />
        </g>
        <circle cx="100" cy="100" r="10" className="ws2-gcap" />
        <circle cx="100" cy="100" r="3" className="ws2-gcap__dot" />
        <ellipse cx="78" cy="52" rx="38" ry="16" className="ws2-gglass" transform="rotate(-24 78 52)" />
      </svg>
    </figure>
  );
}
