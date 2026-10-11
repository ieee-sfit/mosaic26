import { useTween } from '../utils';

const TOTAL_STEPS = 8;
const MAX_KMH = 184;
const CX = 180;
const CY = 150;

/**
 * Roadside speed-trap gantry: radar speedometer, optical focus rings and
 * strobe capacitors. `steps` = verified lookups (0–8); `fired` = interlock engaged.
 */
export default function RadarUnit({
  steps,
  fired,
  flashKey,
}: {
  steps: number;
  fired: boolean;
  flashKey: number;
}) {
  const charge = (steps / TOTAL_STEPS) * 100;
  const speed = useTween(Math.round((steps / TOTAL_STEPS) * MAX_KMH), 700);
  const chargeSmooth = useTween(charge, 700);
  const rings = [46, 37, 28, 19];

  return (
    <svg
      className={`ws3-radar ${fired ? 'is-fired' : ''}`}
      viewBox="0 0 360 450"
      role="img"
      aria-label={`Speed trap radar unit. Radar ${Math.round(speed)} km/h, strobe ${Math.round(chargeSmooth)} percent charged.`}
    >
      <defs>
        <linearGradient id="ws3-beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="ws3-burst">
          <stop offset="0" stopColor="#fffbe0" stopOpacity="1" />
          <stop offset="0.35" stopColor="#facc15" stopOpacity="0.7" />
          <stop offset="1" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ws3-cap-clip">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={78 + i * 56} y={350} width={26} height={54} />
          ))}
        </clipPath>
      </defs>

      {/* road + gantry */}
      <rect x="0" y="420" width="360" height="30" fill="#05070c" />
      <line x1="0" y1="435" x2="360" y2="435" className="ws3-road-dash" />
      <rect x="22" y="40" width="14" height="384" fill="url(#ws3-beam)" stroke="#334155" />
      <rect x="324" y="40" width="14" height="384" fill="url(#ws3-beam)" stroke="#334155" />
      <rect x="14" y="32" width="332" height="26" fill="url(#ws3-beam)" stroke="#facc15" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={26 + i * 41} y={40} width={22} height={10} className={i < steps ? 'ws3-gantry-led is-on' : 'ws3-gantry-led'} />
      ))}

      {/* camera housing */}
      <polygon points="120,92 240,92 258,110 258,200 240,214 120,214 102,200 102,110" fill="#0b1220" stroke="#06b6d4" strokeWidth="1.5" />
      <line x1={CX} y1="58" x2={CX} y2="92" stroke="#334155" strokeWidth="6" />

      {/* focus rings: snap in as steps verify (2 steps per ring) */}
      {rings.map((r, i) => {
        const snapped = steps >= (i + 1) * 2;
        return (
          <circle
            key={r}
            cx={CX}
            cy={CY}
            r={r}
            className={`ws3-ring ${snapped ? 'is-snapped' : ''}`}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        );
      })}
      <circle cx={CX} cy={CY} r="10" className={`ws3-lens ${steps >= 8 ? 'is-hot' : ''}`} />
      <circle cx={CX - 3} cy={CY - 3} r="2.5" fill="#fff" opacity="0.8" />

      {/* radar speedometer */}
      <polygon points="76,226 284,226 296,238 296,292 284,304 76,304 64,292 64,238" fill="#05070c" stroke="#facc15" strokeWidth="1.5" />
      <text x="78" y="246" className="ws3-svg-label">RADAR_SPEED</text>
      <text x="250" y="288" textAnchor="end" className="ws3-speed-digits">{String(Math.round(speed)).padStart(3, '0')}</text>
      <text x="256" y="288" className="ws3-svg-label">KMH</text>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <rect key={i} x={78 + i * 26} y="294" width="20" height="5" className={i < steps ? 'ws3-seg is-on' : 'ws3-seg'} />
      ))}

      {/* strobe capacitors */}
      <text x="78" y="338" className="ws3-svg-label">STROBE_CAPACITORS</text>
      {[0, 1, 2, 3].map((i) => {
        const fill = Math.max(0, Math.min(1, (chargeSmooth - i * 25) / 25));
        return (
          <g key={i}>
            <rect x={78 + i * 56} y={350} width={26} height={54} fill="#05070c" stroke="#475569" />
            <rect
              x={78 + i * 56}
              y={404 - 54 * fill}
              width={26}
              height={54 * fill}
              className={fired ? 'ws3-cap-fill is-fired' : 'ws3-cap-fill'}
              clipPath="url(#ws3-cap-clip)"
            />
          </g>
        );
      })}
      <rect x="78" y="412" width="220" height="6" fill="#0b1220" stroke="#334155" />
      <rect x="78" y="412" width={(220 * chargeSmooth) / 100} height="6" className={fired ? 'ws3-charge is-fired' : 'ws3-charge'} />
      <text x="304" y="418" className="ws3-svg-label">{Math.round(chargeSmooth)}%</text>

      {/* calibration flash */}
      {flashKey > 0 && <circle key={flashKey} cx={CX} cy={CY} r="40" fill="url(#ws3-burst)" className="ws3-burst" />}
    </svg>
  );
}
