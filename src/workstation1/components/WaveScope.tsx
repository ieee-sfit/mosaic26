import { useEffect, useRef } from 'react';
import type { WaveCalibration, WaveProfile } from '../types';
import { SCOPE_SAMPLES, antiAt, noiseAt, type Controls } from '../utils/waves';

interface Props {
  profile: WaveProfile;
  cal: WaveCalibration;
  controls: Controls;
  locked: boolean;
}

/** Oscilloscope: incoming noise (cyan), anti-noise (gold), residual sum (white → razor-flat green on lock). */
export function WaveScope({ profile, cal, controls, locked }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ profile, cal, controls, locked });

  useEffect(() => {
    live.current = { profile, cal, controls, locked };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let ease = 0; // 0 = raw residual, 1 = flat
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const trace = (fn: (x: number) => number, color: string, width: number, glow = 0) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const scale = h / 2 / 2.15;
      ctx.beginPath();
      for (let i = 0; i < SCOPE_SAMPLES; i++) {
        const x = i / (SCOPE_SAMPLES - 1);
        const px = x * w;
        const py = h / 2 - fn(x) * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = (t: number) => {
      const { profile: p, cal: c, controls: ctl, locked: isLocked } = live.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ease += ((isLocked ? 1 : 0) - ease) * 0.14;
      const scroll = reduced ? 0 : (t / 1000) * 2.6;

      ctx.clearRect(0, 0, w, h);
      // graticule
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,242,254,0.10)';
      ctx.beginPath();
      for (let gx = 0; gx <= 10; gx++) {
        ctx.moveTo((gx / 10) * w, 0);
        ctx.lineTo((gx / 10) * w, h);
      }
      for (let gy = 0; gy <= 4; gy++) {
        ctx.moveTo(0, (gy / 4) * h);
        ctx.lineTo(w, (gy / 4) * h);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,242,254,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      trace((x) => noiseAt(p, x, scroll), 'rgba(0,242,254,0.85)', 1.6, 6);
      trace((x) => antiAt(c, ctl, x, scroll), 'rgba(245,158,11,0.9)', 1.6, 6);
      const flat = 1 - ease;
      const sumColor = ease > 0.5 ? '#39ff88' : '#ffffff';
      trace((x) => (noiseAt(p, x, scroll) + antiAt(c, ctl, x, scroll)) * flat, sumColor, ease > 0.5 ? 2.4 : 2, ease > 0.5 ? 16 : 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-full w-full" aria-label="Oscilloscope: noise versus anti-noise" role="img" />;
}
