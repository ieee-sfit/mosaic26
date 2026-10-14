import { LAB } from './DiagScope';
import { HudPanel } from './HudPanel';

/** One-time card before Module C: which Module B colour stands for which Module C wave. */
export function ColorMapCard({ operators, onContinue }: { operators: [string, string]; onContinue: () => void }) {
  const rows: { swatch: string; edge?: string; from: string; to: string; toColor: string; note?: string }[] = [
    { swatch: LAB.noise, from: 'VIOLET', to: 'CYAN NOISE', toColor: '#00f2fe' },
    { swatch: LAB.anti, from: 'CORAL', to: 'GOLD ANTI-WAVE', toColor: '#f59e0b' },
    { swatch: LAB.silver, edge: LAB.silverEdge, from: 'SILVER', to: 'WHITE LEFTOVER', toColor: '#ffffff', note: 'GREEN WHEN LOCKED' },
  ];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <HudPanel title="Colour key" tag={`OP ${operators[0]} · ${operators[1]}`} cut="both" className="w-[min(92vw,640px)]" bodyClassName="p-6">
        <p className="mb-4 font-tele text-[11px] uppercase tracking-[0.2em] text-goat-mute">MODULE B COLOURS ▸ MODULE C COLOURS</p>
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.from} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 font-tele">
              <span className="h-2 w-8" style={{ background: r.swatch, boxShadow: r.edge ? `0 0 0 2px ${r.edge}` : undefined }} aria-hidden />
              <span className="text-lg font-bold tracking-wider text-white">{r.from}</span>
              <span className="text-right text-lg font-bold tracking-wider" style={{ color: r.toColor }}>
                = {r.to}
                {r.note && <small className="block text-[10px] font-normal tracking-[0.2em] text-goat-lock">{r.note}</small>}
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onContinue} autoFocus className="tac-btn mt-8 w-full bg-goat-cyan px-6 py-3.5 text-sm font-bold text-goat-void">
          [ CONTINUE ▸ MODULE C ]
        </button>
      </HudPanel>
    </div>
  );
}
