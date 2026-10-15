import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import HintDock from '../../core/HintDock';
import Codebook from '../../core/radiolink/Codebook';
import { LAP_VARIANTS, QUESTION_BANK, RADIO_CODEBOOK, SECTIONS, STATION2_CONFIG } from '../mockStation2Data';
import { fmtLoss, fmtMbps, metricsOf, pctOf, safeBands, simulate, solveSection, verdictOf } from '../logic';
import { pillPositions, pillSize } from '../pills';
import Gauge from './Gauge';
import LeMansMap from './LeMansMap';
import Panel from './Panel';
import { QualityControl, RelayControl, SplitControl } from './BalancerControls';

export type TutorialId = 'A' | 'B' | 'C' | 'D';

interface Props {
  module: TutorialId;
  onContinue: () => void;
}

/** A pulsing ring (and its number) drawn over one element of the mini screen. Found by CSS selector inside the picture. */
interface Ring { sel: string; n?: number; tag?: string; /** Where the number sits on the ring: top-left (default), top-right, left of it, or bottom-left. */ at?: 'tl' | 'tr' | 'l' | 'bl' }

const noop = () => undefined;

/**
 * A small static picture of the real screen. The screen is laid out at its true size (`w` x `h`), scaled down to fit, and made inert,
 * so it is built from the same components and styles as the real module. The rings are measured from the real elements.
 */
