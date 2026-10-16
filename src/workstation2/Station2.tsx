import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { speedBonus } from '../core/scoring';
import { gridPosition, lapSeconds, racePosition } from './race';
import { useSession } from '../session/sessionContext';
import { STATION2_CONFIG } from './mockStation2Data';
import { pickStints } from './logic';
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
import StoryScreen from './components/StoryScreen';
import TutorialScreen from './components/TutorialScreen';
import type { TutorialId } from './components/TutorialScreen';
import { BEATS, D_ENDING_LINE } from './story/story';
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

/**
 * Screens in play order: opening -> tutA -> launch (start lights; the clock starts at GO) -> play (A) -> story1 -> tutB -> play (B, then the
 * qualifying board) -> story2 -> tutC -> play (C, then the race board) -> offer -> (story3 -> tutD -> bonus) -> ending -> end (debrief).
 * The shift clock runs only in `play` (no board open) and `bonus`; every other screen has it paused.
 */
type Stage = 'opening' | 'tutA' | 'launch' | 'play' | 'story1' | 'tutB' | 'story2' | 'tutC' | 'board' | 'offer' | 'story3' | 'tutD' | 'bonus' | 'ending' | 'end';
const TUTORIAL_OF: Partial<Record<Stage, TutorialId>> = { tutA: 'A', tutB: 'B', tutC: 'C', tutD: 'D' };
const round2 = (n: number) => Math.round(n * 100) / 100;

type Diag = Report['diag'];
const blankDiag = (): Diag => Object.fromEntries(ALL_MODULES.map((m) => [m, { seconds: 0, wrong: 0, hints: 0, flags: [] as string[] }]));

