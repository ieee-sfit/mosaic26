import type { SensorAnomaly, ShipZone } from '../types';

const ZONES: Record<ShipZone, { x: number; y: number; label: string; callout: 'left' | 'right' }> = {
  BOW: { x: 240, y: 88, label: 'BOW_ARRAY', callout: 'right' },
  CORE: { x: 240, y: 250, label: 'CORE_BUS', callout: 'right' },
  PORT_WING: { x: 112, y: 300, label: 'PORT_WING', callout: 'right' },
  STBD_WING: { x: 368, y: 300, label: 'STBD_WING', callout: 'left' },
  PORT_ENGINE: { x: 196, y: 440, label: 'PORT_ENGINE', callout: 'right' },
  STBD_ENGINE: { x: 284, y: 440, label: 'STBD_ENGINE', callout: 'left' },
};

const HULL =
  'M240,20 L275,90 L290,170 L395,250 L440,330 L400,350 L330,330 L320,400 L335,470 L300,490 L240,470 L180,490 L145,470 L160,400 L150,330 L80,350 L40,330 L85,250 L190,170 L205,90 Z';

export function StarshipWireframe({ anomaly }: { anomaly: SensorAnomaly }) {
  const hot = ZONES[anomaly.zone];
  const color = anomaly.severity === 'critical' ? '#ef4444' : '#f59e0b';
  const calloutX = hot.callout === 'right' ? Math.min(hot.x + 36, 300) : Math.max(hot.x - 36 - 150, 10);
  const calloutY = hot.y < 120 ? hot.y + 24 : hot.y - 74;

  return (
    <div className="hud-grid-bg relative h-full min-h-[320px] overflow-hidden bg-goat-void/60">
      {/* radar sweep behind the hull */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] aspect-square -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{
          background: 'conic-gradient(from var(--goat-ang), rgba(0,242,254,0.22), transparent 22%)',
          animation: 'goat-ang 6s linear infinite',
          borderRadius: '50%',
        }}
        aria-hidden
      />
      {/* vertical scan bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden>
        <div className="h-8 bg-gradient-to-b from-transparent via-goat-cyan/20 to-transparent" style={{ animation: 'goat-sweep 4.5s linear infinite' }} />
      </div>

      <svg viewBox="0 0 480 520" className="relative mx-auto h-full max-h-[560px] w-full" role="img" aria-label={`Starship sensor map, anomaly in ${hot.label}`}>
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* hull wireframe */}
        <g fill="rgba(6,182,212,0.05)" stroke="#06b6d4" strokeWidth="1.4" filter="url(#glow)">
          <path d={HULL} />
        </g>
        <g fill="none" stroke="#06b6d4" strokeOpacity="0.55" strokeWidth="0.9">
          <path d="M225,60 L255,60 L262,112 L218,112 Z" /> {/* canopy */}
          <path d="M240,20 L240,470" strokeDasharray="4 6" />
          <path d="M190,170 L290,170 M150,330 L330,330 M205,90 L275,90" />
          <path d="M190,170 L150,330 M290,170 L330,330" />
          <path d="M85,250 L190,250 M395,250 L290,250" strokeDasharray="3 5" />
          <path d="M160,400 L320,400" />
          <rect x="176" y="404" width="36" height="66" /> {/* port nacelle */}
          <rect x="268" y="404" width="36" height="66" /> {/* stbd nacelle */}
          <circle cx="240" cy="250" r="34" /> {/* core */}
          <circle cx="240" cy="250" r="20" strokeDasharray="2 4" />
        </g>
        <path d={HULL} fill="none" stroke="#00f2fe" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="6 6" style={{ animation: 'goat-march 1.2s linear infinite' }} />

        {/* idle sensor nodes */}
        {(Object.keys(ZONES) as ShipZone[]).map((z) =>
          z === anomaly.zone ? null : (
            <g key={z}>
              <circle cx={ZONES[z].x} cy={ZONES[z].y} r="3.5" fill="#06b6d4" />
              <circle cx={ZONES[z].x} cy={ZONES[z].y} r="9" fill="none" stroke="#06b6d4" strokeOpacity="0.4" />
              <text x={ZONES[z].x + 12} y={ZONES[z].y + 3} fontSize="8" fill="#5d7388" fontFamily="JetBrains Mono, monospace">
                {ZONES[z].label}
              </text>
            </g>
          ),
        )}

        {/* anomaly */}
        <g key={anomaly.code}>
          <circle cx={hot.x} cy={hot.y} r="18" fill={color} fillOpacity="0.18" />
          <circle cx={hot.x} cy={hot.y} r="18" fill="none" stroke={color} strokeWidth="1.5">
            <animate attributeName="r" values="10;38" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.95;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={hot.x} cy={hot.y} r="5" fill={color} filter="url(#glow)" />
          <path d={`M${hot.x - 24},${hot.y} h12 M${hot.x + 12},${hot.y} h12 M${hot.x},${hot.y - 24} v12 M${hot.x},${hot.y + 12} v12`} stroke={color} strokeWidth="1.5" />
          <path
            d={`M${hot.x},${hot.y} L${calloutX + (hot.callout === 'right' ? 0 : 150)},${calloutY + 28}`}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="4 3"
            style={{ animation: 'goat-march 0.9s linear infinite' }}
          />
          <g transform={`translate(${calloutX},${calloutY})`} fontFamily="JetBrains Mono, monospace">
            <path d="M0,0 H138 L150,12 V62 H0 Z" fill="#060813" fillOpacity="0.92" stroke={color} />
            <text x="8" y="14" fontSize="9" fontWeight="700" fill={color}>
              {anomaly.severity === 'critical' ? '▲ CRITICAL' : '△ CAUTION'} · {anomaly.code}
            </text>
            {anomaly.telemetry.slice(0, 3).map((t, i) => (
              <text key={t.label} x="8" y={30 + i * 12} fontSize="8.5" fill="#9fb4c4">
                {t.label}: <tspan fill="#fff" fontWeight="700">{t.value}</tspan>
              </text>
            ))}
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute left-3 top-2 font-tele text-[10px] uppercase leading-tight tracking-widest text-goat-mute">
        <div>VESSEL: MILANO-CLASS</div>
        <div>SENSOR_SWEEP: <span className="text-goat-cyan">ACTIVE</span></div>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 font-tele text-[10px] uppercase tracking-widest" style={{ color }}>
        <span className="goat-blink">●</span> ANOMALY @ {hot.label}
      </div>
    </div>
  );
}
