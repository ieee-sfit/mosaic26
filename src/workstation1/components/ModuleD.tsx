import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { HANDSHAKE_ROUNDS as ROUNDS, SCORING } from '../mockStation1Data';
import { CHANNELS, DEMO_HOPS, describe, generatePattern, roundPoints, wrap } from '../utils/handshake';
import type { HandshakeResult } from '../types';
import HintDock from '../../core/HintDock';
import { HudPanel, TeleChip } from './HudPanel';

interface Props {
  seed: number;
  operator: string;
  /** Shift time left. Module D has no cap of its own: it ends when the shared clock reaches 0 (points already earned stay). */
  secondsLeft: number;
  /** Called once with every round's result, the bonus total and the ending. */
  onDone: (results: HandshakeResult[], total: number, ending: 'success' | 'fail') => void;
}

type Phase = 'intro' | 'demo' | 'play' | 'between' | 'end';
type HopMark = 'lock' | 'miss' | 'auto';

interface Game {
  round: number;
  phase: Phase;
  t: number; // hops that have happened this round
  sel: number;
  history: number[];
  marks: HopMark[];
  locks: number;
  misses: number;
  hint: 0 | 1 | 2;
  results: HandshakeResult[];
  flash: { kind: 'lock' | 'miss' | 'auto'; n: number } | null;
  /** When the latest scored hop landed, and whether it was a miss (drives the TOO LATE warning). */
  hopAt: number;
  lastMiss: boolean;
  late: number;
  lateShow: boolean;
  ending: 'success' | 'fail' | null;
}

const INTRO_MS = 1300;
const BETWEEN_MS = 1700;
const END_MS = 2000;
/** A click on the beacon's channel this soon after a missed hop is a click for a hop that already happened. */
const LATE_MS = 1500;
const cfg = SCORING.moduleD;
const NODE = (n: number) => {
  const a = ((n - 1) * 30 - 90) * (Math.PI / 180);
  return { x: 200 + 140 * Math.cos(a), y: 200 + 140 * Math.sin(a) };
};
/** Clockwise steps from one channel to the next, 1..12: the same number the hint and the tutorial use. */
const jump = (from: number, to: number) => ((((to - from) % CHANNELS) + CHANNELS - 1) % CHANNELS) + 1;
const secs = (ms: number) => (ms / 1000).toFixed(2).replace(/\.?0+$/, '');
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
/** Made-up radio labels so every channel has a frequency. */
const freqLabel = (n: number) => `${(402 + n * 2.5).toFixed(1)}`;