export default function Station2({ onOpenStationChooser, onComplete }: Props) {
  const session = useSession();
  const ids: [string, string] | null =
    session && ID_RE.test(session.p1_id) && ID_RE.test(session.p2_id) ? [session.p1_id, session.p2_id] : null;

  const [stage, setStage] = useState<Stage>('opening');
  const [mod, setMod] = useState<ModuleId>('A');
  const [score, setScore] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [timeLeft, setTimeLeft] = useState(STATION2_CONFIG.totalSeconds);
  const [flash, setFlash] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [grid, setGrid] = useState<number | null>(null);
  /** True from the moment the last Module C lap is banked: the clock stops there, so the speed bonus is frozen at that instant. */
  const [cCleared, setCCleared] = useState(false);
  /** Fixes this run's lap variants (Module C): a repeat attempt remounts the station and draws a new seed. */
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const stints = useMemo(() => pickStints(seed), [seed]);

  const endAt = useRef(0);
  const pausedAt = useRef(0);
  const clearedLeft = useRef<number | null>(null);
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

  // stable score setters: the modules call them from effects, so they must not change identity on every render
  const setA = useCallback((a: number) => setScore((s) => ({ ...s, a })), []);
  const setB = useCallback((b: number) => setScore((s) => ({ ...s, b })), []);
  const setC = useCallback((c: number) => setScore((s) => ({ ...s, c })), []);
  const setD = useCallback((d: number) => setScore((s) => ({ ...s, d })), []);

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

  /**
   * The shift clock is a timestamp (`endAt`). Anything that is not a module being played freezes it: boards, story screens, tutorials
   * and the bonus offer all call `pauseClock`, and the time spent there is handed back by `resumeClock` when the next module starts.
   */
  const pauseClock = () => { if (!pausedAt.current) pausedAt.current = Date.now(); };
  const resumeClock = () => {
    if (!pausedAt.current) return;
    const gap = Date.now() - pausedAt.current;
    endAt.current += gap;
    modStart.current += gap;
    pausedAt.current = 0;
  };
  const openBoard = (data: BoardData) => { pauseClock(); setBoard(data); };
  /** Leaves a module for a story screen: its time is booked, the clock stays frozen until the next module starts. */
  const leaveModule = (to: Stage) => { closeModule(); pauseClock(); setStage(to); };
  /** Tutorial CONTINUE: the next module starts and the clock runs again. */
  const startModule = (m: ModuleId) => {
    resumeClock();
    modRef.current = m;
    modStart.current = Date.now();
    setMod(m);
    setStage('play');
  };

  const routesDone = (r: RouteSummary) => {
    closeModule();
    const g = gridPosition(r.qualifying.sec);
    setGrid(g);
    openBoard({ kind: 'quali', best: r.qualifying.sec, total: null, grid: g, points: r.practice.pts + r.qualifying.pts, pointsMax: STATION2_CONFIG.moduleMax.B, practice: r.practice.sec });
  };
  const qualiContinue = () => { setBoard(null); setStage('story2'); }; // the clock stays paused through the story and tutorial
  /**
   * The race board's CONTINUE leads to the Module D offer, but only after a completed C with at least `offerMinSeconds` of shift time
   * left. Otherwise the run goes straight to the ending. The run is only handed to the host once, by `commit`, so a played D can still
   * raise the score before it is saved.
   */
  const raceContinue = () => {
    if (stage !== 'board') return;
    const f = frozen.current;
    if (f && f.outcome === 'complete' && f.left >= STATION2_CONFIG.offerMinSeconds) setStage('offer');
    else { commit(0); setStage('ending'); }
  };
  const playD = () => { if (stage === 'offer') setStage('story3'); };
  /** Tutorial D CONTINUE: the shift clock picks up where Module C left it and keeps running until it reaches 0. */
  const startD = () => {
    const f = frozen.current;
    if (!f) return;
    endAt.current = Date.now() + f.left * 1000;
    pausedAt.current = 0;
    setDDeadline(endAt.current);
    setTimeLeft(f.left);
    modRef.current = 'D';
    modStart.current = Date.now();
    setMod('D');
    setStage('bonus');
  };
  const skipD = () => {
    if (stage !== 'offer') return;
    commit(0);
    setStage('ending');
  };
  const doneD = (d: number) => {
    if (stage !== 'bonus') return;
    closeModule();
    commit(d, true);
    setStage('ending');
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
      grid: f.grid, finish: f.finish, timeLeft: f.left,
    });
    try { onComplete?.(summary); } catch { /* host callback must not break the end screen */ }
    try { window.dispatchEvent(new CustomEvent('mosaic:station-complete', { detail: summary })); } catch { /* ignore */ }
  }, [onComplete]);

  /**
   * Module C is over, or the shift clock hit 0 in A, B or C. Freezes the base score, speed bonus and time_left.
   * A completed C shows the race board and then the D offer; a timeout is saved at once and goes straight to the FAIL ending.
   */
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
    pausedAt.current = 0;
    if (outcome === 'complete') {
      setBoard({ kind: 'race', best, total, grid: live.current.grid, points: s.c, pointsMax: STATION2_CONFIG.moduleMax.C });
      setStage('board');
    } else {
      setBoard(null);
      commit(0);
      setStage('ending');
    }
  }, [closeModule, commit]);

  // timestamp-driven 12:00 countdown (cannot drift). It runs ONLY while Module A, B or C is on screen and Module C is not yet cleared.
  useEffect(() => {
    if (stage !== 'play' || board || cCleared) return undefined;
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) finish('timeout', 0);
    }, 250);
    return () => window.clearInterval(t);
  }, [stage, board, cCleared, finish]);

  // the shift clock keeps running during D (D ends itself when it reaches 0); the offer auto-skips so an idle kiosk still saves
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

  /** GO on the start lights: the shift clock starts here, and Module A begins. */
  const go = useCallback(() => {
    endAt.current = Date.now() + STATION2_CONFIG.totalSeconds * 1000;
    pausedAt.current = 0;
    stats.current = blankDiag();
    lapPts.current = [];
    frozen.current = null;
    committed.current = false;
    clearedLeft.current = null;
    modRef.current = 'A';
    modStart.current = Date.now();
    setTimeLeft(STATION2_CONFIG.totalSeconds);
    setMod('A');
    setStage('play');
  }, []);

  // Replays always go back through the launcher so the attempt cap is checked and counted.
  const restart = () => { onOpenStationChooser?.(); };

  const playing = stage === 'play';
  const tutorial = TUTORIAL_OF[stage];
  const clockRunning = (playing && !board && !cCleared) || stage === 'bonus';
  const lowTime = clockRunning && timeLeft <= 120;
  const alarm = lowTime;
  const showHeader = playing || stage === 'board' || stage === 'offer' || stage === 'bonus' || !!tutorial;
  const withD = stage === 'offer' || stage === 'bonus' || tutorial === 'D';
  const navMod: ModuleId = tutorial ?? mod;
  const cur = stage === 'offer' ? null : navMod;
  const idx = stage === 'offer' ? MODULES.length : MODULES.indexOf(navMod) === -1 ? MODULES.length : MODULES.indexOf(navMod);
  const endBeat = report && report.outcome === 'complete' ? BEATS.success : BEATS.fail;
  const endExtra = report && report.outcome === 'complete' && report.dPlayed
    ? [report.d >= STATION2_CONFIG.moduleMax.D / 2 ? D_ENDING_LINE.decoded : D_ENDING_LINE.lost]
    : undefined;

  return (
    <div className={`ws2-shell ${alarm ? 'is-alarm' : ''} ${flash ? 'fx-flash' : ''}`}>
      <PitWallBackdrop />
      <div className="ws2-shell__flash" aria-hidden />
      <div className="ws2-hazard" aria-hidden />
      <div className="ws2-alarmframe" aria-hidden />

      {showHeader && (
        <header className="ws2-header">
          <div className="ws2-brand">
            <b>F1 0-LAG STREAM</b>
            <span>ST-02 · {ids?.[0]} + {ids?.[1]}</span>
          </div>
          <nav className="ws2-modnav" aria-label="Module progress">
            {(withD ? ALL_MODULES : MODULES).map((m, i) => (
              <span key={m} className={`${m === cur ? 'on' : ''} ${idx > i ? 'done' : ''}`}>
                <i>{idx > i ? '■' : m === navMod ? '▶' : '□'}</i> {m} {NAMES[m]}
              </span>
            ))}
          </nav>
          <div className="ws2-alarmchip" role={lowTime ? 'alert' : undefined}>
            {lowTime && <span><i aria-hidden>▲</i> LOW TIME</span>}
            {!clockRunning && <span className="ws2-pausechip" data-paused><i aria-hidden>❚❚</i> CLOCK PAUSED</span>}
          </div>
          <div className="ws2-hscore"><small>SCORE</small><b>{Math.round((score.a + score.b + score.c + score.d) * 10) / 10}</b></div>
          <Stopwatch seconds={timeLeft} total={STATION2_CONFIG.totalSeconds} running={clockRunning} alarm={lowTime} />
        </header>
      )}

      <main className="ws2-main" ref={stage$}>
        {stage === 'opening' && <StoryScreen key="opening" beat={BEATS.opening} onContinue={() => setStage('tutA')} />}
        {tutorial && (
          <TutorialScreen
            key={stage} module={tutorial}
            onContinue={() => {
              if (tutorial === 'A') setStage('launch'); // the clock has not started yet: GO on the start lights starts it
              else if (tutorial === 'D') startD();
              else startModule(tutorial);
            }}
          />
        )}
        {stage === 'launch' && <LaunchScreen ids={ids} onGo={go} onBack={onOpenStationChooser} />}
        {playing && board && board.kind === 'quali' && <BoardScreen data={board} onContinue={qualiContinue} />}
        {playing && !board && mod === 'A' && (
          <ModuleA track={track} onShake={shake} onScore={setA} onDone={() => leaveModule('story1')} />
        )}
        {playing && !board && mod === 'B' && (
          <ModuleB track={track} onShake={shake} onScore={setB} onDone={routesDone} />
        )}
        {playing && !board && mod === 'C' && (
          <ModuleC
            stints={stints} grid={grid}
            onLap={(p) => { lapPts.current.push(p); }}
            track={track} onShake={shake} onFlash={flashRed}
            onScore={setC}
            onCleared={() => { clearedLeft.current = secondsLeft(); setCCleared(true); }}
            onFinish={() => finish('complete', clearedLeft.current ?? secondsLeft())}
          />
        )}
        {stage === 'story1' && <StoryScreen key="story1" beat={BEATS.story1} onContinue={() => setStage('tutB')} />}
        {stage === 'story2' && <StoryScreen key="story2" beat={BEATS.story2} onContinue={() => setStage('tutC')} />}
        {stage === 'story3' && <StoryScreen key="story3" beat={BEATS.story3} onContinue={() => setStage('tutD')} />}
        {stage === 'board' && board && <BoardScreen data={board} onContinue={raceContinue} />}
        {stage === 'offer' && (
          <div className="ws2-offer ws2-in" role="dialog" aria-label="Final push bonus offer">
            <small>BONUS ROUND · OPTIONAL</small>
            <h2>FINAL PUSH · BONUS</h2>
            <p>UP TO <b>+{STATION2_CONFIG.moduleMax.D}</b> · {timeLeft} S OF SHIFT LEFT</p>
            <p className="ws2-offer__note">SPEED BONUS ALREADY LOCKED IN · CLOCK PAUSED</p>
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
            onScore={setD}
            onDone={doneD}
          />
        )}
        {stage === 'ending' && report && <StoryScreen key="ending" beat={endBeat} extra={endExtra} onContinue={() => setStage('end')} />}
        {stage === 'end' && report && <EndScreen report={report} onRestart={restart} />}
      </main>
    </div>
  );
}
