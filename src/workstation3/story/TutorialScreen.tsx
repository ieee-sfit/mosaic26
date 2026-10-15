import type { ReactNode } from 'react';
import { Glyph, SvgPlate } from '../components/Glyph';
import './tutorial.css';

export type TutorialId = 'A' | 'B' | 'C' | 'D';

/** Draws a standalone 0 or O in a line of text with the shared glyphs, so the two never look alike. */
function LineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\b(0|O)\b/).map((part, i) => (part === '0' || part === 'O' ? <Glyph key={i} ch={part} className="ws3-inl" /> : part))}
    </>
  );
}

/* ---- small SVG helpers for the mini previews ---- */

/** Pulsing highlight ring around the part of the preview a numbered line talks about. */
function Ring({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="6" className="ws3-tut-ring" />;
}
/** Numbered callout badge matching a numbered line. */
function Callout({ n, x, y }: { n: number; x: number; y: number }) {
  return (
    <g className="ws3-tut-callout">
      <circle cx={x} cy={y} r="15" />
      <text x={x} y={y + 6} textAnchor="middle">{n}</text>
    </g>
  );
}
const Frame = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 560 340" className="ws3-tut-svg" role="img" aria-label="Mini preview of the screen">
    <rect x="1" y="1" width="558" height="338" fill="#0a1020" stroke="#1e3a4a" strokeWidth="2" />
    {children}
  </svg>
);

/* ---- Module A: question card + the HINT button, bottom-right ---- */
function PreviewA() {
  const opts = ['A  Infrared + raised gain', 'B  Binarize at 255', 'C  Polarizer only', 'D  Lower the ISO'];
  return (
    <Frame>
      <rect x="16" y="14" width="112" height="26" fill="#101c31" stroke="#06b6d4" />
      <text x="72" y="32" textAnchor="middle" className="ws3-tut-t">QUESTION 1/3</text>
      <rect x="16" y="52" width="400" height="16" fill="#16233a" />
      <rect x="16" y="74" width="300" height="16" fill="#16233a" />
      {opts.map((o, i) => (
        <g key={o}>
          <rect x="16" y={102 + i * 36} width="400" height="30" fill="#0b1424" stroke="#1e3a4a" />
          <text x="30" y={122 + i * 36} className={`ws3-tut-t ${i === 1 ? 'is-struck' : ''}`}>{o}</text>
        </g>
      ))}
      <text x="402" y="122" textAnchor="end" className="ws3-tut-t ws3-tut-ok">KEEP</text>
      <text x="402" y="158" textAnchor="end" className="ws3-tut-t ws3-tut-warn">REMOVED</text>
      <text x="402" y="194" textAnchor="end" className="ws3-tut-t ws3-tut-warn">-20%</text>
      {/* hint dock, bottom-right */}
      <rect x="372" y="262" width="172" height="30" fill="#0b1424" stroke="#facc15" />
      <text x="458" y="282" textAnchor="middle" className="ws3-tut-t ws3-tut-y">HINT 1 · -40%</text>
      <rect x="372" y="298" width="172" height="30" fill="#facc15" />
      <text x="458" y="318" textAnchor="middle" className="ws3-tut-t ws3-tut-dark">HINT 2 · 0 PTS</text>
      <Ring x={366} y={256} w={184} h={78} />
      <Ring x={12} y={10} w={122} h={34} />
      <Ring x={12} y={134} w={410} h={38} />
      <Callout n={1} x={346} y={274} />
      <Callout n={2} x={152} y={27} />
      <Callout n={3} x={440} y={153} />
      <Callout n={4} x={346} y={318} />
      <Callout n={5} x={440} y={189} />
    </Frame>
  );
}

