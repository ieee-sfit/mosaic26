import { useEffect, useRef, useState } from 'react';
import { SCORING, WAVE_CALIBRATION as CAL, WAVE_PROFILES } from '../mockStation1Data';
import { useShake } from '../hooks/useScreenShake';
import { scoreRound } from '../utils/scoring';
import { alignmentFor, ampFromSlider, disturbanceDb, freqFromSlider, targetsFor, type Controls } from '../utils/waves';
import type { EndReason, RoundResult } from '../types';
import HintDock from '../../core/HintDock';
import { HudPanel, TeleChip } from './HudPanel';
import { HullPips } from './HullPips';
import { ModuleHeader } from './ModuleHeader';
import { RotaryDial } from './RotaryDial';
import { TacticalSlider } from './TacticalSlider';
import { WaveScope } from './WaveScope';
import { Windshield } from './Windshield';

interface Props {
  operators: [string, string];
  onRecord: (r: RoundResult) => void;
  onHullChange: (hull: number) => void;
  onFinish: (reason: EndReason, hull: number) => void;
}

type Status = 'tuning' | 'destroyed' | 'done' | 'breach';

interface CState {
  round: number;
  controls: Controls;
  hull: number;
  misses: number;
  hints: 0 | 1 | 2;
  status: Status;
  deadline: number;
  hits: number;
}

const startState = (round: number, hull: number, now: number, hits: number): CState => {
  const p = WAVE_PROFILES[round];
  return { round, controls: { ...p.start }, hull, misses: 0, hints: 0, status: 'tuning', deadline: now + p.timeLimitSec * 1000, hits };
};

