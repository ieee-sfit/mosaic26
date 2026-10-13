import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'cyan' | 'gold' | 'crimson' | 'lock' | 'plasma' | 'mute';

export const TONE: Record<Tone, { hex: string; text: string; border: string; bg: string }> = {
  cyan: { hex: '#00f2fe', text: 'text-goat-cyan', border: 'bg-goat-cyan/45', bg: 'bg-goat-cyan/10' },
  gold: { hex: '#f59e0b', text: 'text-goat-gold', border: 'bg-goat-gold/60', bg: 'bg-goat-gold/10' },
  crimson: { hex: '#ef4444', text: 'text-goat-crimson', border: 'bg-goat-crimson/70', bg: 'bg-goat-crimson/10' },
  lock: { hex: '#39ff88', text: 'text-goat-lock', border: 'bg-goat-lock/60', bg: 'bg-goat-lock/10' },
  plasma: { hex: '#e11dff', text: 'text-goat-plasma', border: 'bg-goat-plasma/60', bg: 'bg-goat-plasma/10' },
  mute: { hex: '#5d7388', text: 'text-goat-mute', border: 'bg-goat-mute/40', bg: 'bg-goat-mute/10' },
};

interface HudPanelProps {
  title?: string;
  /** Right-aligned telemetry label, e.g. "ITER_ZONE: PORT-MK4". */
  tag?: string;
  tone?: Tone;
  /** `both` chamfers all four corners, `tr` only the top-right. */
  cut?: 'default' | 'both' | 'tr';
  chamfer?: number;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Hard-edged panel: 1px border drawn by an outer clipped layer under an inset clipped body. */
export function HudPanel({
  title,
  tag,
  tone = 'cyan',
  cut = 'default',
  chamfer = 14,
  className = '',
  bodyClassName = '',
  style,
  children,
}: HudPanelProps) {
  const t = TONE[tone];
  const outer = cut === 'both' ? 'chamfer-both' : cut === 'tr' ? 'chamfer-tr' : 'chamfer';
  const inner = cut === 'both' ? 'chamfer-both-inner' : cut === 'tr' ? 'chamfer-tr' : 'chamfer-inner';
  return (
    <section
      className={`${outer} ${t.border} p-px ${className}`}
      style={{ ['--c' as string]: `${chamfer}px`, ...style }}
    >
      <div className={`${inner} hw-body relative flex h-full min-h-0 flex-col`}>
        <span className="hw-screw left-1.5 top-1.5" aria-hidden />
        <span className="hw-screw right-1.5 top-1.5" aria-hidden />
        <span className="hw-screw bottom-1.5 left-1.5" aria-hidden />
        <span className="hw-screw bottom-1.5 right-1.5" aria-hidden />
        {(title || tag) && (
          <header className={`hw-plate flex items-center justify-between gap-3 px-4 py-1.5 ${t.bg}`}>
            {title && (
              <h2 className={`font-hud text-[11px] font-bold uppercase tracking-[0.22em] ${t.text}`}>
                <span className="hw-led mr-2 inline-block h-2 w-2 bg-current align-middle" />
                {title}
              </h2>
            )}
            {tag && <span className="font-tele text-[10px] uppercase tracking-wider text-goat-mute">{tag}</span>}
          </header>
        )}
        <div className={`hw-screen relative min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
      </div>
    </section>
  );
}

/** Dense telemetry chip: LABEL: value */
export function TeleChip({ label, value, tone = 'cyan' }: { label: string; value: string; tone?: Tone }) {
  return (
    <span className="font-tele text-[10px] uppercase tracking-wider text-goat-mute">
      {label}: <b className={`font-bold ${TONE[tone].text}`}>{value}</b>
    </span>
  );
}