/* ---- Module B: smudged plate, tiles, rules ---- */
function PreviewB() {
  const plate = 'MH02CN4901';
  const smudged = [2, 4, 9];
  const types = ['L', 'L', 'D', 'D', 'L', 'L', 'D', 'D', 'D', 'D'];
  const cw = 38;
  const gapAfter = [1, 3, 5];
  const xs: number[] = [];
  let x = 26;
  for (let i = 0; i < 10; i++) {
    xs.push(x);
    x += cw + 3 + (gapAfter.includes(i) ? 9 : 0);
  }
  const tiles = ['0', 'O', 'C', 'G', '1', '7'];
  return (
    <Frame>
      <rect x="14" y="18" width="470" height="106" fill="#f2efd6" stroke="#0b0f19" strokeWidth="3" />
      {plate.split('').map((ch, i) => (
        <g key={i}>
          {smudged.includes(i) ? (
            <>
              <rect x={xs[i]} y="28" width={cw} height="56" fill="rgba(11,15,25,.16)" stroke="#6b6648" strokeDasharray="5 3" strokeWidth="2" />
              <text x={xs[i] + cw / 2} y="66" textAnchor="middle" className="ws3-tut-plate" fill="#6b6648">▒</text>
            </>
          ) : (
            <SvgPlate text={ch} x={xs[i] + cw / 2} y={70} size={40} className="ws3-tut-plate-g" />
          )}
          <rect x={xs[i] + 2} y="92" width={cw - 4} height="22" fill={types[i] === 'D' ? '#0b0f19' : 'rgba(11,15,25,.08)'} stroke="#0b0f19" />
          <text x={xs[i] + cw / 2} y="108" textAnchor="middle" className="ws3-tut-lab" fill={types[i] === 'D' ? '#f2efd6' : '#0b0f19'}>{types[i] === 'D' ? '123' : 'ABC'}</text>
        </g>
      ))}
      {tiles.map((t, i) => (
        <g key={t}>
          <rect x={18 + i * 52} y="146" width="44" height="52" fill="#0b1424" stroke="#1e3a4a" />
          <SvgPlate text={t} x={40 + i * 52} y={184} size={32} className="ws3-tut-tile" />
        </g>
      ))}
      <text x="18" y="226" className="ws3-tut-t ws3-tut-sub">DRAG A TILE ONTO A SMUDGE</text>
      <rect x="18" y="244" width="150" height="36" fill="#facc15" />
      <text x="93" y="268" textAnchor="middle" className="ws3-tut-t ws3-tut-dark">[CHECK PLATE]</text>
      <rect x="336" y="138" width="210" height="96" fill="rgba(250,204,21,.07)" stroke="#a16207" />
      <text x="346" y="160" className="ws3-tut-t ws3-tut-y">SLOT RULE</text>
      <text x="346" y="182" className="ws3-tut-t">ABC = letter, 123 = digit</text>
      <text x="346" y="204" className="ws3-tut-t">Zero has a dot inside.</text>
      <text x="346" y="224" className="ws3-tut-t">Letter O is plain round.</text>
      <rect x="336" y="246" width="210" height="62" fill="#0b1424" stroke="#06b6d4" strokeWidth="2" />
      <rect x="344" y="256" width="38" height="28" fill="#06b6d4" />
      <text x="363" y="276" textAnchor="middle" className="ws3-tut-t ws3-tut-dark">W1</text>
      <text x="390" y="272" className="ws3-tut-t">First letter</text>
      <text x="390" y="292" className="ws3-tut-t">before F</text>
      <Ring x={xs[2] - 4} y={24} w={cw + 8} h={64} />
      <Ring x={xs[4] - 4} y={24} w={cw + 8} h={64} />
      <Ring x={xs[9] - 4} y={24} w={cw + 8} h={64} />
      <Ring x={18} y={88} w={462} h={30} />
      <Ring x={332} y={242} w={218} h={70} />
      <Callout n={1} x={xs[2] + 19} y={14} />
      <Callout n={2} x={496} y={103} />
      <Callout n={3} x={324} y={274} />
    </Frame>
  );
}

