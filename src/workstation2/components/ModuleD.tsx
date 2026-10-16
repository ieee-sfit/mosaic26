import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RADIO_CODEBOOK, RADIO_CONFIG, STATION2_CONFIG } from '../mockStation2Data';
import { generateStream, stageSeed } from '../../core/radiolink/generate';
import { stageScore } from '../../core/radiolink/scoring';
import { RESEND_ANSWER } from '../../core/radiolink/types';
import type { RadioStream as Stream } from '../../core/radiolink/types';
import RadioStream from '../../core/radiolink/RadioStream';
import type { AnswerResult } from '../../core/radiolink/RadioStream';
import Codebook from '../../core/radiolink/Codebook';
import HintDock from '../../core/HintDock';
import type { HintLevel } from '../../core/HintDock';
import { fmt, mmss } from '../logic';
import Panel from './Panel';
import RaceCar from './RaceCar';
import type { Lane } from './RaceCar';
import type { Track } from '../Station2';

interface Props {
  /** Epoch ms at which the shift clock reaches 0. Module D has no cap of its own: it uses whatever shift time is left. */
  deadline: number;
  onScore: (total: number) => void;
  /** Called once, with the points earned so far, when the three stages end or the shift clock reaches 0. */
  onDone: (total: number) => void;
  onShake: () => void;
  track: Track;
}

const STAGES = RADIO_CONFIG.stages;
const STAGE_NAMES = ['COUNT THE RUN', 'NOISE', 'FULL CODEBOOK'];
const STAGE_LINES = ['Count the run. The line stops for you.', 'Noise can flip bits.', 'All six commands.'];
const RULE = 'ANY OTHER RUN = CORRUPTED · PRESS 7 RESEND';
const AUTO_CARD_MS = 6000;

