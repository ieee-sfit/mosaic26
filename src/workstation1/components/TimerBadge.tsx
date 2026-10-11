import { TONE, type Tone } from './HudPanel';

interface Props {
  seconds: number;
  total: number;
  armed: boolean;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Unified mission clock, pinned top-right on every screen. */
export function TimerBadge({ seconds, total, armed }: Props) {
  const tone: Tone = !armed ? 'mute' : seconds <= 60 ? 'crimson' : seconds <= 180 ? 'gold' : 'cyan';
  const t = TONE[tone];
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const critical = armed && seconds <= 60;
  return (
    <div
      className={`chamfer fixed right-0 top-0 z-50 w-[210px] ${t.border} p-px`}
      style={{ ['--c' as string]: '16px' }}
      role="timer"
      aria-label="Mission countdown"
    >
      <div className="chamfer-inner bg-goat-void/95 px-3 pb-2 pt-1.5">
        <div className="flex items-center justify-between font-tele text-[9px] uppercase tracking-[0.2em] text-goat-mute">
          <span>MISSION_CLOCK</span>
          <span className={armed ? t.text : ''}>{armed ? 'T-MINUS' : 'STANDBY'}</span>
        </div>
        <div
          className={`font-tele text-[40px] font-extrabold leading-none tabular-nums ${t.text} ${critical ? 'goat-blink' : ''}`}
          style={{ textShadow: `0 0 14px ${t.hex}66` }}
        >
          {fmt(seconds)}
        </div>
        <div className="mt-1.5 flex h-1.5 gap-px">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="flex-1"
              style={{ background: (i + 1) / 24 <= pct / 100 + 0.001 ? t.hex : '#16202e' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