/* ---- Module C: filters with readings + the confidence gauge ---- */
const gp = (p: number, cx: number, cy: number, r: number) => ({ x: cx - r * Math.cos(Math.PI * p), y: cy - r * Math.sin(Math.PI * p) });
function PreviewC() {
  const cards = [
    { n: 'IR', r: 'LUX 31', m: 0.62, set: 2 },
    { n: 'POLARIZER', r: 'GLARE 0.58', m: 0.55, set: 2 },
    { n: 'RAIN DEFOG', r: 'RAIN 12', m: 0.3, set: 1 },
    { n: 'BINARIZATION', r: 'SMEAR 0.84', m: 0.56, set: 2 },
  ];
  const g0 = gp(0, 472, 150, 56);
  const g1 = gp(0.824, 472, 150, 56);
  const t0 = gp(0.8, 472, 150, 44);
  const t1 = gp(0.8, 472, 150, 70);
  return (
    <Frame>
      {cards.map((c, i) => {
        const x = 14 + (i % 2) * 190;
        const y = 14 + Math.floor(i / 2) * 150;
        return (
          <g key={c.n}>
            <rect x={x} y={y} width="180" height="140" fill="#0b1424" stroke="#1e3a4a" />
            <text x={x + 10} y={y + 20} className="ws3-tut-t ws3-tut-y">{c.n}</text>
            <text x={x + 10} y={y + 48} className="ws3-tut-big">{c.r}</text>
            <rect x={x + 10} y={y + 64} width="160" height="22" fill="#070b14" stroke="#334155" />
            {['OFF', '1', '2', '3'].map((p, k) => (
              <text key={p} x={x + 30 + k * 40} y={y + 80} textAnchor="middle" className="ws3-tut-lab" fill="#7c8ba1">{p}</text>
            ))}
            {[1, 2, 3].map((k) => (
              <line key={k} x1={x + 10 + k * 40} x2={x + 10 + k * 40} y1={y + 64} y2={y + 86} stroke="#334155" />
            ))}
            <path d={`M${x + 10 + c.m * 160} ${y + 62} l-6 -9 h12 z`} fill="#06b6d4" />
            {['OFF', '1', '2', '3'].map((p, k) => (
              <g key={p}>
                <rect x={x + 10 + k * 40} y={y + 98} width="38" height="30" fill={k === c.set ? '#facc15' : '#101c31'} stroke="#1e3a4a" />
                <text x={x + 29 + k * 40} y={y + 118} textAnchor="middle" className={`ws3-tut-t ${k === c.set ? 'ws3-tut-dark' : ''}`}>{p}</text>
              </g>
            ))}
          </g>
        );
      })}
      <rect x="398" y="14" width="148" height="190" fill="#0b1424" stroke="#1e3a4a" />
      <path d={`M${g0.x} ${g0.y} A56 56 0 0 1 ${gp(1, 472, 150, 56).x} 150`} fill="none" stroke="#1e293b" strokeWidth="12" />
      <path d={`M${g0.x} ${g0.y} A56 56 0 0 1 ${g1.x} ${g1.y}`} fill="none" stroke="#facc15" strokeWidth="12" />
      <line x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} stroke="#fff" strokeWidth="4" />
      <text x="472" y="180" textAnchor="middle" className="ws3-tut-big">82.4%</text>
      <text x="472" y="198" textAnchor="middle" className="ws3-tut-lab" fill="#94a3b8">PASS AT 80%</text>
      <rect x="398" y="214" width="148" height="44" fill="#facc15" />
      <text x="472" y="242" textAnchor="middle" className="ws3-tut-t ws3-tut-dark">[LOCK PLATE]</text>
      <Ring x={20} y={34} w={150} h={20} />
      <Ring x={20} y={74} w={164} h={30} />
      <Ring x={t0.x - 10} y={t1.y - 8} w={46} h={t0.y - t1.y + 18} />
      <Callout n={1} x={186} y={28} />
      <Callout n={2} x={190} y={104} />
      <Callout n={3} x={t1.x + 10} y={t1.y - 24} />
    </Frame>
  );
}

/* ---- Module D: the camera chain ---- */
function PreviewD() {
  const lx = (l: number) => 62 + (l - 1) * 70;
  const cy = [66, 136, 206];
  const a = [1, 2, 3]; // cyan twin lanes at CAM 1-3
  const b = [4, 3, 2]; // yellow twin lanes
  return (
    <Frame>
      <rect x="26" y="20" width="296" height="236" fill="#070b14" stroke="#1e3a4a" />
      {[1, 2, 3].map((n) => (
        <line key={n} x1={26 + n * 74} x2={26 + n * 74} y1="20" y2="256" stroke="#3a4b60" strokeDasharray="8 8" strokeWidth="2" />
      ))}
      {cy.map((y, i) => (
        <g key={y}>
          <rect x="14" y={y - 6} width="320" height="12" fill="#2a4a60" />
          <text x="344" y={y + 5} className="ws3-tut-t">CAM {i + 1}</text>
        </g>
      ))}
      <polyline points={a.map((l, i) => `${lx(l)},${cy[i]}`).join(' ')} fill="none" stroke="#22d3ee" strokeWidth="5" />
      <polyline points={b.map((l, i) => `${lx(l)},${cy[i]}`).join(' ')} fill="none" stroke="#facc15" strokeWidth="5" />
      {a.map((l, i) => <circle key={`a${i}`} cx={lx(l)} cy={cy[i]} r="9" fill="#22d3ee" stroke="#fff" strokeWidth="2" />)}
      {b.map((l, i) => <circle key={`b${i}`} cx={lx(l)} cy={cy[i]} r="9" fill="#facc15" stroke="#fff" strokeWidth="2" />)}
      <text x={lx(1) - 22} y={cy[0] - 26} className="ws3-tut-t ws3-tut-c">TWIN 1</text>
      <text x={lx(4) - 30} y={cy[0] - 26} className="ws3-tut-t ws3-tut-y">TWIN 2</text>
      {[1, 2, 3, 4].map((l) => (
        <g key={l}>
          <rect x={lx(l) - 30} y="274" width="60" height="44" rx="5" fill="#0f5a3a" stroke="#fff" strokeWidth="2.5" />
          <text x={lx(l)} y="302" textAnchor="middle" className="ws3-tut-t" fill="#fff">EXIT {l}</text>
        </g>
      ))}
      <rect x="418" y="100" width="130" height="104" fill="#0b1424" stroke="#1e3a4a" />
      <text x="426" y="122" className="ws3-tut-sm">Seen at CAM 2</text>
      <text x="426" y="140" className="ws3-tut-sm">LANE 3</text>
      <rect x="426" y="150" width="114" height="22" rx="4" fill="#f2efd6" />
      <SvgPlate text="C··49" x={483} y={166} size={15} className="ws3-tut-card" />
      <rect x="426" y="178" width="114" height="18" fill="#05070c" stroke="#334155" />
      <rect x="480" y="180" width="10" height="14" rx="2" fill="#cbd5e1" />
      <Ring x={lx(1) - 16} y={cy[0] - 16} w={32} h={32} />
      <Ring x={lx(4) - 16} y={cy[0] - 16} w={32} h={32} />
      <Ring x={414} y={94} w={138} h={116} />
      <Ring x={lx(1) - 38} y={268} w={lx(4) - lx(1) + 76} h={56} />
      <Callout n={1} x={(lx(1) + lx(4)) / 2} y={cy[0] - 32} />
      <Callout n={2} x={414} y={92} />
      <Callout n={3} x={lx(1) - 36} y={266} />
    </Frame>
  );
}

