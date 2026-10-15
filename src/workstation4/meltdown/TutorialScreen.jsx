import { Chip, Hole, Table } from './BoardParts'
import RelayDiagram from './RelayDiagram'
import './tutorial.css'

/* ---- small SVG helpers for the mini previews (each preview is a cut-down copy of the REAL screen) ---- */

/** Pulsing highlight ring around the part of the preview a numbered line talks about. */
function Ring({ x, y, w, h }) {
  return <rect x={x} y={y} width={w} height={h} rx="6" className="mz-tut-ring" />
}
/** Numbered callout badge matching a numbered line. */
function Callout({ n, x, y }) {
  return (
    <g className="mz-tut-callout">
      <circle cx={x} cy={y} r="15" />
      <text x={x} y={y + 6} textAnchor="middle">{n}</text>
    </g>
  )
}
const Frame = ({ children }) => (
  <svg viewBox="0 0 560 340" className="mz-tut-svg" role="img" aria-label="Mini preview of the screen">
    <rect x="1" y="1" width="558" height="338" fill="#050a07" stroke="#1f3a2a" strokeWidth="2" />
    {children}
  </svg>
)

/* ---- Module A: question card + the HINT buttons, bottom-right ---- */
function PreviewA() {
  const opts = ['A  Y = 1', 'B  Y = 0', 'C  Y = floating', 'D  Y = A + B']
  return (
    <Frame>
      <rect x="16" y="14" width="150" height="26" fill="#0c1a12" stroke="#22c55e" />
      <text x="91" y="32" textAnchor="middle" className="mz-tut-t">QUERY 1/3</text>
      <rect x="16" y="52" width="400" height="14" fill="#13241a" />
      <rect x="16" y="72" width="290" height="14" fill="#13241a" />
      {opts.map((o, i) => (
        <g key={o}>
          <rect x="16" y={100 + i * 38} width="400" height="30" fill="#09130d" stroke="#1f3a2a" />
          <text x="30" y={120 + i * 38} className={`mz-tut-t ${i === 2 ? 'is-struck' : ''}`}>{o}</text>
        </g>
      ))}
      <text x="404" y="196" textAnchor="end" className="mz-tut-t mz-tut-bad">REMOVED</text>
      <text x="404" y="120" textAnchor="end" className="mz-tut-t mz-tut-bad">WRONG: -20%</text>
      <rect x="372" y="262" width="172" height="30" fill="#09130d" stroke="#d9ffe8" />
      <text x="458" y="282" textAnchor="middle" className="mz-tut-t">HINT 1 · -40%</text>
      <rect x="372" y="298" width="172" height="30" fill="#22c55e" />
      <text x="458" y="318" textAnchor="middle" className="mz-tut-t mz-tut-dark">HINT 2 · 0 PTS</text>
      <Ring x={366} y={256} w={184} h={78} />
      <Ring x={12} y={10} w={158} h={34} />
      <Ring x={12} y={166} w={410} h={38} />
      <Ring x={12} y={96} w={410} h={38} />
      <Callout n={1} x={346} y={274} />
      <Callout n={2} x={440} y={185} />
      <Callout n={3} x={346} y={316} />
      <Callout n={4} x={440} y={110} />
      <Callout n={5} x={190} y={27} />
    </Frame>
  )
}

