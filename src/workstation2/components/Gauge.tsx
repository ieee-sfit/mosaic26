interface Props {
  /** 0..1 needle position. */
  value: number;
  /** Fraction where the limit sits: the arc past it is the red zone. */
  limitAt?: number;
  /** Label lines drawn beside the limit tick, e.g. ["80%", "LIMIT"]. */
  limitLines?: string[];
  label: string;
  readout: string;
  /** Short tag above the dial, e.g. "SPIKE +0.8M". */
  badge?: string;
  active?: boolean;
  alert?: boolean;
  /** Numerals at 0 and full scale. */
  ends?: [string, string];
}

const START = -120;
const SWEEP = 240;
const CX = 100;
const CY = 104;
const R = 76;
const pt = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = pt(START + from * SWEEP, r);
  const [x2, y2] = pt(START + to * SWEEP, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${(to - from) * SWEEP > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/**
 * Flat dark dial. Safe arc, red zone past the limit, a bright limit tick with its label, and a needle that moves by
 * CSS transform. Drawn at 236x196 units: show it at 236 px wide or more so the 13-unit text stays 13 px.
 */
export default function Gauge({ value, limitAt = 0.8, limitLines = ['80%', 'LIMIT'], label, readout, badge, active = true, alert = false, ends = ['0', '100'] }: Props) {
  const v = active ? Math.max(0, Math.min(1.04, value)) : 0;
  const deg = START + v * SWEEP;
  const lim = START + limitAt * SWEEP;
  const [tx1, ty1] = pt(lim, R - 11);
  const [tx2, ty2] = pt(lim, R + 11);
  const [lx, ly] = pt(lim, R + 14);
  const [e0x, e0y] = pt(START, R + 20);
  const [e1x, e1y] = pt(START + SWEEP, R + 20);
  return (
    <figure className={`ws2-gauge ${active ? '' : 'is-standby'} ${alert ? 'is-alert' : ''}`}>
      <div className={`ws2-gauge__badge ${badge ? 'on' : ''}`}>{badge ?? ' '}</div>
      <svg viewBox="0 0 236 196" role="meter" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
        <path d={arc(0, 1, R)} className="ws2-gauge__track" />
        <path d={arc(0, Math.min(v, 1), R)} className="ws2-gauge__fill" />
        <path d={arc(limitAt, 1, R)} className="ws2-gauge__red" />
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} className="ws2-gauge__limit" />
        <text className="ws2-gtxt ws2-gtxt--lim" textAnchor="start">
          {limitLines.map((t, i) => <tspan key={t} x={lx + 4} y={ly + 3 + i * 14}>{t}</tspan>)}
        </text>
        <text x={e0x - 2} y={e0y + 12} className="ws2-gtxt" textAnchor="middle">{ends[0]}</text>
        <text x={e1x + 2} y={e1y + 12} className="ws2-gtxt" textAnchor="middle">{ends[1]}</text>
        <text x={CX} y="150" className="ws2-glabel" textAnchor="middle">{label}</text>
        <text x={CX} y="178" className="ws2-gread" textAnchor="middle">{active ? readout : '--'}</text>
        <g className="ws2-needle" style={{ transform: `rotate(${deg}deg)` }}>
          <polygon points={`${CX},${CY - R + 4} ${CX - 4},${CY} ${CX + 4},${CY}`} className="ws2-needle__blade" />
        </g>
        <rect x={CX - 6} y={CY - 6} width="12" height="12" className="ws2-gcap" />
      </svg>
    </figure>
  );
}
