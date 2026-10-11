import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from '../utils/waves';

interface Props {
  label: string;
  readout: string;
  value: number; // 0–1
  onChange: (v: number) => void;
  tag: string;
  disabled?: boolean;
  height?: number;
}

/** Vertical fader. Mouse/touch drag anywhere on the track; arrows when focused. */
export function TacticalSlider({ label, readout, value, onChange, tag, disabled, height = 168 }: Props) {
  const track = useRef<HTMLDivElement | null>(null);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    onChange(clamp(1 - (e.clientY - r.top) / r.height, 0, 1));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (e.shiftKey ? 0.05 : 0.01) * 1;
    let next = value;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = value + step;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = value - step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    else return;
    e.preventDefault();
    onChange(clamp(next, 0, 1));
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="font-tele text-[10px] uppercase tracking-[0.2em] text-goat-mute">{tag}</div>
      <div className="flex items-stretch gap-3">
        <div className="flex flex-col justify-between py-1 text-right font-tele text-[9px] text-goat-mute">
          <span>MAX</span>
          <span>50</span>
          <span>MIN</span>
        </div>
        <div
          ref={track}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value * 100)}
          aria-valuetext={readout}
          aria-disabled={disabled}
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.focus();
            fromPointer(e);
          }}
          onPointerMove={(e) => {
            if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
          }}
          onKeyDown={onKey}
          className="tac-track relative w-14 cursor-ns-resize touch-none border border-goat-cyan/40 outline-none focus-visible:border-goat-cyan focus-visible:shadow-[0_0_14px_rgba(0,242,254,0.5)]"
          style={{ height }}
        >
          <div className="absolute inset-x-0 bottom-0 bg-goat-cyan/20" style={{ height: `${value * 100}%` }} />
          <div
            className="chamfer absolute left-1/2 h-7 w-[120%] -translate-x-1/2 translate-y-1/2 bg-goat-cyan"
            style={{ bottom: `${value * 100}%`, ['--c' as string]: '6px', boxShadow: '0 0 14px #00f2fe' }}
          >
            <div className="mx-auto mt-[13px] h-0.5 w-8 bg-goat-void" />
          </div>
        </div>
      </div>
      <div className="font-tele text-xl font-bold tabular-nums text-goat-cyan">{readout}</div>
      <div className="font-hud text-[11px] font-semibold uppercase tracking-[0.18em] text-white">{label}</div>
    </div>
  );
}
