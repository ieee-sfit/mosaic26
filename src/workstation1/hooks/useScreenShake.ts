import { createContext, useCallback, useContext, useRef } from 'react';

export type ShakeStrength = 'light' | 'heavy';
export type ShakeFn = (strength?: ShakeStrength) => void;

export const ShakeContext = createContext<ShakeFn>(() => {});
export const useShake = () => useContext(ShakeContext);

/** Imperative shake via the Web Animations API — no remounts, so drags and focus survive. */
export function useScreenShake() {
  const ref = useRef<HTMLDivElement | null>(null);

  const shake = useCallback<ShakeFn>((strength = 'heavy') => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const px = (strength === 'heavy' ? 14 : 6) * (reduced ? 0.3 : 1);
    const frames: Keyframe[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const k = i === 7 ? 0 : 1 - i / 8;
      const sx = (i % 2 === 0 ? 1 : -1) * px * k;
      const sy = (i % 3 === 0 ? -1 : 1) * px * 0.6 * k;
      return { transform: `translate(${sx}px, ${sy}px) rotate(${(sx / px) * 0.25 * k}deg)` };
    });
    el.animate(frames, { duration: strength === 'heavy' ? 520 : 320, easing: 'linear' });
  }, []);

  return { ref, shake };
}