/** Module D: the F1 skin on the shared RADIO LINK engine. Labels, car feedback and subtitle live here; the stream logic is in core/radiolink. */
export default function ModuleD({ deadline, onScore, onDone, onShake, track }: Props) {
  const [seed] = useState(() => (Math.random() * 4294967296) >>> 0);
  const [streams] = useState<Stream[]>(() => STAGES.map((spec, i) => generateStream(stageSeed(seed, i), spec, RADIO_CODEBOOK, RADIO_CONFIG.gen)));

  const [n, setN] = useState(0); // stage being played, or about to be (3 = all done)
  const [running, setRunning] = useState(false);
  const [hints, setHints] = useState<HintLevel[]>([0, 0, 0]);
  const [correct, setCorrect] = useState<number[]>([0, 0, 0]);
  const [secLeft, setSecLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [car, setCar] = useState({ drsOpen: false, lane: 'mid' as Lane, braking: false, lifting: false, wrong: false });
  const carTimer = useRef<number | null>(null);
  const done = useRef(false);

  const total = useMemo(() => STAGES.reduce((sum, spec, i) => sum + stageScore(spec, correct[i], hints[i], RADIO_CONFIG.hint1Cost), 0), [correct, hints]);
  const totalRef = useRef(total);
  const live = useRef({ onScore, onDone });
  useEffect(() => { totalRef.current = total; live.current = { onScore, onDone }; });
  useEffect(() => { onScore(Math.round(total * 100) / 100); }, [total, onScore]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    live.current.onDone(Math.round(totalRef.current * 100) / 100);
  }, []);

  // the round ends when the shift clock reaches 0: timestamp-driven, points already earned stay
  useEffect(() => {
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecLeft(left);
      if (Date.now() >= deadline) finish();
    }, 200);
    return () => window.clearInterval(t);
  }, [deadline, finish]);
  useEffect(() => () => { if (carTimer.current) window.clearTimeout(carTimer.current); }, []);

  const si = Math.min(n, STAGES.length - 1);
  const spec = STAGES[si];
  const level = hints[si];
  const allDone = n >= STAGES.length;

  const onAnswer = useCallback((r: AnswerResult) => {
    if (r.correct) setCorrect((c) => c.map((x, i) => (i === si ? x + 1 : x)));
    else { track('D', 'wrong', `S${si + 1} C${r.index + 1}${r.missed ? ' MISSED' : ''}`); onShake(); }
    if (r.chosen === null) return;
    const e = r.chosen === RESEND_ANSWER ? null : RADIO_CODEBOOK[r.chosen];
    setCar((c) => ({
      drsOpen: e?.id === 'drs-on' ? true : e?.id === 'drs-off' ? false : c.drsOpen,
      lane: e?.id === 'ot-in' ? 'in' : e?.id === 'ot-out' ? 'out' : c.lane,
      braking: e?.id === 'brake', lifting: e?.id === 'lift', wrong: !r.correct,
    }));
    if (carTimer.current) window.clearTimeout(carTimer.current);
    carTimer.current = window.setTimeout(() => setCar((c) => ({ ...c, braking: false, lifting: false })), 900);
  }, [si, track, onShake]);

  const endStage = useCallback(() => { setRunning(false); setN((x) => x + 1); }, []);

  const hint = (next: 1 | 2) => {
    if (!running || level >= next) return;
    track('D', 'hint', `S${si + 1} H${next}`);
    setHints((h) => h.map((x, i) => (i === si ? next : x)) as HintLevel[]);
    if (next === 2) endStage();
  };

  // between-stage card: GO / FINISH on click, Enter or Space, or by itself after a few seconds
  const goRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    goRef.current = () => { if (allDone) finish(); else setRunning(true); };
  });
  const carding = !running;
  useEffect(() => {
    if (!carding) return undefined;
    const t = window.setTimeout(() => goRef.current(), AUTO_CARD_MS);
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goRef.current(); } };
    window.addEventListener('keydown', key);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', key); };
  }, [carding, n]);

  const shown = STAGES[Math.min(n, STAGES.length - 1)];
  const prev = n > 0 ? n - 1 : null;
  const prevPts = prev !== null ? stageScore(STAGES[prev], correct[prev], hints[prev], RADIO_CONFIG.hint1Cost) : 0;

  return (
    <section className="ws2-modD ws2-in" aria-label="Module D final push">
      <div className="ws2-modhead">
        <b>MODULE D</b><span>FINAL PUSH · RADIO LINK</span>
        <em className={secLeft <= 20 ? 'is-low' : ''} role="timer" aria-label="Final push time left">{mmss(secLeft)}</em>
        <em>{fmt(total, 1)} / {STATION2_CONFIG.moduleMax.D}</em>
      </div>

      <div className="ws2-D__top">
        <Panel title="CODEBOOK" tag={`STAGE ${si + 1}/${STAGES.length}`}>
          <div className="ws2-D__book">
            <Codebook entries={RADIO_CODEBOOK.slice(0, shown.active)} rule={shown.resend ? RULE : undefined} />
          </div>
        </Panel>
        <Panel title="CAR" tone="steel">
          <div className="ws2-D__car"><RaceCar {...car} /></div>
        </Panel>
      </div>

      <Panel title="ENGINEER ▸ CAR" tag={`${Number((spec.bps * (level === 1 ? RADIO_CONFIG.hint1SpeedFactor : 1)).toFixed(1))} BITS/S`} className="ws2-D__line">
        <div className="ws2-D__stage">
          <RadioStream
            key={si} stream={streams[si]} spec={spec} codebook={RADIO_CODEBOOK} pointerLabel="CAR RX"
            speedScale={level === 1 ? RADIO_CONFIG.hint1SpeedFactor : 1} paused={carding}
            onAnswer={onAnswer} onEnd={endStage}
          />
          {carding && (
            <div className="ws2-D__card" role="dialog" aria-label="Stage card">
              {prev !== null && (
                <p className="ws2-D__res">
                  STAGE {prev + 1} · {hints[prev] >= 2 ? 'DECODED FOR YOU' : `${correct[prev]}/${STAGES[prev].commands}`} · <b>+{fmt(prevPts, 1)}</b>
                </p>
              )}
              {allDone ? (
                <h3>RADIO CLOSED</h3>
              ) : (
                <>
                  <h3>STAGE {n + 1} · {STAGE_NAMES[n]}</h3>
                  <p>{STAGE_LINES[n]}</p>
                </>
              )}
              <button type="button" className="ws2-btn ws2-btn--go" onClick={() => goRef.current()} autoFocus>{allDone ? 'FINISH' : n === 0 ? 'START' : 'GO'}</button>
              <span className="ws2-D__auto" aria-hidden><i key={n} /></span>
            </div>
          )}
        </div>
      </Panel>

      <HintDock
        level={level}
        itemLabel={`STAGE ${si + 1}/${STAGES.length}`}
        hint1Text="Stream at half speed for this stage."
        hint2Text="Stage decoded for you. 0 pts."
        cost1={RADIO_CONFIG.hint1Cost}
        disabled={!running}
        onHint={hint}
      />
    </section>
  );
}