/* ---- Module B: one bay of the breadboard, real chip and pin labels ---- */
function PreviewB() {
  return (
    <Frame>
      <rect x="10" y="10" width="540" height="320" rx="6" fill="rgba(8,14,11,.9)" stroke="#22c55e" strokeWidth="2" />
      <line x1="30" x2="360" y1="52" y2="52" stroke="#22c55e" strokeWidth="6" opacity=".6" />
      <text x="30" y="40" className="mz-tut-t mz-tut-ok">VCC · +5V RAIL</text>
      <line x1="30" x2="360" y1="300" y2="300" stroke="#ef4444" strokeWidth="6" opacity=".6" />
      <text x="30" y="318" className="mz-tut-t mz-tut-bad">GND RAIL</text>
      {[['A', 120], ['B', 190]].map(([n, y]) => (
        <g key={n}>
          <rect x="24" y={y - 24} width="56" height="46" rx="4" fill="#101a14" stroke="#2c5a3f" strokeWidth="2" />
          <text x="34" y={y - 6} className="mz-tut-t mz-tut-white">{n}</text>
          <text x="34" y={y + 14} className="mz-tut-t mz-tut-bad">0</text>
        </g>
      ))}
      <Hole id="t-a" x={112} y={120} kind="s" r={7} label="A" labelDy={-14} />
      <Hole id="t-b" x={112} y={190} kind="s" r={7} label="B" labelDy={-14} />
      <Hole id="t-o" x={360} y={190} kind="s" r={7} label="OUT" labelDy={-14} />
      <Chip cx={236} cy={176} chip={{ type: 'AND' }} />
      {/* wires: level 1 green, level 0 red */}
      <path d="M112 120 Q150 140 176 136" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
      <path d="M296 136 Q330 70 330 52" fill="none" stroke="#4ade80" strokeWidth="5" strokeLinecap="round" />
      <path d="M296 216 Q330 280 330 300" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
      <path d="M112 190 Q145 200 176 176" className="mz-tut-hintwire" />
      <path d="M296 176 Q330 200 360 190" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
      <Table x={392} y={44} title="TARGET" cols={['A', 'B', 'Y']} rows={[['0', '0', 0], ['0', '1', 0], ['1', '0', 0], ['1', '1', 1]].map((c, i) => ({ key: i, cells: c }))} width={128} accent="#22c55e" />
      <rect x="398" y="250" width="116" height="44" rx="4" fill="rgba(34,197,94,.12)" stroke="#22c55e" strokeWidth="2" />
      <text x="456" y="277" textAnchor="middle" className="mz-tut-t mz-tut-ok">VERIFY BAY</text>
      <Ring x={388} y={22} w={148} h={122} />
      <Ring x={166} y={118} w={140} h={116} />
      <Ring x={296} y={46} w={64} h={96} />
      <Ring x={392} y={244} w={128} h={56} />
      <Ring x={100} y={110} w={90} h={90} />
      <Callout n={1} x={536} y={20} />
      <Callout n={2} x={166} y={116} />
      <Callout n={3} x={366} y={56} />
      <Callout n={4} x={380} y={272} />
      <Callout n={5} x={96} y={206} />
    </Frame>
  )
}

