import { useTween } from '../utils';

const R = 90;
const CX = 110;
const CY = 112;
const LEN = Math.PI * R;
const polar = (p: number, r: number) => ({
  x: CX - r * Math.cos(Math.PI * p),
  y: CY - r * Math.sin(Math.PI * p),
});

export default function ConfidenceGauge({ value, threshold }: { value: number; threshold: number }) {
  const v = useTween(value, 450);
  const p = Math.max(0, Math.min(1, v / 100));
  const t0 = polar(threshold / 100, R - 14);
  const t1 = polar(threshold / 100, R + 10);
  const needle = polar(p, R - 22);
  const tier = value >= threshold ? 'ok' : value >= 45 ? 'mid' : 'low';

  return (
    <div className={`ws3-gauge ws3-gauge--${tier}`}>
      <svg viewBox="0 0 220 132" role="img" aria-label={`AI confidence ${value.toFixed(1)} percent, target ${threshold} percent`}>
        <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="ws3-gauge-track" />
        <path
          d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          className="ws3-gauge-fill"
          strokeDasharray={`${LEN * p} ${LEN}`}
        />
        <line x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} className="ws3-gauge-mark" />
        <text x={t1.x + 4} y={t1.y - 2} className="ws3-svg-label">{threshold}</text>
        <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} className="ws3-gauge-needle" />
        <circle cx={CX} cy={CY} r="5" className="ws3-gauge-hub" />
        <text x="16" y="128" className="ws3-svg-label">0</text>
        <text x="192" y="128" className="ws3-svg-label">100</text>
      </svg>
      <div className="ws3-gauge-val">{v.toFixed(1)}<small>%</small></div>
      <div className="ws3-gauge-cap">AI_CONFIDENCE</div>
    </div>
  );
}
