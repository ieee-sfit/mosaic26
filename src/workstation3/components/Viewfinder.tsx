import { FILTER_KEYS, formatPlate, type FilterLevels, type SuspectRound } from '../mockStation3Data';
import { clamp } from '../utils';

export type PursuitStatus = 'live' | 'caught' | 'escaped';

const W = 640;
const H = 360;
const PX = 190; // plate rect origin
const PY = 150;
const PW = 260;
const PH = 84;

/** Deterministic rain streaks (no per-render randomness). */
const RAIN = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 97) % W;
  const y = (i * 53) % H;
  const len = 26 + ((i * 13) % 34);
  return { x1: x, y1: y, x2: x - len * 0.35, y2: y + len, delay: ((i * 7) % 10) / 10 };
});

/** How far each stage is from the sweet spot: positive = under-corrected. */
export const residuals = (target: FilterLevels, levels: FilterLevels) => ({
  ir: target.ir - levels.ir,
  pol: target.pol - levels.pol,
  fog: target.fog - levels.fog,
  bin: target.bin - levels.bin,
});

export function visualParams(target: FilterLevels, levels: FilterLevels) {
  const r = residuals(target, levels);
  const brightness = clamp(1 - 0.3 * r.ir, 0.3, 1.8);
  const blur = 2.4 * Math.abs(r.fog) + 0.9 * Math.max(r.bin, 0);
  const thin = 0.9 * Math.max(-r.bin, 0); // over-binarization breaks thin strokes
  const sharp = 1 + 2.2 * (1 - Math.min(Math.abs(r.bin), 2) / 2);
  const contrast = sharp * (1 - 0.12 * Math.max(-r.pol, 0));
  return {
    blur,
    thin,
    slope: contrast * brightness,
    intercept: 0.5 - 0.5 * contrast,
    glare: 0.3 * Math.max(r.pol, 0),
    rain: 0.05 + 0.28 * Math.max(r.fog, 0),
    dark: 0.3 * Math.max(r.ir, 0),
    wash: 0.22 * Math.max(-r.ir, 0),
    backBlur: 1.2 * Math.abs(r.fog),
  };
}

export const REVEAL_FLOOR = 18; // first glyph resolves at this confidence

/** OCR string: glyphs resolve left→right as confidence climbs. All visible by 80%. */
export function ocrRead(plate: string, noise: string, confidence: number): string {
  const text = formatPlate(plate);
  const glyphs = text.replace(/ /g, '').length;
  const span = 80 - REVEAL_FLOOR;
  let seen = 0;
  return [...text]
    .map((ch) => {
      if (ch === ' ') return ' ';
      const need = REVEAL_FLOOR + (span * seen++) / Math.max(1, glyphs - 1);
      return confidence >= need ? ch : noise;
    })
    .join('');
}

