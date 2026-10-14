import { useEffect, useRef, useState } from 'react';
import type { DiagWaveDef, WaveCalibration } from '../types';
import { SCOPE_SAMPLES, antiAt, noiseAt, type Controls } from '../utils/waves';
import { peakPositions, profileOf, residualAt } from '../utils/diagnose';

/** Module B palette. Deliberately NOT Module C's cyan / gold / white-green. */
export const LAB = {
  noise: '#6d28d9', // violet
  anti: '#ff6a57', // coral
  silver: '#d9dee7', // leftover fill
  silverEdge: '#2f3846', // leftover outline (so silver reads on paper)
  paper: '#f4f0e3',
  ink: '#1f2937',
};

interface Props {
  wave: DiagWaveDef;
  cal: WaveCalibration;
  controls: Controls;
  /** Waveform 1: guide lines at the noise peaks and tick rows for both sets of peaks. */
  ticks: boolean;
}

const Y_MAX = 2.15;
const PAD = { l: 52, r: 16, t: 26, b: 34 };

/** Graph-paper plot: violet noise, coral anti-wave, silver leftover. Still (no scrolling) so peaks can be compared by eye. */
export function DiagScope({ wave, cal, controls, ticks }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ro = new ResizeObserver(() => setBox({ w: c.clientWidth, h: c.clientHeight }));
    ro.observe(c);
    setBox({ w: c.clientWidth, h: c.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || box.w < 10 || box.h < 10) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.w * dpr);
    canvas.height = Math.round(box.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { w, h } = box;
    const pw = w - PAD.l - PAD.r;
    const ph = h - PAD.t - PAD.b;
    const cy = PAD.t + ph / 2;
    const X = (x: number) => PAD.l + x * pw;
    const Y = (v: number) => cy - (v / Y_MAX) * (ph / 2);
    const profile = profileOf(wave);

    // paper
    ctx.fillStyle = LAB.paper;
    ctx.fillRect(0, 0, w, h);
    // graph-paper grid: minor every 1/20 of the width, major every 1/4
    ctx.lineWidth = 1;
    for (let i = 0; i <= 40; i++) {
      ctx.strokeStyle = i % 10 === 0 ? 'rgba(70,100,150,0.45)' : 'rgba(70,100,150,0.16)';
      ctx.beginPath();
      ctx.moveTo(PAD.l + (i / 40) * pw, PAD.t);
      ctx.lineTo(PAD.l + (i / 40) * pw, PAD.t + ph);
      ctx.stroke();
    }
    for (let j = -4; j <= 4; j++) {
      ctx.strokeStyle = j === 0 ? 'rgba(31,41,55,0.7)' : j % 2 === 0 ? 'rgba(70,100,150,0.4)' : 'rgba(70,100,150,0.16)';
      ctx.lineWidth = j === 0 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(PAD.l, cy - (j / 4) * (ph / 2));
      ctx.lineTo(PAD.l + pw, cy - (j / 4) * (ph / 2));
      ctx.stroke();
    }
    // axes + labels
    ctx.strokeStyle = LAB.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD.l, PAD.t, pw, ph);
    ctx.fillStyle = LAB.ink;
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of [-2, -1, 0, 1, 2]) ctx.fillText(v > 0 ? `+${v}` : `${v}`, PAD.l - 8, Y(v));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let t = 0; t <= 4; t++) ctx.fillText(String(t * 2.5), X(t / 4), PAD.t + ph + 6);
    ctx.textAlign = 'right';
    ctx.fillText('TIME →', PAD.l + pw, PAD.t + ph + 18);
    ctx.save();
    ctx.translate(14, PAD.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL', 0, 0);
    ctx.restore();

    // clip traces to the plot
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.l, PAD.t, pw, ph);
    ctx.clip();
    const trace = (fn: (x: number) => number, color: string, width: number) => {
      ctx.beginPath();
      for (let i = 0; i < SCOPE_SAMPLES; i++) {
        const x = i / (SCOPE_SAMPLES - 1);
        if (i === 0) ctx.moveTo(X(x), Y(fn(x)));
        else ctx.lineTo(X(x), Y(fn(x)));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    const noise = (x: number) => noiseAt(profile, x);
    const anti = (x: number) => antiAt(cal, controls, x);
    const left = (x: number) => residualAt(cal, wave, controls, x);

    const nPk = peakPositions(noise);
    if (ticks) {
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(109,40,217,0.55)';
      ctx.lineWidth = 1.5;
      for (const p of nPk) {
        ctx.beginPath();
        ctx.moveTo(X(p), PAD.t);
        ctx.lineTo(X(p), PAD.t + ph);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    trace(noise, LAB.noise, 4);
    trace(anti, LAB.anti, 4);
    // silver leftover: dark edge under a light core so it reads on cream paper
    trace(left, LAB.silverEdge, 8);
    trace(left, LAB.silver, 4.5);
    ctx.restore();

    if (ticks) {
      const tri = (x: number, y: number, up: boolean, fill: string) => {
        ctx.beginPath();
        ctx.moveTo(x, y + (up ? -7 : 7));
        ctx.lineTo(x - 7, y + (up ? 6 : -6));
        ctx.lineTo(x + 7, y + (up ? 6 : -6));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = LAB.silverEdge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      for (const p of nPk) tri(X(p), PAD.t + 12, false, LAB.noise);
      const lPk = peakPositions(left);
      const flat = lPk.length === 0 || Math.max(...lPk.map((p) => left(p))) < 0.03;
      if (!flat) for (const p of lPk) tri(X(p), PAD.t + ph - 12, true, LAB.silver);
    }
  }, [box, wave, cal, controls, ticks]);

  return <canvas ref={ref} className="block h-full w-full" role="img" aria-label="Graph: noise, your anti-wave and the leftover" />;
}
