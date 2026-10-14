import { useCallback, useEffect, useRef, useState } from 'react';
import { speedBonus } from '../core/scoring';
import { gridPosition, lapSeconds, racePosition } from './race';
import { useSession } from '../session/sessionContext';
import { STATION2_CONFIG } from './mockStation2Data';
import PitWallBackdrop from './components/PitWallBackdrop';
import Stopwatch from './components/Stopwatch';
import LaunchScreen from './components/LaunchScreen';
import EndScreen from './components/EndScreen';
import type { Outcome, Report } from './components/EndScreen';
import ModuleA from './components/ModuleA';
import ModuleB from './components/ModuleB';
import type { RouteSummary } from './components/ModuleB';
import BoardScreen from './components/BoardScreen';
import type { BoardData } from './components/BoardScreen';
import ModuleC from './components/ModuleC';
import ModuleD from './components/ModuleD';
import { RADIO_CONFIG } from './mockStation2Data';
import './station2.css';

export interface Station2Summary {
  p1_id: string;
  p2_id: string;
  game_id: 'station2';
  raw_score: number;
  time_left: number;
}

interface Props {
  onNavigateStation?: (n: number) => void;
  onOpenStationChooser?: () => void;
  onComplete?: (summary: Station2Summary) => void;
}

type ModuleId = 'A' | 'B' | 'C' | 'D';
export type Track = (m: ModuleId, kind: 'wrong' | 'hint', label?: string) => void;

const MODULES: ModuleId[] = ['A', 'B', 'C']; // the three scored modules; D is an optional bonus after them
const ALL_MODULES: ModuleId[] = [...MODULES, 'D'];
const NAMES: Record<ModuleId, string> = { A: 'TELEMETRY', B: 'ROUTES', C: 'RACE', D: 'FINAL PUSH' };
const ID_RE = /^\d{6}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

type Diag = Report['diag'];
const blankDiag = (): Diag => Object.fromEntries(ALL_MODULES.map((m) => [m, { seconds: 0, wrong: 0, hints: 0, flags: [] as string[] }]));

