import { useEffect, useRef, useState } from 'react';

/** Deadline-driven countdown (immune to interval drift / tab throttling). Returns whole seconds left. */
export function useCountdown(totalSeconds: number, running: boolean, onExpire: () => void): number {
  const [remainingMs, setRemainingMs] = useState(totalSeconds * 1000);
  const remainingRef = useRef(totalSeconds * 1000);
  const expireRef = useRef(onExpire);

  useEffect(() => {
    expireRef.current = onExpire;
  });

  useEffect(() => {
    if (!running) return;
    // Resume from whatever is left so a pause/resume cycle never resets the clock.
    const deadline = Date.now() + remainingRef.current;
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      remainingRef.current = left;
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(id);
        expireRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  return Math.ceil(remainingMs / 1000);
}