/* ---- Module C: door logic, green = 1, red = 0 ---- */
function Node({ x, y, w = 96, h = 56, label, v, state }) {
  const tone = v === 1 ? '#22c55e' : '#ef4444'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#050606" stroke={tone} strokeWidth="2.5" />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" className="mz-tut-sm">{label}</text>
      <text x={state ? x + 16 : x + w / 2} y={y + 44} textAnchor={state ? 'start' : 'middle'} className="mz-tut-big" fill={tone}>{v}</text>
      {state && <text x={x + w - 10} y={y + 43} textAnchor="end" className={`mz-tut-sm ${v ? 'mz-tut-ok' : 'mz-tut-bad'}`}>{state}</text>}
    </g>
  )
}
function PreviewC() {
  const wire = (d, v) => <path d={d} fill="none" stroke={v ? '#22c55e' : '#ef4444'} strokeWidth="4" />
  return (
    <Frame>
      <rect x="14" y="12" width="532" height="76" fill="rgba(239,68,68,.12)" stroke="#ef4444" strokeWidth="2" />
      <text x="26" y="36" className="mz-tut-t mz-tut-white">SEAL THE REAR DOOR: make REAR BLAST read 0 (red)</text>
      <text x="26" y="58" className="mz-tut-sm mz-tut-bad">AND is 0 if any input is 0. OR is 0 only if both are 0.</text>
      <text x="26" y="78" className="mz-tut-sm">Flip an input to 0, or swap a gate.</text>
      {wire('M120 160 C150 160 150 130 180 130', 1)}
      {wire('M120 250 C150 250 150 210 180 210', 0)}
      {wire('M276 130 C320 130 320 150 350 150', 1)}
      {wire('M276 210 C320 210 320 150 350 150', 0)}
      {wire('M446 150 C466 150 466 128 438 128', 1)}
      {wire('M446 150 C466 150 466 256 438 256', 0)}
      <Node x={24} y={132} w={96} label="A · PWR" v={1} />
      <Node x={24} y={222} w={96} label="B · KEY" v={0} />
      <rect x="180" y="104" width="96" height="56" fill="#050606" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="0" />
      <text x="228" y="126" textAnchor="middle" className="mz-tut-sm">S1</text>
      <text x="228" y="148" textAnchor="middle" className="mz-tut-t mz-tut-white">OR</text>
      <rect x="180" y="184" width="96" height="56" fill="#050606" stroke="#ef4444" strokeWidth="2.5" />
      <text x="228" y="206" textAnchor="middle" className="mz-tut-sm">S2</text>
      <text x="228" y="228" textAnchor="middle" className="mz-tut-t mz-tut-white">AND</text>
      <Node x={350} y={122} w={96} label="S3" v={1} />
      <Node x={350} y={210} w={96} label="S4" v={0} />
      <Node x={438} y={100} w={104} label="FRONT DOOR" v={1} state="OPEN" />
      <Node x={438} y={228} w={104} label="REAR BLAST" v={0} state="SEALED" />
      <rect x="14" y="290" width="236" height="36" fill="#09130d" stroke="#d9ffe8" />
      <text x="24" y="313" className="mz-tut-t">WRONG TRIES: -20% EACH</text>
      <Ring x={20} y={128} w={104} h={64} />
      <Ring x={434} y={96} w={112} h={64} />
      <Ring x={434} y={224} w={112} h={64} />
      <Ring x={10} y={8} w={540} h={84} />
      <Ring x={10} y={286} w={244} h={44} />
      <Callout n={1} x={22} y={196} />
      <Callout n={2} x={430} y={98} />
      <Callout n={3} x={430} y={292} />
      <Callout n={4} x={536} y={30} />
      <Callout n={5} x={268} y={308} />
    </Frame>
  )
}

/* ---- Module D: the relay circuit and the bit switches, real diagram ---- */
const D_SAMPLE = { bits: 3, rungs: [[1], [-1, 2], [-2, -3]] }
function PreviewD() {
  const bits = [1, 0, 0]
  return (
    <Frame>
      <rect x="10" y="10" width="540" height="190" fill="#020303" stroke="#1f3a2a" />
      <RelayDiagram bare charge={D_SAMPLE} bits={bits} hotBit={1} x={14} y={14} width={532} height={182} />
      {bits.map((b, k) => (
        <g key={k}>
          <rect x={26 + k * 98} y="216" width="90" height="52" fill={b ? 'rgba(34,197,94,.16)' : 'rgba(239,68,68,.12)'} stroke={b ? '#22c55e' : '#ef4444'} strokeWidth="2.5" />
          <text x={36 + k * 98} y="238" className="mz-tut-t" fill={b ? '#4ade80' : '#f87171'}>B{k + 1}</text>
          <text x={102 + k * 98} y="254" textAnchor="end" className="mz-tut-big" fill={b ? '#4ade80' : '#f87171'}>{b}</text>
        </g>
      ))}
      <rect x="352" y="222" width="190" height="40" fill="rgba(34,197,94,.14)" stroke="#22c55e" strokeWidth="2" />
      <text x="447" y="247" textAnchor="middle" className="mz-tut-t mz-tut-ok">[ ARM CHARGE ]</text>
      <rect x="352" y="272" width="190" height="26" fill="#09130d" stroke="#d9ffe8" />
      <text x="447" y="290" textAnchor="middle" className="mz-tut-t">HINT 1 · -40%</text>
      <rect x="352" y="302" width="190" height="26" fill="#22c55e" />
      <text x="447" y="320" textAnchor="middle" className="mz-tut-t mz-tut-dark">HINT 2 · 0 PTS</text>
      <Ring x={20} y={210} w={296} h={64} />
      <Ring x={120} y={28} w={106} h={150} />
      <Ring x={236} y={28} w={118} h={150} />
      <Ring x={354} y={28} w={116} h={150} />
      <Ring x={474} y={60} w={72} h={116} />
      <Ring x={348} y={268} w={198} h={34} />
      <Ring x={348} y={298} w={198} h={34} />
      <Callout n={1} x={20} y={288} />
      <Callout n={2} x={174} y={24} />
      <Callout n={3} x={292} y={24} />
      <Callout n={4} x={412} y={24} />
      <Callout n={5} x={510} y={48} />
      <Callout n={6} x={330} y={286} />
      <Callout n={7} x={330} y={316} />
    </Frame>
  )
}

