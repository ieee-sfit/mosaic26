import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { normDeg } from '../utils/waves';

interface Props {
  value: number; // degrees 0–360
  onChange: (deg: number) => void;
  disabled?: boolean;
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

/** Phase-inversion knob. Click a bearing, drag, or use ←/→ while focused (Shift = coarse). */
export function RotaryDial({ value, onChange, disabled }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [focused, setFocused] = useState(false);

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 8) return; // dead-zone at the hub
    onChange(normDeg((Math.atan2(dx, -dy) * 180) / Math.PI));
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') onChange(normDeg(value - step));
    else if (e.key === 'ArrowRight') onChange(normDeg(value + step));
    else if (e.key === 'Home') onChange(0);
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="font-tele text-[10px] uppercase tracking-[0.2em] text-goat-mute">PHASE_INV · ←/→ KEYS</div>
      <svg
        ref={ref}
        viewBox="-110 -110 220 220"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Phase inversion dial"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${Math.round(value)} degrees`}
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-[176px] w-[176px] cursor-pointer touch-none outline-none"
      >
        <circle r="104" fill="#060813" stroke={focused ? '#00f2fe' : '#06b6d4'} strokeOpacity={focused ? 1 : 0.4} strokeWidth={focused ? 3 : 1.5} style={focused ? { filter: 'drop-shadow(0 0 8px #00f2fe)' } : undefined} />
        {focused && <circle r="109" fill="none" stroke="#00f2fe" strokeOpacity="0.5" strokeDasharray="4 6" style={{ animation: 'goat-march 1s linear infinite' }} />}
        {TICKS.map((a) => {
          const major = a % 30 === 0;
          return <line key={a} y1={-96} y2={major ? -80 : -88} stroke={major ? '#00f2fe' : '#06b6d4'} strokeOpacity={major ? 0.95 : 0.45} strokeWidth={major ? 2 : 1} transform={`rotate(${a})`} />;
        })}
        {[0, 90, 180, 270].map((a) => {
          const r = 66;
          const rad = (a * Math.PI) / 180;
          return (
            <text key={a} x={Math.sin(rad) * r} y={-Math.cos(rad) * r + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#5d7388" fontFamily="JetBrains Mono, monospace">
              {a}°
            </text>
          );
        })}
        <circle r="46" fill="#0b0f19" stroke="#06b6d4" strokeOpacity="0.35" />
        {/* arc trail from 0° to current */}
        <path d={arc(value)} fill="none" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.8" />
        {/* needle */}
        <g transform={`rotate(${value})`} style={{ transition: 'transform 0.06s linear' }}>
          <polygon points="-7,-6 0,-92 7,-6" fill="#00f2fe" style={{ filter: 'drop-shadow(0 0 6px #00f2fe)' }} />
          <polygon points="-5,10 0,34 5,10" fill="#f59e0b" />
        </g>
        <circle r="10" fill="#060813" stroke="#00f2fe" strokeWidth="2" />
      </svg>
      <div className="font-tele text-xl font-bold tabular-nums text-goat-cyan">{String(Math.round(value) % 360).padStart(3, '0')}°</div>
    </div>
  );
}

function arc(deg: number): string {
  const r = 56;
  const rad = (deg * Math.PI) / 180;
  const x = Math.sin(rad) * r;
  const y = -Math.cos(rad) * r;
  return `M0,${-r} A${r},${r} 0 ${deg > 180 ? 1 : 0} 1 ${x.toFixed(2)},${y.toFixed(2)}`;
}