/** Module D · SECRET HANDSHAKE: the mothership's beacon hops between 12 channels by a secret rule. Answer on the right channel each hop. */
export function ModuleD({ seed, operator, secondsLeft, onDone }: Props) {
  const patterns = useMemo(() => ROUNDS.map((def, i) => generatePattern(def, i, seed)), [seed]);
  const g = useRef<Game>({
    round: 0,
    phase: 'intro',
    t: 0,
    sel: patterns[0].s[0],
    history: [patterns[0].s[0]],
    marks: [],
    locks: 0,
    misses: 0,
    hint: 0,
    results: [],
    flash: null,
    hopAt: 0,
    lastMiss: false,
    late: 0,
    lateShow: false,
    ending: null,
  });
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [tick, setTick] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const go = () => {
    bump();
    setTick((n) => n + 1);
  };

  /** Close the current round (also used for a round cut short by the clock). */
  const closeRound = () => {
    const s = g.current;
    const def = ROUNDS[s.round];
    s.results.push({
      round: s.round,
      variantId: patterns[s.round].variantId,
      locks: s.locks,
      misses: s.misses,
      scoredHops: def.scoredHops,
      hintsUsed: s.hint,
      points: roundPoints(def, s.locks, s.hint, cfg.hint1Penalty),
      maxPoints: def.points,
    });
  };

  const finishAll = () => {
    const s = g.current;
    if (doneRef.current) return;
    doneRef.current = true;
    const total = Math.round(s.results.reduce((n, r) => n + r.points, 0) * 100) / 100;
    s.ending = total >= cfg.successAt ? 'success' : 'fail';
    s.phase = 'end';
    go();
    window.setTimeout(() => onDoneRef.current(s.results, total, s.ending as 'success' | 'fail'), END_MS);
  };

  const hop = () => {
    const s = g.current;
    if (s.phase === 'end') return;
    const p = patterns[s.round];
    const def = ROUNDS[s.round];
    const nt = s.t + 1;
    const pos = p.s[nt];
    s.t = nt;
    s.history = [...s.history, pos];
    if (nt <= DEMO_HOPS) {
      s.phase = 'demo';
    } else {
      const auto = s.hint === 2;
      if (auto) s.sel = pos; // Hint 2 plays the round for the player
      const hit = s.sel === pos;
      s.marks = [...s.marks, hit ? (auto ? 'auto' : 'lock') : 'miss'];
      if (!hit) s.misses += 1;
      else if (!auto) s.locks += 1;
      s.flash = { kind: hit ? (auto ? 'auto' : 'lock') : 'miss', n: (s.flash?.n ?? 0) + 1 };
      s.hopAt = Date.now();
      s.lastMiss = !hit;
      s.phase = 'play';
      if (nt === DEMO_HOPS + def.scoredHops) {
        closeRound();
        s.phase = 'between';
      }
    }
    go();
  };

  // one scheduler: whatever phase we are in, plan the next transition
  useEffect(() => {
    const s = g.current;
    if (s.phase === 'end') return undefined;
    let id = 0;
    if (s.phase === 'intro') {
      id = window.setTimeout(() => {
        g.current.phase = 'demo';
        g.current.t = 0;
        go();
      }, INTRO_MS);
    } else if (s.phase === 'demo' || s.phase === 'play') {
      id = window.setTimeout(hop, ROUNDS[s.round].hopMs);
    } else if (s.phase === 'between') {
      id = window.setTimeout(() => {
        const cur = g.current;
        if (cur.round >= ROUNDS.length - 1) {
          finishAll();
          return;
        }
        const r = cur.round + 1;
        cur.round = r;
        cur.phase = 'intro';
        cur.t = 0;
        cur.sel = patterns[r].s[0];
        cur.history = [patterns[r].s[0]];
        cur.marks = [];
        cur.locks = 0;
        cur.misses = 0;
        cur.hint = 0;
        go();
      }, BETWEEN_MS);
    }
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // the shared shift clock is the only clock: when it reaches 0 the run ends here and points already earned stay
  const outOfTime = secondsLeft <= 0;
  useEffect(() => {
    if (!outOfTime || g.current.phase === 'end') return;
    // a round cut short by the clock still scores what was locked; a round already closed is not counted twice
    if (g.current.phase === 'demo' || g.current.phase === 'play' || g.current.phase === 'intro') closeRound();
    finishAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfTime]);

  /* ---- player input: click / tap a channel, or move with the keyboard ---- */
  const select = (ch: number) => {
    const s = g.current;
    if (s.phase === 'end') return;
    // chasing the beacon after a missed hop: that hop is over
    if (s.phase === 'play' && s.lastMiss && wrap(ch) === s.history[s.history.length - 1] && Date.now() - s.hopAt < LATE_MS) {
      s.late += 1;
      s.lateShow = true;
      window.setTimeout(() => {
        g.current.lateShow = false;
        bump();
      }, 1100);
    }
    s.sel = wrap(ch);
    bump();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const move = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? 3 : e.key === 'ArrowDown' ? -3 : 0;
      if (!move) return;
      e.preventDefault();
      select(g.current.sel + move);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const requestHint = (next: 1 | 2) => {
    const s = g.current;
    if (s.phase === 'intro' || s.phase === 'between' || s.phase === 'end' || s.hint >= next) return;
    s.hint = next;
    if (next === 2) s.sel = s.history[s.history.length - 1];
    bump();
  };

  const s = g.current;
  const def = ROUNDS[Math.min(s.round, ROUNDS.length - 1)];
  const pat = patterns[Math.min(s.round, ROUNDS.length - 1)];
  const beacon = s.history[s.history.length - 1];
  const live = roundPoints(def, s.locks, s.hint, cfg.hint1Penalty);
  const closed = s.results.some((r) => r.round === s.round);
  const total = Math.round((s.results.reduce((n, r) => n + r.points, 0) + (closed ? 0 : live)) * 100) / 100;
  const demoLeft = Math.max(0, DEMO_HOPS - s.t);
  const status =
    s.phase === 'intro' ? 'GET READY'
      : s.phase === 'demo' ? `WATCH · ${demoLeft} FREE HOP${demoLeft === 1 ? '' : 'S'} LEFT`
        : s.phase === 'play' ? 'PREDICT THE NEXT HOP'
          : s.phase === 'between' ? `ROUND ${s.round + 1} DONE · ${s.locks}/${def.scoredHops} LOCKED`
            : '';
  const hopKey = `${s.round}-${s.t}-${s.phase}`;
  /** The 4 free hops are drawn in purple everywhere: the beacon, the ring, the clue strip. */
  const freeNow = s.t <= DEMO_HOPS && s.phase !== 'between';
  const upFree = s.t < DEMO_HOPS;
  const lowTime = secondsLeft <= 30;
  const hintActive = s.phase === 'demo' || s.phase === 'play';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-[88px] items-center gap-4 border-b border-goat-cyan/20 bg-goat-void/70 py-2 pl-4 pr-[230px]">
        <div className="chamfer-tr flex items-center gap-3 self-stretch bg-goat-gold px-4 text-goat-void" style={{ ['--c' as string]: '12px' }}>
          <span className="font-hud text-xs font-bold tracking-[0.25em]">BONUS</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-hud text-lg font-bold uppercase leading-tight tracking-[0.14em] text-white">Secret Handshake</div>
          <div className="flex flex-wrap gap-x-4">
            <TeleChip label="STATION" value="01 · GOAT_ANC" />
            <TeleChip label="OP" value={operator} />
            <TeleChip label="SYS" value="MOTHERSHIP_LINK" tone="gold" />
          </div>
        </div>
        <div className="text-right font-tele">
          <div className="text-[9px] uppercase tracking-[0.2em] text-goat-mute">SHIFT CLOCK</div>
          <div className={`text-3xl font-extrabold tabular-nums ${lowTime ? 'goat-blink text-goat-crimson' : 'text-goat-gold'}`} role="timer" aria-label={`Shift time left ${mmss(secondsLeft)}`}>{mmss(secondsLeft)}</div>
        </div>
      </div>

      {s.flash && <div key={`${s.flash.kind}${s.flash.n}`} className={s.flash.kind === 'miss' ? 'hull-flash' : 'ok-flash'} />}

      <div className="grid flex-1 gap-3 p-3 pb-24 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <HudPanel title={`Handshake ${Math.min(s.round + 1, 3)}/3`} tag={status} tone="gold" cut="both" bodyClassName="flex flex-col items-center gap-2 p-3">
          {(s.phase === 'intro' || s.phase === 'demo' || s.phase === 'play') && (
            <div className={`hs-phase ${upFree || s.phase === 'intro' ? 'is-free' : 'is-live'}`} role="status">
              {upFree || s.phase === 'intro' ? `FREE HOPS · WATCH THE JUMPS (${demoLeft} LEFT)` : 'YOUR HOPS · PICK THE NEXT CHANNEL'}
            </div>
          )}
          <svg viewBox="0 0 400 400" className="hs-ring" role="group" aria-label="Twelve radio channels">
            <circle cx="200" cy="200" r="140" className="hs-orbit" />
            {Array.from({ length: CHANNELS }, (_, i) => i + 1).map((n) => {
              const { x, y } = NODE(n);
              const isBeacon = beacon === n;
              const isSel = s.sel === n;
              return (
                <g
                  key={n}
                  className={`hs-node ${isBeacon ? 'is-beacon' : ''} ${isBeacon && freeNow ? 'is-free' : ''} ${isSel ? 'is-sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Channel ${n}, ${freqLabel(n)} megahertz${isSel ? ', selected' : ''}${isBeacon ? ', beacon is here' : ''}`}
                  onClick={() => select(n)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(n);
                    }
                  }}
                >
                  <circle cx={x} cy={y} r="30" className="hs-hit" />
                  {isBeacon && <circle cx={x} cy={y} r="27" className={`hs-beacon ${freeNow ? 'is-free' : ''}`} />}
                  {isSel && <rect x={x - 25} y={y - 25} width="50" height="50" className="hs-sel" />}
                  <circle cx={x} cy={y} r="19" className="hs-disc" />
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className="hs-n">{n}</text>
                  <text x={x} y={y + 34} textAnchor="middle" className="hs-f">{freqLabel(n)}</text>
                </g>
              );
            })}
            {(s.phase === 'demo' || s.phase === 'play') && (
              <circle key={hopKey} cx="200" cy="200" r="92" className={`hs-countdown ${upFree ? 'is-free' : ''}`} style={{ animationDuration: `${def.hopMs}ms` }} />
            )}
            <text x="200" y="176" textAnchor="middle" className="hs-c1">BEACON</text>
            <text x="200" y="212" textAnchor="middle" className="hs-c2">CH {beacon}</text>
            <text x="200" y="236" textAnchor="middle" className="hs-c3">YOU: CH {s.sel}</text>
          </svg>

          {s.lateShow && (
            <div key={s.late} className="hs-late" role="status">
              TOO LATE<small>THE BEACON ALREADY JUMPED</small>
            </div>
          )}
          <div className="hs-bar" aria-hidden>
            {(s.phase === 'demo' || s.phase === 'play') && <i key={hopKey} className={upFree ? 'is-free' : ''} style={{ animationDuration: `${def.hopMs}ms` }} />}
          </div>

          <div className="hs-pad" role="group" aria-label="Move your channel">
            <button type="button" onClick={() => select(s.sel - 3)} aria-label="Down three channels">−3</button>
            <button type="button" onClick={() => select(s.sel - 1)} aria-label="Down one channel">◀ −1</button>
            <button type="button" onClick={() => select(s.sel + 1)} aria-label="Up one channel">+1 ▶</button>
            <button type="button" onClick={() => select(s.sel + 3)} aria-label="Up three channels">+3</button>
          </div>
        </HudPanel>

        <div className="flex flex-col gap-3">
          <HudPanel title="Hops" tag={`${s.locks}/${def.scoredHops} locked`} tone="cyan" bodyClassName="p-3">
            <div className="hs-hops" aria-label="Hop results">
              {Array.from({ length: DEMO_HOPS }, (_, i) => (
                <i key={`d${i}`} className={`is-demo ${i < Math.min(s.t, DEMO_HOPS) ? 'is-seen' : ''}`}>◆</i>
              ))}
              <span aria-hidden>|</span>
              {Array.from({ length: def.scoredHops }, (_, i) => {
                const m = s.marks[i];
                return <i key={i} className={m ? `is-${m}` : ''}>{m === 'lock' ? '●' : m === 'auto' ? '◐' : m === 'miss' ? '✕' : '○'}</i>;
              })}
            </div>
            <div className="hs-clue" aria-label="The clue: the four free jumps">
              <small>THE CLUE · THE 4 FREE JUMPS</small>
              <div>
                {Array.from({ length: DEMO_HOPS }, (_, i) => {
                  const seen = i < Math.min(s.t, DEMO_HOPS);
                  return (
                    <span key={i} className={seen ? 'is-seen' : ''}>
                      {seen ? (
                        <>
                          <b>+{jump(s.history[i], s.history[i + 1])}</b>
                          <i>{s.history[i]} → {s.history[i + 1]}</i>
                        </>
                      ) : (
                        <b>?</b>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="hs-trail" aria-label="Your hops">
              <small>YOUR HOPS · JUMP AND LANDING</small>
              <div>
                {s.history.slice(DEMO_HOPS + 1).map((c, i) => (
                  <span key={i} className={s.marks[i] ? `is-${s.marks[i]}` : ''}>
                    <b>+{jump(s.history[DEMO_HOPS + i], c)}</b>
                    <i>→ {c}</i>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <TeleChip label="ROUND" value={`${def.points} PTS · ${secs(def.hopMs)}s HOPS`} tone="gold" />
              <TeleChip label="HINT" value={s.hint === 0 ? 'NONE' : s.hint === 1 ? '-40%' : 'AUTO · 0 PTS'} tone={s.hint ? 'crimson' : 'mute'} />
            </div>
          </HudPanel>
          <HudPanel title="Bonus so far" tone="gold" bodyClassName="p-3">
            <div className="font-tele text-4xl font-extrabold tabular-nums text-white">
              {total.toFixed(total % 1 ? 1 : 0)}
              <span className="text-lg text-goat-mute"> / {cfg.maxPoints}</span>
            </div>
            <p className="mt-2 font-tele text-[11px] uppercase tracking-wider text-goat-mute">
              The 4 PURPLE hops are free: read the jumps. Then pick the channel BEFORE each GOLD hop. The ring and bar drain until the hop.
            </p>
          </HudPanel>
        </div>
      </div>

      {s.phase === 'end' && (
        <div className={`hs-end ${s.ending === 'success' ? 'is-ok' : 'is-bad'}`} role="status">
          <div>{s.ending === 'success' ? 'MOTHERSHIP LINK RESTORED' : 'LINK LOST'}</div>
          <small>{s.ending === 'success' ? 'FLEET REUNITED' : 'NO REPLY FROM THE MOTHERSHIP'}</small>
        </div>
      )}
      {s.phase === 'intro' && (
        <div className="hs-intro goat-rise" role="status">
          <small>HANDSHAKE {s.round + 1} OF 3</small>
          <b>WATCH THE BEACON</b>
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 lg:pr-[380px]">
          <span className="font-tele text-[11px] uppercase tracking-widest text-goat-mute">CLICK A CHANNEL · OR ← → (±1) ↑ ↓ (±3)</span>
        </div>
      </footer>
      {s.phase !== 'end' && (
        <HintDock
          level={s.hint}
          itemLabel={`HANDSHAKE ${s.round + 1}/3`}
          hint1Text={describe(pat.rule)}
          hint2Text="The round is playing itself. This round scores 0."
          cost1={cfg.hint1Penalty}
          disabled={!hintActive}
          onHint={requestHint}
        />
      )}
    </div>
  );
}