function HintTable() {
  const rows = [
    ['MODULE A', 'Strikes out one wrong option'],
    ['MODULE B', 'Pulses the next correct wire'],
    ['MODULE C', 'Points at the deciding part'],
    ['MODULE D', 'Reveals one bit'],
  ]
  return (
    <table className="mz-tut-table">
      <caption>WHAT HINT 1 DOES</caption>
      <tbody>
        {rows.map(([m, d]) => (
          <tr key={m}><th scope="row">{m}</th><td>{d}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

const PAGES = {
  A: {
    title: 'HOW HINTS WORK',
    name: 'MODULE A · PROTOCOL',
    lines: [
      'The HINT button sits bottom-right.',
      'Hint 1 (-40%) strikes one wrong option.',
      'Hint 2 solves it for 0 points.',
      'A wrong pick costs 20%.',
      'Each question has its own hints.',
    ],
    picture: <PreviewA />,
    extra: <HintTable />,
  },
  B: {
    title: 'BUILD THE LOGIC CHIPS',
    name: 'MODULE B · BREADBOARD',
    lines: [
      'Pick the chip the TARGET table needs.',
      'Every chip shows the same five pins.',
      'Wire VCC, GND, inputs, then OUT.',
      'A mistake costs 20% of the bay.',
      'Hint 1 pulses the next wire.',
    ],
    picture: <PreviewB />,
  },
  C: {
    title: 'OPEN THE FRONT, SEAL THE REAR',
    name: 'MODULE C · DOOR LOGIC',
    lines: [
      'Green is 1. Red is 0.',
      'Open the front: make FRONT DOOR green.',
      'Seal the rear: make REAR BLAST red.',
      'Flip an input, or swap a gate.',
      'Wrong tries cost 20% of the phase.',
    ],
    picture: <PreviewC />,
  },
  D: {
    title: 'BREAK THE CODES',
    name: 'BONUS · CODE BREAKER',
    lines: [
      'Flip bits: red is 0, green is 1.',
      'In a row = AND: all must pass.',
      'Side by side = OR: one passes.',
      'NOT contact closes when bit is 0.',
      'Green current to the detonator arms it.',
      'Hint 1 (-40%) reveals one bit.',
      'Hint 2 enters the code, 0 points.',
    ],
    picture: <PreviewD />,
  },
}

/** One single-page tutorial before each module. Nothing is scored, there is no timer, and the shift clock is paused. */
export default function TutorialScreen({ module, onContinue }) {
  const page = PAGES[module]
  return (
    <div className="mz-tut" data-tutorial={module}>
      <section className="mz-panel mz-chamfer mz-tut-card" aria-label={`Tutorial: ${page.title}`}>
        <header className="mz-panel-head">
          <span>{page.name}</span>
          <span className="mz-green">NOTHING SCORED · CLOCK PAUSED</span>
        </header>
        <div className="mz-tut-inner">
          <h2 className="mz-tut-title">{page.title} <span>▸</span></h2>
          <div className="mz-tut-grid">
            <div className="mz-tut-picture" aria-hidden="true">{page.picture}</div>
            <div className="mz-tut-side">
              <ol className="mz-tut-lines">
                {page.lines.map((line, i) => (
                  <li key={line}><b>{i + 1}</b><span>{line}</span></li>
                ))}
              </ol>
              {page.extra}
            </div>
          </div>
          <div className="mz-tut-foot">
            <span className="mz-tut-chip">HINT 1 = -40% · HINT 2 = AUTO-SOLVE, 0 PTS</span>
            <button type="button" className="mz-btn mz-btn-green mz-big" onClick={onContinue} autoFocus data-tut-continue>
              [ CONTINUE ▸ ]
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