export function ModuleC({ operators, onRecord, onHullChange, onFinish }: Props) {
  const cfg = SCORING.moduleC;
  const shake = useShake();
  const [s, setS] = useState<CState>(() => startState(0, cfg.hullPips, Date.now(), 0));
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });

  const profile = WAVE_PROFILES[s.round];
  const align = alignmentFor(CAL, profile, s.controls);
  const db = disturbanceDb(CAL, profile, s.controls, align.locked);
  const tuning = s.status === 'tuning';
  const msLeft = Math.max(0, s.deadline - now);

  /** One shot at the target. Misses cost a pip; a hit scores the round. */
  const resolve = (locked: boolean) => {
    const cur = latest.current;
    if (cur.status !== 'tuning') return;
    const t = Date.now();
    if (locked) {
      const result: RoundResult = {
        profileId: profile.id,
        destroyed: true,
        misses: cur.misses,
        hintsUsed: cur.hints,
        points: scoreRound(cfg, cur.misses, cur.hints),
        maxPoints: cfg.pointsPerRound,
      };
      onRecord(result);
      setS({ ...cur, status: 'destroyed' });
      return;
    }
    const hull = cur.hull - 1;
    shake('heavy');
    onHullChange(Math.max(0, hull));
    if (hull <= 0) {
      onRecord({ profileId: profile.id, destroyed: false, misses: cur.misses + 1, hintsUsed: cur.hints, points: 0, maxPoints: cfg.pointsPerRound });
      setS({ ...cur, hull: 0, misses: cur.misses + 1, status: 'breach', hits: cur.hits + 1 });
    } else {
      setS({ ...cur, hull, misses: cur.misses + 1, hits: cur.hits + 1, deadline: t + profile.timeLimitSec * 1000 });
    }
  };

  const timeoutRef = useRef(() => {});
  // clock for the round bar + timeout detection
  useEffect(() => {
    if (!tuning) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = latest.current;
      if (cur.status === 'tuning' && t >= cur.deadline) timeoutRef.current();
    }, 100);
    return () => window.clearInterval(id);
  }, [tuning]);
  useEffect(() => {
    timeoutRef.current = () => resolve(false);
  });

  // auto-advance after a kill
  useEffect(() => {
    if (s.status !== 'destroyed') return;
    const id = window.setTimeout(() => {
      const cur = latest.current;
      if (cur.round >= WAVE_PROFILES.length - 1) {
        setS({ ...cur, status: 'done' });
      } else {
        setS(startState(cur.round + 1, cur.hull, Date.now(), cur.hits));
        setNow(Date.now());
      }
    }, 1700);
    return () => window.clearTimeout(id);
  }, [s.status, s.round]);

  const targets = targetsFor(CAL, profile);

  /** Hint 1 marks the target band on every control; Hint 2 dials the controls in (round scores 0). */
  const requestHint = (next: 1 | 2) => {
    const cur = latest.current;
    if (cur.status !== 'tuning' || cur.hints >= next) return;
    if (next === 1) {
      setS({ ...cur, hints: 1 });
      return;
    }
    // Hint 2 dials the controls in and fires for the player: the round scores 0
    const tuned = { ...cur, hints: 2 as const, controls: { amp: targets.amp, freq: targets.freq, phase: targets.phase } };
    latest.current = tuned;
    setS(tuned);
    resolve(true);
  };

  const set = (patch: Partial<Controls>) => setS((cur) => (cur.status === 'tuning' ? { ...cur, controls: { ...cur.controls, ...patch } } : cur));

  const dbTone = db > 70 ? '#ef4444' : db > 48 ? '#f59e0b' : '#39ff88';
  const timePct = (msLeft / (profile.timeLimitSec * 1000)) * 100;
  const finished = s.status === 'done' || s.status === 'breach';

  return (
    <div className="flex min-h-screen flex-col">
      <ModuleHeader code="MODULE C" title="Cockpit Targeting & Wave Interception" tag="ANC_INTERCEPT_ARRAY" operators={operators} steps={3} active={2} />
      {s.hits > 0 && <div key={s.hits} className="hull-flash" />}

      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* windshield */}
        <div className="relative min-h-[290px] flex-1">
          <Windshield profile={profile} locked={align.locked && tuning} destroyed={s.status === 'destroyed' || s.status === 'done'}>
            <div className="absolute left-5 top-5 z-10">
              <HullPips hull={s.hull} max={cfg.hullPips} />
            </div>
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 text-center">
              <div className="font-tele text-[10px] uppercase tracking-[0.3em] text-goat-mute">WAVE {s.round + 1}/{WAVE_PROFILES.length}</div>
              <div className="font-hud text-sm font-bold uppercase tracking-[0.2em] text-goat-gold">{profile.callsign}</div>
            </div>
            <div className="absolute bottom-4 left-1/2 z-10 flex h-[108px] w-[min(92%,760px)] -translate-x-1/2 gap-2">
              <div className="chamfer-tr relative min-w-0 flex-1 bg-goat-void/80" style={{ ['--c' as string]: '12px' }}>
                <div className="absolute left-2 top-1 z-10 flex gap-3 font-tele text-[9px] uppercase tracking-widest">
                  <span className="text-goat-cyan">━ NOISE_IN</span>
                  <span className="text-goat-gold">━ ANTI_NOISE</span>
                  <span className={align.locked ? 'text-goat-lock' : 'text-white'}>━ RESIDUE</span>
                </div>
                <WaveScope profile={profile} cal={CAL} controls={s.controls} locked={align.locked && tuning} />
              </div>
              <div className="chamfer-tr flex w-[104px] flex-col justify-between bg-goat-void/80 p-2" style={{ ['--c' as string]: '10px' }}>
                <div className="font-tele text-[9px] uppercase tracking-widest text-goat-mute">DISTURBANCE</div>
                <div className="font-tele text-3xl font-extrabold tabular-nums leading-none" style={{ color: dbTone, textShadow: `0 0 12px ${dbTone}88` }}>
                  {db.toFixed(0)}
                  <span className="ml-1 text-xs">dB</span>
                </div>
                <div className="h-2 bg-goat-mute/20">
                  <div className="h-full transition-[width,background-color] duration-150" style={{ width: `${((db - CAL.floorDb) / (CAL.baselineDb + 6 - CAL.floorDb)) * 100}%`, background: dbTone }} />
                </div>
                <div className="font-tele text-[9px] uppercase tracking-wider text-goat-mute">TOL ±{Math.round(CAL.tolerance * 100)}%</div>
              </div>
            </div>

            {s.status === 'destroyed' && (
              <div className="goat-rise absolute inset-x-0 top-[20%] z-10 text-center font-hud text-2xl font-bold uppercase tracking-[0.35em] text-goat-lock" style={{ textShadow: '0 0 20px #39ff88' }}>
                ◉ TARGET NEUTRALISED
              </div>
            )}
            {finished && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-goat-void/70">
                <div className={`font-hud text-4xl font-bold uppercase tracking-[0.3em] ${s.status === 'breach' ? 'goat-blink text-goat-crimson' : 'text-goat-lock'}`}>
                  {s.status === 'breach' ? 'HULL BREACH' : 'ALL TARGETS DOWN'}
                </div>
                <div className="font-tele text-xs uppercase tracking-widest text-goat-mute">
                  {s.status === 'breach' ? 'ARMOUR EXHAUSTED · MISSION TERMINATED' : `HULL REMAINING ${Math.round((s.hull / cfg.hullPips) * 100)}%`}
                </div>
              </div>
            )}
          </Windshield>
        </div>

        {/* symmetrical lower console */}
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          <HudPanel title="Slider 1 · Amplitude" tag="WAVE_HEIGHT" bodyClassName="flex items-center justify-center p-3">
            <TacticalSlider label="Amplitude" tag="DRAG ↕" readout={ampFromSlider(CAL, s.controls.amp).toFixed(2)} value={s.controls.amp} onChange={(v) => set({ amp: v })} disabled={!tuning} marker={s.hints >= 1 ? { value: targets.amp, band: CAL.tolerance } : undefined} />
          </HudPanel>

          <HudPanel title="Phase Inversion" tag="0° — 360°" tone="gold" cut="both" chamfer={18} className="md:w-[330px]" bodyClassName="flex flex-col items-center gap-3 p-3">
            <RotaryDial value={s.controls.phase} onChange={(d) => set({ phase: d })} disabled={!tuning} marker={s.hints >= 1 ? { deg: targets.phase, band: CAL.tolerance * 360 } : undefined} />
            <button
              type="button"
              disabled={!tuning}
              onClick={() => resolve(align.locked)}
              className={`chamfer w-full border-0 py-4 font-hud text-xl font-bold uppercase tracking-[0.3em] transition-colors disabled:cursor-not-allowed ${
                align.locked && tuning ? 'bg-goat-lock text-goat-void' : tuning ? 'bg-goat-gold/20 text-goat-gold hover:bg-goat-gold/30' : 'bg-goat-mute/15 text-goat-mute'
              }`}
              style={{ ['--c' as string]: '16px', animation: align.locked && tuning ? 'goat-fire-pulse 0.9s ease-in-out infinite' : undefined }}
            >
              [ PURGE / FIRE ]
            </button>
          </HudPanel>

          <HudPanel title="Slider 2 · Fine Filter" tag="FREQ_TUNE" bodyClassName="flex items-center justify-center p-3">
            <TacticalSlider label="Frequency" tag="DRAG ↕" readout={`${freqFromSlider(CAL, s.controls.freq).toFixed(2)}×`} value={s.controls.freq} onChange={(v) => set({ freq: v })} disabled={!tuning} marker={s.hints >= 1 ? { value: targets.freq, band: CAL.tolerance } : undefined} />
          </HudPanel>
        </div>
      </div>

      {/* status strip */}
      <footer className="sticky bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 lg:pr-[380px]">
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <span className="font-tele text-[10px] uppercase tracking-widest text-goat-mute">WAVE_TIMER</span>
            <div className="h-2 flex-1 bg-goat-mute/20">
              <div className="h-full" style={{ width: `${timePct}%`, background: timePct < 25 ? '#ef4444' : '#f59e0b', transition: 'width 0.1s linear' }} />
            </div>
            <span className={`font-tele text-sm font-bold tabular-nums ${timePct < 25 ? 'goat-blink text-goat-crimson' : 'text-goat-gold'}`}>{(msLeft / 1000).toFixed(1)}s</span>
          </div>
           <TeleChip label="HINTS" value={`${s.hints}/2`} tone={s.hints ? 'gold' : 'mute'} />
          <TeleChip label="MISSES" value={String(s.misses)} tone={s.misses ? 'crimson' : 'mute'} />
          <TeleChip label="LOCK" value={align.locked ? 'ACQUIRED' : 'SEARCHING'} tone={align.locked ? 'lock' : 'gold'} />
          <button
            type="button"
            onClick={() => onFinish(s.status === 'breach' ? 'HULL_BREACH' : 'COMPLETE', s.hull)}
            disabled={!finished}
            className={`tac-btn ml-auto px-6 py-2.5 text-xs font-bold ${finished ? 'bg-goat-cyan text-goat-void' : 'bg-goat-mute/20 text-goat-mute'}`}
          >
            {finished ? '[ MISSION REPORT ▸ ]' : '[ ENGAGE TARGETS ]'}
          </button>
        </div>
      </footer>
      <HintDock
        level={s.hints}
        itemLabel={`TARGET ${s.round + 1}/${WAVE_PROFILES.length}`}
        hint1Text={`Aim for AMP ${ampFromSlider(CAL, targets.amp).toFixed(2)}, FREQ ${freqFromSlider(CAL, targets.freq).toFixed(2)}x, PHASE ${Math.round(targets.phase)} deg. The target bands are marked on every control.`}
        hint2Text="The controls were dialled in and fired for you. This target scores 0."
        cost1={cfg.hint1Penalty}
        disabled={!tuning}
        onHint={requestHint}
      />
    </div>
  );
}
