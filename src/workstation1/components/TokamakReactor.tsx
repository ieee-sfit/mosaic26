import { useId } from 'react';

interface Props {
  /** Verified steps out of `totalSteps` (drives solenoid charge and ring lighting). */
  stepsDone: number;
  totalSteps: number;
}

const CX = 210;
const CY = 235;
const RX = 165;
const RY = 62;
const COL_TOP = 52;
const COL_BOT = 372;
const COL_HALF = 22;

/** Sine "arc" winding around the solenoid; many phases = seamless rotating helix. */
function helixPath(phase: number, amp = 30): string {
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = COL_TOP + 6 + t * (COL_BOT - COL_TOP - 12);
    const x = CX + amp * Math.sin(t * Math.PI * 6 + phase) * (0.55 + 0.45 * Math.sin(t * Math.PI));
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}
const PHASES = Array.from({ length: 9 }, (_, i) => (i / 8) * Math.PI * 2);

const COILS = Array.from({ length: 8 }, (_, i) => {
  const th = ((i + 0.5) * Math.PI) / 4;
  return {
    i,
    x: CX + RX * Math.cos(th),
    y: CY + RY * Math.sin(th),
    rx: 8 + 24 * Math.abs(Math.cos(th)),
    front: Math.sin(th) > 0,
  };
});

const STEAM = [
  { left: '8%', top: '40%', sx: '-30px', delay: '0s' },
  { left: '88%', top: '40%', sx: '30px', delay: '0.9s' },
  { left: '24%', top: '30%', sx: '-18px', delay: '1.7s' },
  { left: '72%', top: '30%', sx: '20px', delay: '0.4s' },
  { left: '46%', top: '8%', sx: '-8px', delay: '1.2s' },
  { left: '50%', top: '10%', sx: '14px', delay: '2.3s' },
];

