import { useEffect, useState, type ReactNode } from 'react';
import { HudPanel } from './HudPanel';
import { LAB } from './DiagScope';

export type TutorialId = 'A' | 'B' | 'C' | 'D';

interface Props {
  module: TutorialId;
  onContinue: () => void;
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Page {
  title: string;
  name: string;
  lines: string[];
  picture: ReactNode;
  extra?: ReactNode;
  /** Show the extra block under the numbered lines (right column) instead of across the bottom. */
  side?: boolean;
}

const PAGES: Record<TutorialId, Page> = {
  A: {
    title: 'HOW HINTS WORK',
    name: 'MODULE A · FLIGHT TELEMETRY',
    lines: [
      'The HINT button is always bottom-right.',
      'Every question has its own two hints.',
      "Hint 1: -40% of that question's points.",
      'Hint 2: solves it for you, for 0 points.',
      "A wrong pick costs 20% of the question.",
    ],
    picture: <HintPicture />,
    extra: <HintTable />,
    side: true,
  },
  B: {
    title: 'READ THE LEFTOVER',
    name: 'MODULE B · DIAGNOSE THE LEFTOVER',
    lines: [
      'The silver line is what is left over.',
      'Swells and shrinks = pitch. Peaks line up = loudness. Peaks between = timing.',
      'Pick the wrong control, then nudge it.',
    ],
    picture: <LeftoverPicture />,
  },
  C: {
    title: 'CANCEL THE NOISE',
    name: 'MODULE C · WAVE INTERCEPTION',
    lines: ['Scouts hide inside the noise.', 'Make the white line flat to reveal the ship.', 'Match the three meters, then fire.'],
    picture: <ScopePicture />,
    extra: <ColourKey />,
  },
  D: {
    title: 'CRACK THE HANDSHAKE',
    name: 'BONUS · SECRET HANDSHAKE',
    lines: ['The beacon jumps between channels by a hidden rule.', 'Watch the first four jumps. They are free.', 'Pick the next channel before it jumps.'],
    picture: <BeaconPicture />,
  },
};

/** One single-page tutorial before each module. Nothing is scored and the shift clock is paused. */
export function TutorialScreen({ module, onContinue }: Props) {
  const page = PAGES[module];
  return (
    <div className="flex min-h-screen items-center justify-center p-3 pt-[72px]">
      <HudPanel title={page.name} tag="NOTHING SCORED · CLOCK PAUSED" tone="gold" cut="both" className="w-[min(96vw,1000px)]" bodyClassName="flex flex-col gap-3 p-4 md:p-5">
        <div className="tut">
          <h1 className="font-hud text-[clamp(26px,3.2vw,40px)] font-bold uppercase leading-none tracking-[0.16em] text-white">
            {page.title}
            <span className="ml-3 text-goat-gold">▸</span>
          </h1>

          <div className="mt-3 grid items-start gap-5 md:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
            <div className="tut-picture" aria-hidden>
              {page.picture}
            </div>
            <div className="grid gap-4">
            <ol className="grid gap-2">
              {page.lines.map((line, i) => (
                <li key={line} className="grid grid-cols-[34px_1fr] items-baseline gap-3 font-hud text-[clamp(17px,1.7vw,22px)] font-semibold leading-snug text-[#dff3f7]">
                  <span className="chamfer-tr flex h-7 w-7 items-center justify-center bg-goat-cyan font-tele text-sm font-bold text-goat-void" style={{ ['--c' as string]: '7px' }}>
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            {page.side && page.extra}
            </div>
          </div>

          {!page.side && page.extra && <div className="mt-4">{page.extra}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-3">
          <span className="font-tele text-[11px] font-bold uppercase tracking-[0.18em] text-goat-gold">HINT 1 = -40% · HINT 2 = AUTO-SOLVE, 0 PTS</span>
          <button type="button" onClick={onContinue} autoFocus className="tac-btn ml-auto bg-goat-cyan px-10 py-3.5 text-sm font-bold text-goat-void">
            [ CONTINUE ▸ ]
          </button>
        </div>
      </HudPanel>
    </div>
  );
}

/* ── Module A: an arrow that points at the HINT button, bottom-right ─────────────────── */
function HintPicture() {
  return (
    <svg viewBox="0 0 330 200" className="block w-full border border-goat-cyan/30 bg-goat-void">
      {/* a tiny screen: question card + answers */}
      <rect x="14" y="14" width="190" height="14" fill="#16202e" />
      <rect x="14" y="36" width="260" height="22" fill="#101626" stroke="#06b6d4" strokeOpacity="0.4" />
      <rect x="14" y="64" width="260" height="22" fill="#101626" stroke="#06b6d4" strokeOpacity="0.4" />
      <rect x="14" y="92" width="260" height="22" fill="#101626" stroke="#06b6d4" strokeOpacity="0.4" />
      <rect x="14" y="120" width="260" height="22" fill="#101626" stroke="#06b6d4" strokeOpacity="0.4" />
      {/* the HINT button, bottom-right */}
      <g className="tut-pulse">
        <rect x="236" y="160" width="84" height="30" fill="#f59e0b" />
        <text x="278" y="180" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" fontWeight="800" fill="#060813">HINT</text>
      </g>
      {/* the arrow */}
      <g className="tut-arrow">
        <path d="M150,118 L212,164" stroke="#00f2fe" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M214,146 L226,172 L200,168 Z" fill="#00f2fe" />
      </g>
    </svg>
  );
}

function HintTable() {
  const rows: [string, string][] = [
    ['MODULE A', 'Removes one wrong answer'],
    ['MODULE B', 'Names the wrong control and why'],
    ['MODULE C', 'Marks the target zones'],
    ['MODULE D', 'States the rule in words'],
  ];
  return (
    <table className="w-full border-collapse font-tele text-[13px]">
      <caption className="mb-1.5 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-goat-gold">WHAT A HINT DOES</caption>
      <tbody>
        {rows.map(([m, d]) => (
          <tr key={m} className="border-t border-white/10">
            <th scope="row" className="w-[130px] py-1 pr-3 text-left font-bold tracking-widest text-goat-cyan">{m}</th>
            <td className="py-1 text-[#cfe7ee]">{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Module B: a silver leftover that swells and shrinks ─────────────────────────────── */
function LeftoverPicture() {
  const pts = Array.from({ length: 120 }, (_, i) => {
    const x = i / 119;
    const swell = 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * 1.5 * x));
    return `${i === 0 ? 'M' : 'L'}${(10 + x * 310).toFixed(1)},${(100 - 62 * swell * Math.sin(2 * Math.PI * 9 * x)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 330 200" className="block w-full border border-goat-cyan/30" style={{ background: '#f4f0e3' }}>
      <path d="M0,100 H330" stroke="#1f2937" strokeOpacity="0.25" />
      <path d={pts} fill="none" stroke={LAB.silverEdge} strokeWidth="9" strokeLinejoin="round" />
      <path d={pts} fill="none" stroke={LAB.silver} strokeWidth="5" strokeLinejoin="round" className="tut-draw" />
      <text x="12" y="188" fontFamily="JetBrains Mono, monospace" fontSize="12" fontWeight="700" fill="#1f2937">LEFTOVER</text>
    </svg>
  );
}

/* ── Module C: gold anti-wave slides onto the noise, the white line goes flat and green ──── */
function ScopePicture() {
  const [t, setT] = useState(() => (reduced() ? 1 : 0));
  useEffect(() => {
    if (reduced()) return undefined;
    const t0 = performance.now();
    const id = window.setInterval(() => setT((((performance.now() - t0) / 1000) % 5) / 5), 60);
    return () => window.clearInterval(id);
  }, []);
  // 0..0.55: the anti-wave slides in; 0.55..0.85: locked (flat green); then it drifts off again
  const off = t < 0.55 ? 1 - t / 0.55 : t < 0.85 ? 0 : (t - 0.85) / 0.15;
  const locked = off === 0;
  const W = 330, H = 200;
  const wave = (f: (x: number) => number, scale: number) =>
    Array.from({ length: 140 }, (_, i) => {
      const x = i / 139;
      return `${i === 0 ? 'M' : 'L'}${(x * W).toFixed(1)},${(H / 2 - f(x) * scale).toFixed(1)}`;
    }).join(' ');
  const noise = (x: number) => Math.sin(2 * Math.PI * 3 * x);
  const anti = (x: number) => -Math.sin(2 * Math.PI * 3 * x + off * 2.4);
  const resid = (x: number) => noise(x) + anti(x);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full border border-goat-cyan/30 bg-goat-void">
      <path d={`M0,${H / 2} H${W}`} stroke="#00f2fe" strokeOpacity="0.25" />
      <path d={wave(noise, 40)} fill="none" stroke="#00f2fe" strokeWidth="4" />
      <path d={wave(anti, 40)} fill="none" stroke="#f59e0b" strokeWidth="4" />
      <path d={wave(resid, 40)} fill="none" stroke={locked ? '#39ff88' : '#ffffff'} strokeWidth={locked ? 6 : 4} />
      <text x="12" y="190" fontFamily="JetBrains Mono, monospace" fontSize="12" fontWeight="700" fill={locked ? '#39ff88' : '#5d7388'}>{locked ? 'FLAT = LOCKED' : 'NOT FLAT YET'}</text>
    </svg>
  );
}

function ColourKey() {
  const rows: { swatch: string; edge?: string; from: string; to: string; toColor: string; note?: string }[] = [
    { swatch: LAB.noise, from: 'VIOLET', to: 'CYAN NOISE', toColor: '#00f2fe' },
    { swatch: LAB.anti, from: 'CORAL', to: 'GOLD ANTI-WAVE', toColor: '#f59e0b' },
    { swatch: LAB.silver, edge: LAB.silverEdge, from: 'SILVER', to: 'WHITE LEFTOVER', toColor: '#ffffff', note: 'GREEN WHEN LOCKED' },
  ];
  return (
    <div>
      <div className="mb-1.5 font-tele text-[11px] font-bold uppercase tracking-[0.22em] text-goat-gold">COLOUR KEY · MODULE B ▸ MODULE C</div>
      <ul className="grid gap-1.5 md:grid-cols-3">
        {rows.map((r) => (
          <li key={r.from} className="flex items-center gap-3 border-t border-white/10 pt-1.5 font-tele">
            <span className="h-2 w-8 shrink-0" style={{ background: r.swatch, boxShadow: r.edge ? `0 0 0 2px ${r.edge}` : undefined }} aria-hidden />
            <span className="text-sm font-bold tracking-wider text-white">{r.from}</span>
            <span className="text-sm font-bold tracking-wider" style={{ color: r.toColor }}>
              = {r.to}
              {r.note && <small className="block text-[10px] font-normal tracking-[0.18em] text-goat-lock">{r.note}</small>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Module D: a slow looping example, +3 every hop ─────────────────────────────────── */
function BeaconPicture() {
  const [hop, setHop] = useState(0);
  useEffect(() => {
    if (reduced()) return undefined;
    const id = window.setInterval(() => setHop((n) => (n + 1) % 8), 1500);
    return () => window.clearInterval(id);
  }, []);
  const ch = (n: number) => ((((1 + 3 * n) - 1) % 12) + 12) % 12 + 1;
  const pos = (n: number) => {
    const a = ((n - 1) * 30 - 90) * (Math.PI / 180);
    return { x: 165 + 74 * Math.cos(a), y: 100 + 74 * Math.sin(a) };
  };
  const now = ch(reduced() ? 2 : hop);
  const prev = ch(reduced() ? 1 : hop - 1);
  const p = pos(now);
  return (
    <svg viewBox="0 0 330 200" className="block w-full border border-goat-cyan/30 bg-goat-void">
      <circle cx="165" cy="100" r="74" fill="none" stroke="#00f2fe" strokeOpacity="0.2" strokeDasharray="3 6" />
      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
        const q = pos(n);
        const on = n === now;
        return (
          <g key={n}>
            <circle cx={q.x} cy={q.y} r="11" fill={on ? '#f59e0b' : n === prev ? '#16202e' : '#0b1220'} stroke={on ? '#fde68a' : '#1e3a4a'} strokeWidth="2" />
            <text x={q.x} y={q.y + 1} textAnchor="middle" dominantBaseline="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill={on ? '#1b1100' : '#bfeaf0'}>{n}</text>
          </g>
        );
      })}
      <text x="165" y="96" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#5d7388" letterSpacing="2">BEACON</text>
      <text x="165" y="124" textAnchor="middle" fontFamily="Chakra Petch, monospace" fontSize="26" fontWeight="700" fill="#f59e0b">+3</text>
      <circle cx={p.x} cy={p.y} r="16" fill="none" stroke="#f59e0b" strokeWidth="3" key={hop} className="tut-ping" />
    </svg>
  );
}
