import type { WaveProfile } from '../types';

interface Props {
  profile: WaveProfile;
  locked: boolean;
  destroyed: boolean;
  children?: React.ReactNode; // HUD overlays
}

const DEBRIS = [
  ['-70px', '-50px', '200deg'], ['60px', '-64px', '-160deg'], ['84px', '24px', '120deg'],
  ['-80px', '34px', '-220deg'], ['6px', '70px', '90deg'], ['-30px', '-86px', '260deg'],
];

/** Cockpit viewport: drifting starfield, cloaked scout, tracking reticle. */
export function Windshield({ profile, locked, destroyed, children }: Props) {
  const { x, y, scale } = profile.ship;
  const shipW = 150 * scale;
  const revealed = locked && !destroyed;

  return (
    <div className="chamfer-both absolute inset-0 bg-goat-cyan/40 p-0.5" style={{ ['--c' as string]: '34px' }}>
      <div className="chamfer-both-inner relative h-full overflow-hidden bg-[#02030a]" style={{ ['--c' as string]: '34px' }}>
        <div className="goat-stars absolute inset-0 opacity-90" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(0,242,254,0.10),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(245,158,11,0.06),transparent_50%)]" aria-hidden />

        {/* scout ship + reticle share one anchor so they always coincide */}
        <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          {!destroyed && (
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2" aria-hidden>
              <svg
                viewBox="0 0 120 70"
                width={shipW}
                style={{
                  display: 'block',
                  animation: revealed ? 'goat-reveal 0.5s ease-out forwards' : 'goat-shimmer 3.4s ease-in-out infinite',
                  opacity: revealed ? 1 : undefined,
                  filter: revealed ? 'drop-shadow(0 0 10px rgba(245,158,11,0.8))' : undefined,
                }}
              >
                <path d="M60,4 L78,26 L116,34 L84,44 L72,66 L60,56 L48,66 L36,44 L4,34 L42,26 Z" fill={revealed ? 'rgba(245,158,11,0.28)' : 'rgba(160,230,255,0.15)'} stroke={revealed ? '#f59e0b' : '#a8ecff'} strokeWidth="1.6" />
                <path d="M60,4 L60,56 M42,26 L78,26 M36,44 L84,44" stroke={revealed ? '#fbbf24' : '#a8ecff'} strokeWidth="0.8" fill="none" />
                <circle cx="60" cy="30" r="5" fill={revealed ? '#ef4444' : 'none'} stroke={revealed ? '#fecaca' : '#a8ecff'} />
              </svg>
            </div>
          )}

          {destroyed ? (
            <div className="absolute left-0 top-0" aria-hidden>
              <span className="absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,#fff_0%,#f59e0b_35%,#ef4444_60%,transparent_72%)]" style={{ animation: 'goat-boom 0.9s ease-out forwards', borderRadius: '50%' }} />
              {DEBRIS.map(([dx, dy, dr], i) => (
                <span key={i} className="absolute h-2 w-5 bg-goat-gold" style={{ ['--dx' as string]: dx, ['--dy' as string]: dy, ['--dr' as string]: dr, animation: 'goat-debris 1s ease-out forwards' }} />
              ))}
            </div>
          ) : (
            <Reticle locked={locked} size={shipW * 0.95} />
          )}
        </div>

        {/* windshield struts */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-3 bg-goat-void/90" />
          <div className="absolute inset-y-0 left-0 w-3 bg-goat-void/90" />
          <div className="absolute inset-y-0 right-0 w-3 bg-goat-void/90" />
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gradient-to-b from-goat-void via-goat-void/70 to-transparent" />
        </div>

        {children}
      </div>
    </div>
  );
}

function Reticle({ locked, size }: { locked: boolean; size: number }) {
  const color = locked ? '#39ff88' : '#00f2fe';
  const s = Math.max(86, size);
  return (
    <div
      className="absolute left-0 top-0"
      style={{
        width: s,
        height: s,
        animation: locked ? 'goat-lock-in 0.35s cubic-bezier(0.2,0.9,0.2,1) forwards' : 'goat-wander 6s ease-in-out infinite',
        filter: `drop-shadow(0 0 ${locked ? 10 : 3}px ${color})`,
      }}
      aria-hidden
    >
      <svg viewBox="-50 -50 100 100" className="h-full w-full" fill="none" stroke={color} strokeWidth="1.6">
        {/* corner brackets */}
        <path d="M-44,-28 V-44 H-28 M44,-28 V-44 H28 M-44,28 V44 H-28 M44,28 V44 H28" strokeWidth={locked ? 3 : 1.6} />
        <circle r="26" strokeDasharray={locked ? undefined : '4 5'} style={locked ? undefined : { transformOrigin: 'center', animation: 'goat-spin 8s linear infinite' }} />
        <path d="M-10,0 H-3 M10,0 H3 M0,-10 V-3 M0,10 V3" />
        {locked && <circle r="1.6" fill={color} />}
      </svg>
      <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-tele text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color }}>
        {locked ? '◉ TARGET LOCKED' : <span className="goat-blink">SCANNING…</span>}
      </div>
    </div>
  );
}