function Mini({ w, minH = 0, rings, children }: { w: number; minH?: number; rings: Ring[]; children: ReactNode }) {
  const box = useRef<HTMLDivElement | null>(null);
  const screen = useRef<HTMLDivElement | null>(null);
  const [k, setK] = useState(0.5);
  const [h, setH] = useState(400);
  const [boxes, setBoxes] = useState<(null | { x: number; y: number; w: number; h: number })[]>([]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => {
      setK(el.getBoundingClientRect().width / w);
      if (screen.current) setH(screen.current.scrollHeight);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  // measure the real elements once the scale is applied (and again when the fonts arrive)
  useLayoutEffect(() => {
    const measure = () => {
      const s = screen.current;
      if (!s) return;
      const o = s.getBoundingClientRect();
      setBoxes(rings.map((r) => {
        const t = s.querySelector(r.sel);
        if (!t) return null;
        const b = t.getBoundingClientRect();
        return { x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
      }));
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [k, rings]);

  return (
    <div ref={box} className="ws2-mini" style={{ height: h * k }} aria-hidden>
      <div ref={screen} className="ws2-mini__screen" style={{ width: w, minHeight: minH, transform: `scale(${k})` }} inert>
        {children}
      </div>
      {boxes.map((b, i) => b && (
        <span key={i} className="ws2-mini__mark" style={{ left: b.x - 5, top: b.y - 5, width: b.w + 10, height: b.h + 10 }}>
          <i className="ws2-mini__ring" />
          {rings[i].n && <b className={`ws2-mini__call is-${rings[i].at ?? 'tl'}`}>{rings[i].n}</b>}
          {rings[i].tag && <em className="ws2-mini__tag">{rings[i].tag}</em>}
        </span>
      ))}
    </div>
  );
}

/* ── A: a question with the HINT button bottom-right ─────────────────────────────────── */
const RINGS_A: Ring[] = [{ sel: '.hd-btn', n: 1, at: 'l' }, { sel: '.ws2-sheet__head span', n: 2, at: 'l' }, { sel: '.hd-panel', n: 3 }];
function PictureA() {
  const q = QUESTION_BANK.find((x) => x.id === 'Q06') ?? QUESTION_BANK[0];
  const removed = 0; // a wrong option that "Hint 1" has taken away
  return (
    <Mini w={800} minH={500} rings={RINGS_A}>
      <section className="ws2-modA">
        <div className="ws2-modhead"><b>MODULE A</b><span>PIT TELEMETRY</span><em>0 / {STATION2_CONFIG.moduleMax.A}</em></div>
        <article className="ws2-sheet">
          <header className="ws2-sheet__head"><b>TIMING SHEET</b><span>QUESTION 1 / 3</span><span>5 PTS</span></header>
          <p className="ws2-sheet__q">{q.prompt}</p>
          <ol className="ws2-sheet__opts">
            {q.options.map((opt, n) => (
              <li key={n}>
                <button type="button" tabIndex={-1} className={`ws2-opt ${n === removed ? 'is-struck is-removed' : ''}`}>
                  <span className="ws2-opt__box">{'ABCD'[n]}</span>
                  <span className="ws2-opt__text">{opt}</span>
                  {n === removed && <i className="ws2-stamp ws2-stamp--out" aria-hidden>REMOVED</i>}
                </button>
              </li>
            ))}
          </ol>
        </article>
        <HintDock level={1} itemLabel="QUESTION 1/3" hint1Text="One wrong option is removed." cost1={STATION2_CONFIG.hintPenalty.hint1} onHint={noop} />
      </section>
    </Mini>
  );
}

/** WHAT A HINT DOES: one row per module. */
function HintTable() {
  const rows: [string, string][] = [
    ['MODULE A', 'Removes one wrong answer'],
    ['MODULE B', 'Tells you which NEED line fails'],
    ['MODULE C', 'Says which contract line fails'],
    ['MODULE D', 'Slows the stream'],
  ];
  return (
    <table className="ws2-tut__table">
      <caption>WHAT A HINT DOES</caption>
      <tbody>
        {rows.map(([m, d]) => <tr key={m}><th scope="row">{m}</th><td>{d}</td></tr>)}
      </tbody>
    </table>
  );
}

/* ── B: the route map, with the NEED lines highlighted ───────────────────────────────── */
const RINGS_B: Ring[] = [{ sel: '.ws2-bmap .ws2-lm', n: 1 }, { sel: '.ws2-pill.is-route', n: 2 }, { sel: '.ws2-crows', n: 3, at: 'tr' }];
function PictureB() {
  const sec = SECTIONS.find((s) => s.id === 'Q1') ?? SECTIONS[0];
  const route = solveSection(sec) ?? ['T', 'P'];
  const m = metricsOf(sec, route);
  const v = verdictOf(sec, m);
  const pills = pillPositions(sec);
  const pill = pillSize(sec);
  const onRoute = (a: string, b: string) => route.some((id, i) => i + 1 < route.length && ((id === a && route[i + 1] === b) || (id === b && route[i + 1] === a)));
  const labelOf = (id: string) => (id === 'T' ? 'TWR' : id === 'P' ? 'PIT' : id);
  const rows = [
    { id: 'lat', label: 'LATENCY', now: `${Math.round(m.ms)} ms`, need: `≤ ${sec.need.ms} ms`, ok: v.lat },
    { id: 'loss', label: 'LOSS', now: fmtLoss(m.loss), need: `≤ ${fmtLoss(sec.need.loss)}`, ok: v.loss },
    { id: 'bw', label: 'BANDWIDTH', now: `${fmtMbps(m.mbps)} M`, need: `≥ ${sec.need.mbps} M`, ok: v.bw },
  ];
  return (
    <Mini w={860} rings={RINGS_B}>
      <section className="ws2-modB">
        <div className="ws2-modhead"><b>MODULE B</b><span>ROUTES</span><em>0 / {STATION2_CONFIG.moduleMax.B}</em></div>
        <div className="ws2-bgrid">
          <div className="ws2-bmain">
            <Panel title="TOWER → PIT WALL" tag="QUALIFYING · RUN 1" className="ws2-bmap">
              <LeMansMap className="ws2-map" label="Route map" names={false} faintLabels={false}>
                <g className="ws2-rb">
                  {sec.beams.map((b) => (
                    <line key={`${b.a}${b.b}`} x1={sec.nodes[b.a].x} y1={sec.nodes[b.a].y} x2={sec.nodes[b.b].x} y2={sec.nodes[b.b].y} className={`ws2-beam ${onRoute(b.a, b.b) ? 'is-route' : ''}`} />
                  ))}
                  {sec.beams.map((b) => {
                    const at = pills[`${b.a}${b.b}`];
                    const live = onRoute(b.a, b.b);
                    return (
                      <g key={`p${b.a}${b.b}`} transform={`translate(${at.x} ${at.y})`} className={`ws2-pill ${live ? 'is-route' : ''}`}>
                        <rect x={-pill.w / 2} y={-pill.h / 2} width={pill.w} height={pill.h} />
                        <text y="-3" textAnchor="middle">{b.ms}ms · {b.loss}%</text>
                        <text y="14" textAnchor="middle">{b.mbps}M</text>
                      </g>
                    );
                  })}
                  {Object.entries(sec.nodes).map(([id, p]) => {
                    const w = id === 'T' || id === 'P' ? 58 : 38;
                    return (
                      <g key={id} transform={`translate(${p.x} ${p.y})`} className={`ws2-node ${route.includes(id) ? 'is-route' : ''} ${id === 'T' ? 'is-tower' : ''} ${id === 'P' ? 'is-pit' : ''}`}>
                        <rect x={-w / 2} y="-17" width={w} height="34" className="ws2-node__box" />
                        <text y="5.5" textAnchor="middle" className="ws2-node__txt">{labelOf(id)}</text>
                      </g>
                    );
                  })}
                </g>
              </LeMansMap>
            </Panel>
          </div>
          <aside className="ws2-bside">
            <Panel title="NOW vs NEED" tag="ROUTE" className={`ws2-btotals ${v.ok ? 'is-met' : ''}`}>
              <div className="ws2-route">
                {route.map((id, i) => <span key={id} className={id === 'P' ? 'is-end' : ''}>{i > 0 && <i>→</i>}{labelOf(id)}</span>)}
              </div>
              <ul className="ws2-crows">
                <li className="ws2-crows__head"><span>NOW</span><span>NEED</span><span /></li>
                {rows.map((r) => (
                  <li key={r.id} className={r.ok ? 'ok' : 'bad'}>
                    <span className="ws2-crows__cell"><small>{r.label}</small><b className="ws2-crows__now">{r.now}</b></span>
                    <span className="ws2-crows__need">{r.need}</span>
                    <span className="ws2-crows__tick">{r.ok ? '✓' : '✕'}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>
      </section>
    </Mini>
  );
}

/* ── C: the balancer, with split, quality and relay ──────────────────────────────────── */
const RINGS_C: Ring[] = [
  { sel: '.ws2-cluster__row', n: 1 },
  { sel: '.ws2-ctl[data-part="split"]', n: 2, at: 'l' },
  { sel: '.ws2-ctl[data-part="quality"]' },
  { sel: '.ws2-ctl[data-part="relay"]', tag: 'OPTIONAL' },
  { sel: '.ws2-btn--commit', n: 3 },
];
function PictureC() {
  const stint = LAP_VARIANTS[1][0];
  const ctl = { split: 34, qualityIdx: 0, divert: false };
  const sim = simulate(stint, ctl);
  const bands = safeBands(stint, ctl.qualityIdx, ctl.divert);
  return (
    <Mini w={860} rings={RINGS_C}>
      <section className="ws2-modC">
        <div className="ws2-modhead"><b>MODULE C</b><span>RACE</span><em>0 / {STATION2_CONFIG.moduleMax.C}</em></div>
        <div className="ws2-cleft">
          <Panel title="NODES" tag={stint.tag} className="ws2-cluster">
            <div className="ws2-cluster__row">
              {sim.nodes.map((n) => (
                <Gauge
                  key={n.id} value={n.util} limitAt={STATION2_CONFIG.utilLimit} label={n.label} readout={`${pctOf(n.util)}%`}
                  active={n.active} badge={(ctl.divert ? 'arnage' : stint.spikeTarget) === n.id ? `SPIKE +${stint.spikeM}M` : undefined}
                />
              ))}
            </div>
          </Panel>
          <Panel className="ws2-ctrl">
            <div className="ws2-ctrl__row">
              <SplitControl ctl={ctl} bands={bands} qualityOk={sim.qualityOk} busy={false} onChange={noop} />
              <QualityControl stint={stint} ctl={ctl} busy={false} onChange={noop} />
              <RelayControl ctl={ctl} busy={false} onToggle={noop} />
            </div>
            <div className="ws2-ctrl__foot">
              <span className="ws2-ctrl__msg is-info"> </span>
              <button type="button" tabIndex={-1} className={`ws2-btn ws2-btn--commit ${sim.locked ? 'is-ready' : ''}`}>COMMIT</button>
            </div>
          </Panel>
        </div>
      </section>
    </Mini>
  );
}

/* ── D: the radio bit stream with one run highlighted ────────────────────────────────── */
const RINGS_D: Ring[] = [{ sel: '.rl-view', n: 1 }, { sel: '.ws2-mini-run', n: 2 }, { sel: '.rl-key.is-resend', n: 3, at: 'tr' }];
function PictureD() {
  // 0 0 1 0 | 0 1 1 1 1 1 0 | 0 1 ... : the highlighted run is five 1s between two 0s (DRS ON in the codebook)
  const lead = [0, 1, 0, 0, 1, 0];
  const run = [0, 1, 1, 1, 1, 1, 0];
  const tail = [0, 0, 1, 1, 0, 1, 0];
  const cell = (b: number, i: number) => <i key={i} className={b ? 'one' : 'zero'}>{b}</i>;
  return (
    <Mini w={860} rings={RINGS_D}>
      <section className="ws2-modD">
        <div className="ws2-modhead"><b>MODULE D</b><span>FINAL PUSH · RADIO LINK</span><em>0 / {STATION2_CONFIG.moduleMax.D}</em></div>
        <Panel title="CODEBOOK" tag="STAGE 2/3">
          <div className="ws2-D__book">
            <Codebook entries={RADIO_CODEBOOK.slice(0, 4)} rule="ANY OTHER RUN = CORRUPTED · PRESS 7 RESEND" />
          </div>
        </Panel>
        <Panel title="ENGINEER ▸ CAR" tag="1.8 BITS/S">
          <div className="ws2-D__stage">
            <div className="rl">
              <div className="rl-view" style={{ ['--rl-cell' as string]: '52px' }}>
                <div className="rl-track" style={{ left: 24, transform: 'none', gap: 0 }}>
                  {lead.map(cell)}
                  <span className="ws2-mini-run">{run.map((b, i) => cell(b, 100 + i))}</span>
                  {tail.map((b, i) => cell(b, 200 + i))}
                </div>
                <div className="rl-bar"><div /></div>
              </div>
              <div className="rl-keys" style={{ marginTop: 14 }}>
                {[...RADIO_CODEBOOK.slice(0, 4).map((e) => e.label), 'RESEND'].map((label, n, all) => (
                  <button key={label} type="button" tabIndex={-1} className={`rl-key ${n === all.length - 1 ? 'is-resend' : ''}`} data-armed="1">
                    <kbd>{n === all.length - 1 ? 7 : n + 1}</kbd><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </section>
    </Mini>
  );
}

interface Page { title: string; name: string; lines: string[]; picture: ReactNode; extra?: ReactNode }

const PAGES: Record<TutorialId, Page> = {
  A: {
    title: 'HOW HINTS WORK',
    name: 'MODULE A · TELEMETRY',
    lines: [
      'The HINT button is always bottom-right.',
      'Every question has its own two hints.',
      "Hint 1: -40% of that question's points.",
      'Hint 2: solves it for you, for 0 points.',
      'A wrong pick costs 20% of the question.',
    ],
    picture: <PictureA />,
    extra: <HintTable />,
  },
  B: {
    title: 'BUILD THE ROUTE',
    name: 'MODULE B · ROUTES',
    lines: [
      'Pick relay sites to build a route.',
      'Latency adds. Loss compounds. Bandwidth is the narrowest link.',
      'Meet every NEED line, then send.',
    ],
    picture: <PictureB />,
  },
  C: {
    title: 'BALANCE THE LOAD',
    name: 'MODULE C · RACE',
    lines: ['Viewers surge. Masts can overload.', 'Move the split. Pick a quality.', 'Stay in the green zones, then commit.'],
    picture: <PictureC />,
    extra: <p className="ws2-tut__note"><b>RELAY:</b> optional, adds {STATION2_CONFIG.relayHopMs} ms.</p>,
  },
  D: {
    title: 'DECODE THE RADIO',
    name: 'MODULE D · FINAL PUSH · BONUS',
    lines: ['Bits stream past on the race radio.', 'Count the run between opposite bits.', 'No match? It is corrupted. Press RESEND.'],
    picture: <PictureD />,
  },
};

/** One single-page tutorial before each module. Nothing is scored and the shift clock is paused. */
export default function TutorialScreen({ module, onContinue }: Props) {
  const page = PAGES[module];
  return (
    <div className="ws2-tutwrap ws2-in" data-tutorial={module}>
      <section className="ws2-tut" aria-label={`Tutorial: ${page.title}`}>
        <header className="ws2-tut__head">
          <span className="ws2-tut__mod">{page.name}</span>
          <span className="ws2-tut__tag">NOTHING SCORED · CLOCK PAUSED</span>
        </header>
        <h1 className="ws2-tut__title">{page.title}</h1>
        <div className="ws2-tut__body">
          <div className="ws2-tut__pic">{page.picture}</div>
          <div className="ws2-tut__side">
            <ol className="ws2-tut__lines">
              {page.lines.map((line, i) => (
                <li key={line} className={i < 3 ? '' : 'is-plain'}><b>{i + 1}</b><span>{line}</span></li>
              ))}
            </ol>
            {page.extra}
          </div>
        </div>
        <footer className="ws2-tut__foot">
          <span className="ws2-tut__chip">HINT 1 = -40% · HINT 2 = AUTO-SOLVE, 0 PTS</span>
          <button type="button" className="ws2-btn ws2-btn--go ws2-tut__go" onClick={onContinue} autoFocus>CONTINUE ▸</button>
        </footer>
      </section>
    </div>
  );
}

