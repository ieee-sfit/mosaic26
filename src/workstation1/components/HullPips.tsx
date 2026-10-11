interface Props {
  hull: number;
  max: number;
}

/** Discrete armour pips: 3 → 100%, 2 → 66%, 1 → 33%, 0 → breach. */
export function HullPips({ hull, max }: Props) {
  const pct = Math.round((hull / max) * 100);
  const critical = hull <= 1;
  const color = hull === 0 ? '#ef4444' : critical ? '#ef4444' : hull < max ? '#f59e0b' : '#00f2fe';
  return (
    <div className="chamfer-tr bg-goat-void/85 px-3 py-2" style={{ ['--c' as string]: '10px' }} role="meter" aria-label="Hull integrity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="flex items-center justify-between gap-4 font-tele text-[10px] uppercase tracking-[0.2em] text-goat-mute">
        <span>HULL_INTEGRITY</span>
        <span className={critical ? 'goat-blink font-bold' : 'font-bold'} style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {Array.from({ length: max }, (_, i) => {
          const on = i < hull;
          return (
            <span
              key={i}
              className="h-3.5 w-12"
              style={{
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                background: on ? color : '#1b2433',
                boxShadow: on ? `0 0 10px ${color}` : undefined,
                transition: 'background 0.2s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
