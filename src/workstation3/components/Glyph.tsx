import type { CSSProperties } from 'react';

/* ==========================================================================
   One shared glyph renderer for every plate in Station 3.
   The digit ZERO is drawn as a narrow oval with a DOT inside; the letter O is
   drawn as a plain, slightly wider round O. Both are drawn as shapes (not as
   font characters), so they look the same in every font and can never be
   mistaken for each other. All other characters are normal text.
   ========================================================================== */

const spoken = (ch: string): string => (ch === '0' ? 'zero' : ch === 'O' ? 'letter O' : ch);

/** Accessible reading of a plate string, e.g. "M H zero 2". */
export const plateLabel = (text: string): string => [...text].filter((c) => c !== ' ').map(spoken).join(' ');

/** One character as an inline glyph; size comes from the surrounding font-size (1em tall caps). */
export function Glyph({ ch, className = '' }: { ch: string; className?: string }) {
  if (ch === '0') {
    return (
      <span className={`ws3-g ws3-g--zero ${className}`} aria-hidden="true">
        <svg viewBox="0 0 56 74" focusable="false">
          <ellipse cx="28" cy="37" rx="20" ry="30" fill="none" stroke="currentColor" strokeWidth="9" />
          <circle cx="28" cy="37" r="6.5" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (ch === 'O') {
    return (
      <span className={`ws3-g ws3-g--o ${className}`} aria-hidden="true">
        <svg viewBox="0 0 78 74" focusable="false">
          <ellipse cx="39" cy="37" rx="30" ry="30" fill="none" stroke="currentColor" strokeWidth="9" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`ws3-g ${className}`} aria-hidden="true">
      {ch}
    </span>
  );
}

/** A whole plate (or any plate fragment) as glyphs. Spaces stay as spaces. */
export function PlateText({ text, className = '', style }: { text: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`ws3-pt ${className}`} style={style} role="img" aria-label={plateLabel(text)}>
      {[...text].map((ch, i) => (ch === ' ' ? <span key={i} className="ws3-pt-sp" aria-hidden="true" /> : <Glyph key={i} ch={ch} />))}
    </span>
  );
}

/* ---- the same drawing for SVG scenes (the Module C viewfinder) ---- */

const ADV = 0.62; // character advance, in font-size units
const SPACE = 0.34;

/** Lays a plate string out centred on x with the zero-with-dot / plain-O shapes. `y` is the baseline. */
export function SvgPlate({ text, x, y, size, anchorWidth, className }: { text: string; x: number; y: number; size: number; anchorWidth?: number; className?: string }) {
  const chars = [...text];
  const natural = chars.reduce((n, c) => n + (c === ' ' ? SPACE : ADV) * size, 0);
  const k = anchorWidth ? anchorWidth / natural : 1; // squeeze/stretch to a plate width
  let cx = x - (natural * k) / 2;
  const out = chars.map((c, i) => {
    const w = (c === ' ' ? SPACE : ADV) * size * k;
    const mid = cx + w / 2;
    cx += w;
    if (c === ' ') return null;
    const sw = size * 0.1;
    const h = size * 0.34;
    const cy = y - size * 0.36;
    if (c === '0') {
      return (
        <g key={i}>
          <ellipse cx={mid} cy={cy} rx={size * 0.2 * k} ry={h} fill="none" stroke="currentColor" strokeWidth={sw} />
          <circle cx={mid} cy={cy} r={size * 0.062} fill="currentColor" />
        </g>
      );
    }
    if (c === 'O') {
      return <ellipse key={i} cx={mid} cy={cy} rx={size * 0.29 * k} ry={h} fill="none" stroke="currentColor" strokeWidth={sw} />;
    }
    return (
      <text key={i} x={mid} y={y} textAnchor="middle" fontSize={size} fill="currentColor">
        {c}
      </text>
    );
  });
  return <g role="img" aria-label={plateLabel(text)} className={className}>{out}</g>;
}
