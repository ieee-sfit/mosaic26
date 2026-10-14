import { useEffect, useRef } from 'react';

interface Props {
  label: string;
  readout: string;
  /** Called on every jog tick with a signed step multiplier (-1, +1 for single presses; larger while holding or on the fast buttons). */
  onJog: (units: number) => void;
  disabled?: boolean;
}

const TICK_MS = 70;

/** Big left/right jog buttons. Press and hold to speed up. Arrow keys work too. */
export function JogControl({ label, readout, onJog, disabled }: Props) {
  const timer = useRef<number | null>(null);
  const jog = useRef(onJog);
  useEffect(() => {
    jog.current = onJog;
  });
  useEffect(() => () => stop(), []);

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }

  /** dir = -1 / +1, fast = the double-arrow buttons (5x). Holding ramps up 1x → 3x → 8x. */
  const start = (dir: -1 | 1, fast: boolean) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const base = fast ? 5 : 1;
    jog.current(dir * base);
    const t0 = performance.now();
    stop();
    timer.current = window.setInterval(() => {
      const held = performance.now() - t0;
      if (held < 350) return; // a short press is a single nudge
      const ramp = held < 1000 ? 1 : held < 1800 ? 3 : 8;
      jog.current(dir * base * ramp);
    }, TICK_MS);
  };

  const key = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onJog(e.shiftKey ? -5 : -1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onJog(e.shiftKey ? 5 : 1);
    }
  };

  const btn = (text: string, dir: -1 | 1, fast: boolean, aria: string) => (
    <button
      type="button"
      className="lab-jog"
      disabled={disabled}
      aria-label={aria}
      onPointerDown={start(dir, fast)}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onJog(dir * (fast ? 5 : 1));
        }
      }}
    >
      {text}
    </button>
  );

  return (
    <div className="lab-jogrow" role="group" aria-label={`${label} jog controls`} tabIndex={disabled ? -1 : 0} onKeyDown={key}>
      {btn('◀◀', -1, true, `${label} down fast`)}
      {btn('◀', -1, false, `${label} down`)}
      <div className="lab-jogval" aria-live="off">
        <small>{label}</small>
        <b>{readout}</b>
      </div>
      {btn('▶', 1, false, `${label} up`)}
      {btn('▶▶', 1, true, `${label} up fast`)}
    </div>
  );
}