export default function Viewfinder({
  round,
  levels,
  confidence,
  status,
}: {
  round: SuspectRound;
  levels: FilterLevels;
  confidence: number;
  status: PursuitStatus;
}) {
  const v = visualParams(round.target, levels);
  const tier = confidence >= 80 ? 'ok' : confidence >= 45 ? 'mid' : 'low';
  const plateText = formatPlate(round.plate);
  const locked = status === 'caught';
  const lit = FILTER_KEYS.some((k) => levels[k] > 0);

  return (
    <div className={`ws3-vf ws3-vf--${tier} ws3-vf--${status}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ws3-vf-svg" role="img" aria-label={`Rain-blurred capture of ${round.model}. OCR confidence ${confidence.toFixed(1)} percent.`}>
        <defs>
          <linearGradient id="ws3-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#070b14" />
            <stop offset="1" stopColor="#111a2b" />
          </linearGradient>
          <radialGradient id="ws3-glare">
            <stop offset="0" stopColor="#fffbe6" stopOpacity="1" />
            <stop offset="0.5" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
          <filter id="ws3-back-blur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={v.backBlur + 0.6} />
          </filter>
          <filter id="ws3-plate-fx" x="-4%" y="-8%" width="108%" height="116%" colorInterpolationFilters="sRGB">
            {v.blur > 0.01 && <feGaussianBlur stdDeviation={v.blur} />}
            {v.thin > 0.01 && <feMorphology operator="dilate" radius={v.thin} />}
            <feComponentTransfer>
              <feFuncR type="linear" slope={v.slope} intercept={v.intercept} />
              <feFuncG type="linear" slope={v.slope} intercept={v.intercept} />
              <feFuncB type="linear" slope={v.slope} intercept={v.intercept} />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#ws3-sky)" />
        <g filter="url(#ws3-back-blur)">
          {/* street bokeh */}
          {[
            [70, 60, 26], [150, 40, 14], [540, 70, 30], [590, 120, 16], [420, 36, 12], [50, 150, 18],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#06b6d4' : '#f59e0b'} opacity="0.35" />
          ))}
          <polygon points="0,300 640,300 640,360 0,360" fill="#05070c" />
          <line x1="0" y1="330" x2="640" y2="330" stroke="#facc15" strokeWidth="2" strokeDasharray="38 30" opacity="0.5" />

          <g className="ws3-car">
            {/* rear of the car */}
            <path d="M120 130 Q150 70 320 64 Q490 70 520 130 L536 250 L104 250 Z" fill="#0c1220" stroke="#1e293b" strokeWidth="2" />
            <rect x="136" y="160" width="40" height="22" className="ws3-taillight" />
            <rect x="464" y="160" width="40" height="22" className="ws3-taillight" />
            <rect x="104" y="250" width="432" height="20" fill="#070a12" />
            <text x="320" y="118" textAnchor="middle" className="ws3-car-model">{round.model.toUpperCase()}</text>
          </g>
          <rect width={W} height={H} fill="#000" opacity={v.dark} />
        </g>

        {/* plate crop — dynamic SVG filter driven by the four stages */}
        <g filter="url(#ws3-plate-fx)">
          <rect x={PX - 8} y={PY - 8} width={PW + 16} height={PH + 16} fill="#1b2231" />
          <rect x={PX} y={PY} width={PW} height={PH} fill="#f2efd6" stroke="#0b0f19" strokeWidth="3" />
          <text
            x={PX + PW / 2}
            y={PY + PH / 2 + 15}
            textAnchor="middle"
            className="ws3-plate-text"
            textLength={PW - 28}
            lengthAdjust="spacingAndGlyphs"
          >
            {plateText}
          </text>
        </g>

        {/* environmental overlays */}
        <ellipse cx={PX + PW * 0.72} cy={PY + 10} rx="150" ry="90" fill="url(#ws3-glare)" opacity={v.glare} />
        <rect width={W} height={H} fill="#fff" opacity={v.wash} />
        <g className="ws3-rain" opacity={v.rain}>
          {RAIN.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} style={{ animationDelay: `${s.delay}s` }} />
          ))}
        </g>

        {/* scanning AI reticle */}
        <g transform={`translate(${PX + PW / 2} ${PY + PH / 2})`} className={`ws3-reticle ws3-reticle--${tier} ${locked ? 'is-locked' : ''}`}>
          <circle r="132" className="ws3-reticle-outer" />
          <circle r="112" className="ws3-reticle-ring" />
          <circle r="112" className="ws3-reticle-pulse" />
          {[0, 90, 180, 270].map((a) => (
            <line key={a} x1="0" y1="-146" x2="0" y2="-124" transform={`rotate(${a})`} className="ws3-reticle-tick" />
          ))}
          <line x1="-100" y1="0" x2="-30" y2="0" className="ws3-reticle-cross" />
          <line x1="30" y1="0" x2="100" y2="0" className="ws3-reticle-cross" />
          <line x1="0" y1="-62" x2="0" y2="-52" className="ws3-reticle-cross" />
          <line x1="0" y1="52" x2="0" y2="62" className="ws3-reticle-cross" />
        </g>
      </svg>

      <div className="ws3-vf-scan" aria-hidden="true" />
      <div className="ws3-vf-hud ws3-vf-hud--tl">
        <span>{round.label}</span>
        <span>{round.location}</span>
      </div>
      <div className="ws3-vf-hud ws3-vf-hud--tr">
        <span>ANPR_CONFIDENCE: {confidence.toFixed(1)}%</span>
        <span>FILTERS: {lit ? 'ENGAGED' : 'BYPASS'}</span>
      </div>

      {status === 'escaped' && (
        <div className="ws3-vf-banner ws3-vf-banner--red" role="alert">
          ⚠ SUSPECT HIT NITROUS — OUT OF SENSOR RANGE
        </div>
      )}
      {status === 'caught' && (
        <div className="ws3-vf-banner ws3-vf-banner--ok" role="status">
          ◉ TELEMETRY LOCKED — CHALLAN ISSUED
        </div>
      )}
    </div>
  );
}