export function TokamakReactor({ stepsDone, totalSteps }: Props) {
  const uid = useId().replace(/:/g, '');
  const charge = Math.min(1, stepsDone / totalSteps);
  const ignited = charge >= 1;
  const fillH = (COL_BOT - COL_TOP) * charge;
  const heat = charge < 0.5 ? '#06b6d4' : '#f59e0b';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" role="img" aria-label={`Tokamak reactor, ${Math.round(charge * 100)} percent charged${ignited ? ', plasma ignited' : ''}`}>
      {/* conic plasma halos */}
      {ignited && (
        <>
          <div className="plasma-halo" style={{ left: '3%', top: '33%', width: '94%', height: '46%' }} />
          <div className="plasma-halo" style={{ left: '30%', top: '6%', width: '40%', height: '84%', animationDuration: '1.7s' }} />
        </>
      )}

      <svg viewBox="0 0 420 420" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}g`} x1="0" x2="1">
            <stop offset="0" stopColor="#0c0e13" />
            <stop offset="0.45" stopColor="#2a303c" />
            <stop offset="1" stopColor="#0c0e13" />
          </linearGradient>
          <linearGradient id={`${uid}h`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={heat} stopOpacity="0.95" />
            <stop offset="1" stopColor={heat} stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`${uid}p`} x1="0" x2="1">
            <stop offset="0" stopColor="#6d28d9" />
            <stop offset="0.5" stopColor="#ff4df0" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
          <filter id={`${uid}f`} x="-60%" y="-20%" width="220%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id={`${uid}c`}>
            <rect x={CX - COL_HALF} y={COL_TOP} width={COL_HALF * 2} height={COL_BOT - COL_TOP} />
          </clipPath>
        </defs>

        {/* floor plate */}
        <ellipse cx={CX} cy={CY + 118} rx="190" ry="34" fill="#0a0d14" stroke="#06b6d4" strokeOpacity="0.25" />
        <ellipse cx={CX} cy={CY + 118} rx="150" ry="24" fill="none" stroke="#06b6d4" strokeOpacity="0.15" strokeDasharray="4 6" />

        {/* vessel — back half */}
        <VesselArc d={`M${CX - RX},${CY} A${RX},${RY} 0 0 1 ${CX + RX},${CY}`} ignited={ignited} charge={charge} id={uid} />
        {COILS.filter((c) => !c.front).map((c) => (
          <Coil key={c.i} c={c} lit={stepsDone > c.i} ignited={ignited} />
        ))}

        {/* central solenoid */}
        <g>
          <rect x={CX - COL_HALF} y={COL_TOP} width={COL_HALF * 2} height={COL_BOT - COL_TOP} fill={`url(#${uid}g)`} stroke="#3a4252" />
          <g clipPath={`url(#${uid}c)`}>
            {Array.from({ length: 32 }, (_, i) => (
              <line key={i} x1={CX - COL_HALF} x2={CX + COL_HALF} y1={COL_TOP + 6 + i * 10} y2={COL_TOP + 10 + i * 10} stroke="#05070b" strokeWidth="2.5" />
            ))}
            {charge > 0 && !ignited && (
              <rect
                x={CX - COL_HALF}
                y={COL_BOT - fillH}
                width={COL_HALF * 2}
                height={fillH}
                fill={`url(#${uid}h)`}
                style={{ animation: 'goat-core-flicker 1.1s ease-in-out infinite', transition: 'y 0.8s, height 0.8s' }}
              />
            )}
            {ignited && <rect x={CX - COL_HALF} y={COL_TOP} width={COL_HALF * 2} height={COL_BOT - COL_TOP} fill={`url(#${uid}p)`} style={{ animation: 'goat-core-flicker 0.5s linear infinite' }} />}
          </g>
          {/* caps */}
          <polygon points={`${CX - 30},${COL_TOP} ${CX + 30},${COL_TOP} ${CX + 24},${COL_TOP - 14} ${CX - 24},${COL_TOP - 14}`} fill="#1b202b" stroke="#4a5568" />
          <polygon points={`${CX - 40},${COL_BOT} ${CX + 40},${COL_BOT} ${CX + 52},${COL_BOT + 16} ${CX - 52},${COL_BOT + 16}`} fill="#1b202b" stroke="#4a5568" />
          <rect x={CX - 6} y={COL_TOP - 30} width="12" height="16" fill="#2a303c" stroke="#4a5568" />
        </g>

        {/* plasma helix around solenoid */}
        {ignited && (
          <g filter={`url(#${uid}f)`} fill="none" strokeLinecap="round">
            <path stroke="#ff4df0" strokeWidth="3" d={helixPath(0)}>
              <animate attributeName="d" dur="1.1s" repeatCount="indefinite" values={PHASES.map((p) => helixPath(p)).join(';')} />
            </path>
            <path stroke="#c026d3" strokeWidth="2.5" d={helixPath(Math.PI)}>
              <animate attributeName="d" dur="1.1s" repeatCount="indefinite" values={PHASES.map((p) => helixPath(p + Math.PI)).join(';')} />
            </path>
            <path stroke="#fff" strokeOpacity="0.9" strokeWidth="1.2" d={helixPath(1)} style={{ mixBlendMode: 'screen' }}>
              <animate attributeName="d" dur="0.7s" repeatCount="indefinite" values={PHASES.map((p) => helixPath(p + 1, 22)).join(';')} />
            </path>
          </g>
        )}

        {/* vessel — front half over the column */}
        <VesselArc d={`M${CX - RX},${CY} A${RX},${RY} 0 0 0 ${CX + RX},${CY}`} ignited={ignited} charge={charge} id={uid} />
        {COILS.filter((c) => c.front).map((c) => (
          <Coil key={c.i} c={c} lit={stepsDone > c.i} ignited={ignited} />
        ))}

        {/* magnetic field lines */}
        {ignited && (
          <g fill="none" stroke="#e11dff" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="6 10">
            {[1.12, 1.3].map((k, i) => (
              <ellipse key={k} cx={CX} cy={CY} rx={RX * k * 0.78} ry={RY * k * 1.9} style={{ animation: `goat-dash-flow ${2 + i}s linear infinite${i ? ' reverse' : ''}` }} />
            ))}
          </g>
        )}
      </svg>

      {ignited && STEAM.map((s, i) => (
        <span key={i} className="steam" style={{ left: s.left, top: s.top, ['--sx' as string]: s.sx, animationDelay: s.delay }} />
      ))}
    </div>
  );
}

function VesselArc({ d, ignited, charge, id }: { d: string; ignited: boolean; charge: number; id: string }) {
  return (
    <g fill="none">
      <path d={d} stroke="#0b0d12" strokeWidth="36" />
      <path d={d} stroke="#1c212c" strokeWidth="30" />
      <path d={d} stroke="#323a4a" strokeWidth="2" transform="translate(0,-9)" />
      {charge > 0 && !ignited && <path d={d} stroke="#06b6d4" strokeOpacity={0.15 + charge * 0.35} strokeWidth="6" />}
      {ignited && (
        <>
          <path d={d} stroke="#e11dff" strokeWidth="12" strokeOpacity="0.55" filter={`url(#${id}f)`} />
          <path d={d} stroke="#ffd6fb" strokeWidth="2.5" strokeDasharray="14 18" style={{ animation: 'goat-dash-flow 0.8s linear infinite' }} />
        </>
      )}
    </g>
  );
}

function Coil({ c, lit, ignited }: { c: (typeof COILS)[number]; lit: boolean; ignited: boolean }) {
  const stroke = ignited ? '#ff4df0' : lit ? '#00f2fe' : '#3b4252';
  return (
    <ellipse
      cx={c.x}
      cy={c.y}
      rx={c.rx}
      ry="46"
      fill="none"
      stroke={stroke}
      strokeWidth={lit || ignited ? 4 : 3.5}
      style={{
        transition: 'stroke 0.5s',
        filter: lit || ignited ? `drop-shadow(0 0 6px ${stroke})` : undefined,
        animation: lit && !ignited ? 'goat-ring-hum 1.4s ease-in-out infinite' : undefined,
      }}
    />
  );
}
