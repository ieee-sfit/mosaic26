import { useEffect, useRef, useState } from 'react';

export interface DragState {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
}

const DRAG_PX = 6;

/**
 * Pointer-based drag for tiles and cards (mouse, touch and pen all work through pointer events).
 * A press that barely moves is a TAP (`onTap`); a real drag ends in `onDrop` with the `[data-slot]` element under the pointer.
 */
export function useDrag(onDrop: (id: string, slot: HTMLElement | null) => void, onTap: (id: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
  const cb = useRef({ onDrop, onTap });
  useEffect(() => {
    ref.current = drag;
    cb.current = { onDrop, onTap };
  });
  const active = drag !== null;

  useEffect(() => {
    if (!active) return undefined;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_PX });
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        cb.current.onTap(d.id);
        return;
      }
      const slot = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => (el as HTMLElement).closest?.('[data-slot]') as HTMLElement | null)
        .find(Boolean);
      cb.current.onDrop(d.id, slot ?? null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [active]);

  const start = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    setDrag({ id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
  };
  return { drag, start };
}
