import { TeleChip } from './HudPanel';

interface Props {
  code: string; // "MODULE A"
  title: string;
  tag: string;
  operator: string;
  steps: number;
  active: number; // 0-based index of current module
}

/** Top strip shared by modules A–C. Right edge is left clear for the fixed timer. */
export function ModuleHeader({ code, title, tag, operator, steps, active }: Props) {
  return (
    <div className="flex min-h-[88px] items-center gap-4 border-b border-goat-cyan/20 bg-goat-void/70 py-2 pl-4 pr-[230px]">
      <div className="chamfer-tr flex items-center gap-3 self-stretch bg-goat-cyan px-4 text-goat-void" style={{ ['--c' as string]: '12px' }}>
        <span className="font-hud text-xs font-bold tracking-[0.25em]">{code}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-hud text-lg font-bold uppercase leading-tight tracking-[0.14em] text-white">{title}</div>
        <div className="flex flex-wrap gap-x-4">
          <TeleChip label="STATION" value="01 · GOAT_ANC" />
          <TeleChip label="OP" value={operator} />
          <TeleChip label="SYS" value={tag} tone="gold" />
        </div>
      </div>
      <div className="hidden items-center gap-1 md:flex" aria-label={`Module ${active + 1} of ${steps}`}>
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-8 ${i < active ? 'bg-goat-lock' : i === active ? 'bg-goat-cyan goat-blink' : 'bg-goat-mute/30'}`}
            style={{ clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}
          />
        ))}
      </div>
    </div>
  );
}