function HintTable() {
  const rows: [string, string][] = [
    ['MODULE A', 'Removes one wrong answer'],
    ['MODULE B', 'Locks one glyph in place'],
    ['MODULE C', 'Highlights the worst filter'],
    ['MODULE D', 'Shows which step to fix'],
  ];
  return (
    <table className="ws3-tut-table">
      <caption>WHAT A HINT DOES</caption>
      <tbody>
        {rows.map(([m, d]) => (
          <tr key={m}>
            <th scope="row">{m}</th>
            <td>{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Page {
  title: string;
  name: string;
  lines: string[];
  picture: ReactNode;
  extra?: ReactNode;
}

const PAGES: Record<TutorialId, Page> = {
  A: {
    title: 'HOW HINTS WORK',
    name: 'MODULE A · ANPR FORENSICS',
    lines: [
      'The HINT button is always bottom-right.',
      'Every question has its own two hints.',
      "Hint 1: -40% of that question's points.",
      'Hint 2: solves it for you, for 0 points.',
      'A wrong pick costs 20% of the question.',
    ],
    picture: <PreviewA />,
    extra: <HintTable />,
  },
  B: {
    title: 'REBUILD THE PLATE',
    name: 'MODULE B · PLATE REBUILD',
    lines: ['Some plate characters are smudged.', 'Letter slots and digit slots decide 0 versus O.', 'Use the witness clues, then check.'],
    picture: <PreviewB />,
  },
  C: {
    title: 'TUNE THE FILTERS',
    name: 'MODULE C · LENS SHUFFLER',
    lines: ['Each filter has a reading.', 'Match each reading to a position.', 'Reach 80% confidence, then lock.'],
    picture: <PreviewC />,
    extra: <p className="ws3-tut-note">Small filters can still decide it.</p>,
  },
  D: {
    title: 'BLOCK THE OFFENDER',
    name: 'BONUS · BLOCKADE',
    lines: ['Two silver cars pass three cameras.', 'Match each sighting to its car, then find the offender.', 'Close the exit that car will take.'],
    picture: <PreviewD />,
  },
};

/** One single-page tutorial before each module. Nothing is scored, there is no timer, and the shift clock is paused. */
export default function TutorialScreen({ module, onContinue }: { module: TutorialId; onContinue: () => void }) {
  const page = PAGES[module];
  return (
    <main className="ws3-main ws3-tut">
      <section className="ws3-panel ws3-tut-card" aria-label={`Tutorial: ${page.title}`}>
        <div className="ws3-panel-tag">{page.name} · NOTHING SCORED · CLOCK PAUSED</div>
        <h2 className="ws3-tut-title">{page.title} <span>▸</span></h2>
        <div className="ws3-tut-grid">
          <div className="ws3-tut-picture" aria-hidden="true">{page.picture}</div>
          <div className="ws3-tut-side">
            <ol className="ws3-tut-lines">
              {page.lines.map((line, i) => (
                <li key={line}>
                  <b>{i + 1}</b>
                  <span><LineText text={line} /></span>
                </li>
              ))}
            </ol>
            {page.extra}
          </div>
        </div>
        <div className="ws3-tut-foot">
          <span className="ws3-tut-chip">HINT 1 = -40% · HINT 2 = AUTO-SOLVE, 0 PTS</span>
          <button type="button" className="ws3-btn ws3-btn--primary ws3-btn--big" onClick={onContinue} autoFocus>
            [ CONTINUE ▸ ]
          </button>
        </div>
      </section>
    </main>
  );
}