export default function Station2({ onOpenStationChooser, onComplete }: Props) {
  const session = useSession();
  const ids: [string, string] | null =
    session && ID_RE.test(session.p1_id) && ID_RE.test(session.p2_id) ? [session.p1_id, session.p2_id] : null;

  const [stage, setStage] = useState<'launch' | 'play' | 'board' | 'offer' | 'bonus' | 'end'>('launch');
  const [mod, setMod] = useState<ModuleId>('A');
  const [score, setScore] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [gaskets, setGaskets] = useState(STATION2_CONFIG.gasketPips);
  const [timeLeft, setTimeLeft] = useState(STATION2_CONFIG.totalSeconds);
  const [flash, setFlash] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [grid, setGrid] = useState<number | null>(null);

  const endAt = useRef(0);
  const pausedAt = useRef(0);
  const lapPts = useRef<number[]>([]);
  const finished = useRef(false);
  const committed = useRef(false);
  /** Everything fixed at the moment Module C ends: the speed bonus and time_left do not change while D is played. */
  const frozen = useRef<{ outcome: Outcome; a: number; b: number; c: number; base: number; bonus: number; left: number; grid: number | null; finish: number | null } | null>(null);
  const [dDeadline, setDDeadline] = useState(0);
  const live = useRef({ score, ids, grid: null as number | null });
  const stats = useRef<Diag>(blankDiag());
  const modStart = useRef(0);
  const modRef = useRef<ModuleId>('A');
  const stage$ = useRef<HTMLDivElement | null>(null);
  useEffect(() => { live.current = { score, ids, grid }; modRef.current = mod; });
  const skipRef = useRef<() => void>(() => undefined);
  useEffect(() => { skipRef.current = skipD; });

  const secondsLeft = () => Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));

  const track = useCallback<Track>((m, kind, label) => {
    const s = stats.current[m];
    if (kind === 'hint') s.hints += 1; else s.wrong += 1;
    if (label && s.flags.length < 6) s.flags.push(label);
  }, []);
  const closeModule = useCallback(() => {
    stats.current[modRef.current].seconds += Math.round((Date.now() - modStart.current) / 1000);
    modStart.current = Date.now();
  }, []);
  const goMod = (next: ModuleId) => { closeModule(); setMod(next); };

  /**
   * Screen shake via the Web Animations API (no remounts, so focus and drags survive). It moves the module content
   * but never the hint dock: a transformed ancestor would pull the fixed dock off the viewport corner.
   */
  const shake = useCallback(() => {
    const el = stage$.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const px = reduced ? 1.5 : 7;
    const frames = [0, 1, 2, 3, 4, 5].map((i) => ({ transform: `translate(${(i % 2 ? -1 : 1) * px * (1 - i / 6)}px, ${(i % 3 ? 1 : -1) * px * 0.5 * (1 - i / 6)}px)` }));
    el.querySelectorAll(':scope > * > :not([data-hint-dock])').forEach((n) => {
      if (typeof n.animate === 'function') n.animate(frames, { duration: 360, easing: 'linear' });
    });
  }, []);
  const flashRed = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 700);
  }, []);

  /** A board freezes the shift clock: the time spent reading it is handed back when it closes. */
  const openBoard = (data: BoardData) => { pausedAt.current = Date.now(); setBoard(data); };
  const closeBoard = () => {
    if (pausedAt.current) {
      const gap = Date.now() - pausedAt.current;
      endAt.current += gap;
      modStart.current += gap;
      pausedAt.current = 0;
    }
    setBoard(null);
  };

  const routesDone = (r: RouteSummary) => {
    const g = gridPosition(r.qualifying.sec);
    setGrid(g);
    openBoard({ kind: 'quali', best: r.qualifying.sec, total: null, grid: g, points: r.practice.pts + r.qualifying.pts, pointsMax: STATION2_CONFIG.moduleMax.B, practice: r.practice.sec });
  };
  const qualiContinue = () => { closeBoard(); goMod('C'); };
  /**
   * The race board's CONTINUE leads to the Module D offer, but only after a completed C with shift time left. Everything
   * else (timeout, forfeit, no time left) goes straight to the end screen exactly as before. The run is only handed to the
   * host once, by `commit`, so a played D can still raise the score before it is saved.
   */
  const raceContinue = () => {
    if (stage !== 'board') return;
    const f = frozen.current;
    if (f && f.outcome === 'complete' && f.left > 0) setStage('offer');
    else { commit(0); setStage('end'); }
  };
  const playD = () => {
    const f = frozen.current;
    if (!f || stage !== 'offer') return;
    // the shift clock picks up where Module C left it (board and offer time are not charged) and keeps running during D
    endAt.current = Date.now() + f.left * 1000;
    setDDeadline(Math.min(endAt.current, Date.now() + Math.min(RADIO_CONFIG.maxSeconds, f.left) * 1000));
    setTimeLeft(f.left);
    modRef.current = 'D';
    modStart.current = Date.now();
    setMod('D');
    setStage('bonus');
  };
  const skipD = () => {
    if (stage !== 'offer') return;
    commit(0);
    setStage('end');
  };
  const doneD = (d: number) => {
    if (stage !== 'bonus') return;
    closeModule();
    commit(d, true);
    setStage('end');
  };

  /**
   * Hands the finished run to the host, once. raw = base (A+B+C) + speed bonus (frozen when C ended) + D.
   * time_left is the value at C's end, so playing or skipping D never changes a tie-break.
   */
  const commit = useCallback((d: number, dPlayed = false) => {
    const f = frozen.current;
    if (!f || committed.current) return;
    committed.current = true;
    const { ids: i } = live.current;
    const raw = round2(f.base + f.bonus + d);
    const summary: Station2Summary = { p1_id: i?.[0] ?? '', p2_id: i?.[1] ?? '', game_id: 'station2', raw_score: raw, time_left: f.left };
    setScore((x) => ({ ...x, d }));
    setReport({
      outcome: f.outcome, a: f.a, b: f.b, c: f.c, d, dPlayed, bonus: f.bonus, raw, diag: JSON.parse(JSON.stringify(stats.current)),
      grid: f.grid, finish: f.finish,
    });
    try { onComplete?.(summary); } catch { /* host callback must not break the end screen */ }
    try { window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary })); } catch { /* ignore */ }
  }, [onComplete]);

  /** Module C is over (or the shift ended): freeze the base score, speed bonus and time_left, then show the board. */
  const finish = useCallback((outcome: Outcome, left: number) => {
    if (finished.current) return;
    finished.current = true;
    closeModule();
    const { score: s } = live.current;
    const base = s.a + s.b + s.c;
    const bonus = speedBonus(left, outcome === 'complete', base);
    const laps = lapPts.current.map((p) => lapSeconds(p / (STATION2_CONFIG.moduleMax.C / 3)));
    const best = laps.length ? Math.min(...laps) : null;
    const total = outcome === 'complete' ? laps.reduce((n, x) => n + x, 0) : null;
    frozen.current = {
      outcome, a: s.a, b: s.b, c: s.c, base, bonus, left, grid: live.current.grid, finish: total !== null ? racePosition(total) : null,
    };
    setTimeLeft(left);
    setBoard(outcome === 'complete'
      ? { kind: 'race', best, total, grid: live.current.grid, points: s.c, pointsMax: STATION2_CONFIG.moduleMax.C }
      : { kind: 'dnf', best, total: null, grid: live.current.grid, points: s.c, pointsMax: STATION2_CONFIG.moduleMax.C, partial: base });
    pausedAt.current = 0;
    setStage('board');
    // a run that cannot be followed by D is complete now; a completed C waits for the offer so D can still add to it
    if (outcome !== 'complete' || left <= 0) commit(0);
  }, [closeModule, commit]);

  // timestamp-driven 12:00 countdown (cannot drift)
  useEffect(() => {
    if (stage !== 'play' || board) return undefined;
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) finish('timeout', 0);
    }, 250);
    return () => window.clearInterval(t);
  }, [stage, board, finish]);

  // the shift clock keeps running during D (D ends itself at its own deadline); the offer auto-skips so an idle kiosk still saves
  useEffect(() => {
    if (stage !== 'bonus') return undefined;
    const t = window.setInterval(() => setTimeLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))), 250);
    return () => window.clearInterval(t);
  }, [stage]);
  useEffect(() => {
    if (stage !== 'offer') return undefined;
    const t = window.setTimeout(() => skipRef.current(), RADIO_CONFIG.offerSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [stage]);

  const go = useCallback(() => {
    endAt.current = Date.now() + STATION2_CONFIG.totalSeconds * 1000;
    stats.current = blankDiag();
    lapPts.current = [];
    frozen.current = null;
    committed.current = false;
    modStart.current = Date.now();
    setTimeLeft(STATION2_CONFIG.totalSeconds);
    setStage('play');
  }, []);

  // Replays always go back through the launcher so the attempt cap is checked and counted.
  const restart = () => { onOpenStationChooser?.(); };

  const playing = stage === 'play';
  const inRun = playing || stage === 'offer' || stage === 'bonus';
  const lowTime = (playing || stage === 'bonus') && timeLeft <= 120;
  const lastGasket = playing && mod === 'C' && gaskets <= 1;
  const alarm = lowTime || lastGasket;
  const withD = stage === 'offer' || stage === 'bonus';
  const cur = stage === 'offer' ? null : mod;
  const idx = withD ? MODULES.length : MODULES.indexOf(mod);

  return (
    <div className={`ws2-shell ${alarm ? 'is-alarm' : ''} ${flash ? 'fx-flash' : ''}`}>
      <PitWallBackdrop />
      <div className="ws2-shell__flash" aria-hidden />
      <div className="ws2-hazard" aria-hidden />
      <div className="ws2-alarmframe" aria-hidden />

      {inRun && (
        <header className="ws2-header">
          <div className="ws2-brand">
            <b>F1 0-LAG STREAM</b>
            <span>ST-02 · {ids?.[0]} + {ids?.[1]}</span>
          </div>
          <nav className="ws2-modnav" aria-label="Module progress">
            {(withD ? ALL_MODULES : MODULES).map((m, i) => (
              <span key={m} className={`${m === cur ? 'on' : ''} ${idx > i ? 'done' : ''}`}>
                <i>{idx > i ? '■' : m === mod ? '▶' : '□'}</i> {m} {NAMES[m]}
              </span>
            ))}
          </nav>
          <div className="ws2-alarmchip" role={alarm ? 'alert' : undefined}>
            {alarm && <span><i aria-hidden>▲</i> {lowTime && lastGasket ? 'LOW TIME · LAST GASKET' : lowTime ? 'LOW TIME' : 'LAST GASKET'}</span>}
          </div>
          <div className="ws2-hscore"><small>SCORE</small><b>{Math.round((score.a + score.b + score.c + score.d) * 10) / 10}</b></div>
          <Stopwatch seconds={timeLeft} total={STATION2_CONFIG.totalSeconds} running alarm={lowTime} />
        </header>
      )}

      <main className="ws2-main" ref={stage$}>
        {stage === 'launch' && <LaunchScreen ids={ids} onGo={go} onBack={onOpenStationChooser} />}
        {playing && board && board.kind === 'quali' && <BoardScreen data={board} onContinue={qualiContinue} />}
        {playing && !board && mod === 'A' && (
          <ModuleA track={track} onShake={shake} onScore={(a) => setScore((s) => ({ ...s, a }))} onDone={() => goMod('B')} />
        )}
        {playing && !board && mod === 'B' && (
          <ModuleB track={track} onShake={shake} onScore={(b) => setScore((s) => ({ ...s, b }))} onDone={routesDone} />
        )}
        {playing && !board && mod === 'C' && (
          <ModuleC
            grid={grid}
            onLap={(p) => { lapPts.current.push(p); }}
            track={track} onShake={shake} onFlash={flashRed} onGaskets={setGaskets}
            onScore={(c) => setScore((s) => ({ ...s, c }))}
            onFinish={() => finish('complete', secondsLeft())}
            onForfeit={() => finish('forfeit', secondsLeft())}
          />
        )}
        {stage === 'board' && board && <BoardScreen data={board} onContinue={raceContinue} />}
        {stage === 'offer' && (
          <div className="ws2-offer ws2-in" role="dialog" aria-label="Final push bonus offer">
            <small>BONUS ROUND</small>
            <h2>FINAL PUSH · BONUS</h2>
            <p>UP TO <b>+{STATION2_CONFIG.moduleMax.D}</b> · {Math.min(RADIO_CONFIG.maxSeconds, timeLeft)} S</p>
            <div className="ws2-offer__actions">
              <button type="button" className="ws2-btn ws2-btn--go" onClick={playD} autoFocus>PLAY</button>
              <button type="button" className="ws2-btn ws2-btn--ghost" onClick={skipD}>SKIP</button>
            </div>
            <span className="ws2-D__auto" aria-hidden><i style={{ ['--offer-s' as string]: `${RADIO_CONFIG.offerSeconds}s` }} /></span>
          </div>
        )}
        {stage === 'bonus' && (
          <ModuleD
            deadline={dDeadline}
            track={track} onShake={shake}
            onScore={(d) => setScore((s) => ({ ...s, d }))}
            onDone={doneD}
          />
        )}
        {stage === 'end' && report && <EndScreen report={report} onRestart={restart} />}
      </main>
    </div>
  );
}
