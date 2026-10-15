import { useEffect, useRef, useState } from 'react';
import { SCORING, WAVE_CALIBRATION as CAL, WAVE_PROFILES } from '../mockStation1Data';
import { useShake } from '../hooks/useScreenShake';
import { scoreRound } from '../utils/scoring';
import { alignmentFor, ampFromSlider, closenessFor, disturbanceDb, freqFromSlider, snapToWindows, targetsFor, type Closeness, type Controls } from '../utils/waves';
import type { RoundResult } from '../types';
import HintDock from '../../core/HintDock';
import { HudPanel, TeleChip } from './HudPanel';
import { ModuleHeader } from './ModuleHeader';
import { RotaryDial } from './RotaryDial';
import { TacticalSlider } from './TacticalSlider';
import { WaveScope } from './WaveScope';
import { Windshield } from './Windshield';

interface Props {
  operator: string;
  onRecord: (r: RoundResult) => void;
  /** The last target is down: the shift clock stops here and the speed bonus is frozen. */
  onCleared: () => void;
  /** The player left the "all targets down" screen. */
  onFinish: () => void;
}

type Status = 'tuning' | 'destroyed' | 'done';

interface CState {
  round: number;
  controls: Controls;
  misses: number;
  hints: 0 | 1 | 2;
  status: Status;
  /** Counts shots fired without a lock (drives the NO LOCK flash). */
  noLock: number;
}

const startState = (round: number): CState => ({ round, controls: { ...WAVE_PROFILES[round].start }, misses: 0, hints: 0, status: 'tuning', noLock: 0 });

/** Module C · wave interception: match the three controls to the noise, then fire. No hull, no per-target timer: only the shared clock can end it. */
export function ModuleC({ operator, onRecord, onCleared, onFinish }: Props) {
  const cfg = SCORING.moduleC;
  const shake = useShake();
  const [s, setS] = useState<CState>(() => startState(0));
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });

  const profile = WAVE_PROFILES[s.round];
  const align = alignmentFor(CAL, profile, s.controls);
  const meters = closenessFor(CAL, profile, s.controls);
  const db = disturbanceDb(CAL, profile, s.controls, align.locked);
  const tuning = s.status === 'tuning';
  const targets = targetsFor(CAL, profile);

  /** One shot. Locked: the target is destroyed. Not locked: NO LOCK, the target loses 20% of its points, and the player keeps trying. */
  const resolve = (locked: boolean) => {
    const cur = latest.current;
    if (cur.status !== 'tuning') return;
    if (locked) {
      onRecord({
        profileId: profile.id,
        destroyed: true,
        misses: cur.misses,
        hintsUsed: cur.hints,
        points: scoreRound(cfg, cur.misses, cur.hints),
        maxPoints: cfg.pointsPerRound,
      });
      setS({ ...cur, status: 'destroyed' });
      return;
    }
    shake('light');
    setS({ ...cur, misses: cur.misses + 1, noLock: cur.noLock + 1 });
  };

  // auto-advance after a kill
  useEffect(() => {
    if (s.status !== 'destroyed') return;
    const id = window.setTimeout(() => {
      const cur = latest.current;
      setS(cur.round >= WAVE_PROFILES.length - 1 ? { ...cur, status: 'done' } : startState(cur.round + 1));
    }, 1700);
    return () => window.clearTimeout(id);
  }, [s.status, s.round]);

  // the NO LOCK message shows briefly after each stray shot
  const [noLockOn, setNoLockOn] = useState(false);
  useEffect(() => {
    if (!s.noLock) return undefined;
    setNoLockOn(true);
    const id = window.setTimeout(() => setNoLockOn(false), 1600);
    return () => window.clearTimeout(id);
  }, [s.noLock]);

  // the last target is down: stop the shift clock
  const cleared = useRef(onCleared);
  useEffect(() => {
    cleared.current = onCleared;
  });
  useEffect(() => {
    if (s.status === 'done') cleared.current();
  }, [s.status]);

  /** Hint 1 marks the target zone on every control; Hint 2 dials the controls in and fires (the target scores 0). */
  const requestHint = (next: 1 | 2) => {
    const cur = latest.current;
    if (cur.status !== 'tuning' || cur.hints >= next) return;
    if (next === 1) {
      setS({ ...cur, hints: 1 });
      return;
    }
    const tuned = { ...cur, hints: 2 as const, controls: { amp: targets.amp, freq: targets.freq, phase: targets.phase } };
    latest.current = tuned;
    setS(tuned);
    resolve(true);
  };

  /** A control that enters its window snaps onto the target. */
  const set = (patch: Partial<Controls>) =>
    setS((cur) => (cur.status === 'tuning' ? { ...cur, controls: snapToWindows(CAL, WAVE_PROFILES[cur.round], { ...cur.controls, ...patch }) } : cur));

  const dbTone = db > 70 ? '#ef4444' : db > 48 ? '#f59e0b' : '#39ff88';
  const done = s.status === 'done';

  return (
    <div className="flex min-h-screen flex-col">
      <ModuleHeader code="MODULE C" title="Cockpit Targeting & Wave Interception" tag="ANC_INTERCEPT_ARRAY" operator={operator} steps={3} active={2} />

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
          {/* windshield */}
          <div className="relative min-h-[240px] lg:min-h-[340px]">
            <Windshield profile={profile} locked={align.locked && tuning} destroyed={s.status === 'destroyed' || done}>
              <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 text-center">
                <div className="font-tele text-[10px] uppercase tracking-[0.3em] text-goat-mute">WAVE {s.round + 1}/{WAVE_PROFILES.length}</div>
                <div className="font-hud text-sm font-bold uppercase tracking-[0.2em] text-goat-gold">{profile.callsign}</div>
              </div>
              {noLockOn && tuning && (
                <div key={s.noLock} className="goat-rise absolute inset-x-0 bottom-5 z-10 text-center font-hud text-3xl font-bold uppercase tracking-[0.35em] text-goat-crimson" style={{ textShadow: '0 0 18px #ef4444' }} role="status">
                  NO LOCK
                  <small className="mt-1 block font-tele text-[11px] tracking-[0.2em] text-goat-mute">-{Math.round(cfg.missPenalty * 100)}% OF THIS TARGET · KEEP TRYING</small>
                </div>
              )}
              {s.status === 'destroyed' && (
                <div className="goat-rise absolute inset-x-0 top-[20%] z-10 text-center font-hud text-2xl font-bold uppercase tracking-[0.35em] text-goat-lock" style={{ textShadow: '0 0 20px #39ff88' }}>
                  ◉ TARGET NEUTRALISED
                </div>
              )}
              {done && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-goat-void/70 px-4 text-center">
                  <div className="font-hud text-3xl font-bold uppercase tracking-[0.3em] text-goat-lock">ALL TARGETS DOWN</div>
                  <div className="font-tele text-xs uppercase tracking-widest text-goat-mute">SHIFT CLOCK STOPPED · SPEED BONUS LOCKED IN</div>
                </div>
              )}
            </Windshield>
          </div>

          {/* oscilloscope: tall, thick lines, nothing scrolls */}
          <div className="chamfer-tr relative flex h-[340px] bg-goat-void/85" style={{ ['--c' as string]: '16px' }}>
            <div className="relative min-w-0 flex-1">
              <div className="absolute left-3 top-2 z-10 flex flex-wrap gap-x-4 font-tele text-[11px] font-bold uppercase tracking-widest">
                <span className="text-goat-cyan">━ NOISE (STILL)</span>
                <span className="text-goat-gold">━ YOUR ANTI-WAVE</span>
                <span className={align.locked ? 'text-goat-lock' : 'text-white'}>━ WHAT IS LEFT</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 top-8">
                <WaveScope profile={profile} cal={CAL} controls={s.controls} locked={align.locked && tuning} />
              </div>
            </div>
            <div className="flex w-[116px] shrink-0 flex-col justify-between border-l border-goat-cyan/15 p-2.5">
              <div className="font-tele text-[9px] uppercase tracking-widest text-goat-mute">LEFTOVER</div>
              <div className="font-tele text-3xl font-extrabold tabular-nums leading-none" style={{ color: dbTone, textShadow: `0 0 12px ${dbTone}88` }}>
                {db.toFixed(0)}
                <span className="ml-1 text-xs">dB</span>
              </div>
              <div className="h-2 bg-goat-mute/20">
                <div className="h-full transition-[width,background-color] duration-150" style={{ width: `${((db - CAL.floorDb) / (CAL.baselineDb + 6 - CAL.floorDb)) * 100}%`, background: dbTone }} />
              </div>
              <div className="font-tele text-[9px] uppercase leading-relaxed tracking-wider text-goat-mute">
                WINDOWS
                <br />
                PHASE ±{CAL.window.phase}°
                <br />
                AMP ±{(CAL.window.amp * (CAL.ampMax - CAL.ampMin)).toFixed(2)}
                <br />
                FREQ ±{(CAL.window.freq * (CAL.freqMax - CAL.freqMin)).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* lower console: each control sits next to its own closeness meter */}
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          <HudPanel title="Slider 1 · Amplitude" tag="WAVE_HEIGHT" bodyClassName="flex items-center justify-center gap-4 p-3">
            <TacticalSlider label="Amplitude" tag="DRAG ↕" height={150} readout={ampFromSlider(CAL, s.controls.amp).toFixed(2)} value={s.controls.amp} onChange={(v) => set({ amp: v })} disabled={!tuning} marker={s.hints >= 1 ? { value: targets.amp, band: CAL.window.amp } : undefined} />
            <CloseMeter label="AMPLITUDE" c={meters.amp} height={150} />
          </HudPanel>

          <HudPanel title="Phase Inversion" tag="0° — 360°" tone="gold" cut="both" chamfer={18} className="md:w-[400px]" bodyClassName="flex flex-col items-center gap-3 p-3">
            <div className="flex items-center justify-center gap-4">
              <RotaryDial value={s.controls.phase} onChange={(d) => set({ phase: d })} disabled={!tuning} marker={s.hints >= 1 ? { deg: targets.phase, band: CAL.window.phase } : undefined} />
              <CloseMeter label="PHASE" c={meters.phase} height={150} />
            </div>
            <button
              type="button"
              disabled={!tuning}
              onClick={() => resolve(align.locked)}
              className={`chamfer w-full border-0 py-3.5 font-hud text-xl font-bold uppercase tracking-[0.3em] transition-colors disabled:cursor-not-allowed ${
                align.locked && tuning ? 'bg-goat-lock text-goat-void' : tuning ? 'bg-goat-gold/20 text-goat-gold hover:bg-goat-gold/30' : 'bg-goat-mute/15 text-goat-mute'
              }`}
              style={{ ['--c' as string]: '16px', animation: align.locked && tuning ? 'goat-fire-pulse 0.9s ease-in-out infinite' : undefined }}
            >
              [ PURGE / FIRE ]
            </button>
          </HudPanel>

          <HudPanel title="Slider 2 · Fine Filter" tag="FREQ_TUNE" bodyClassName="flex items-center justify-center gap-4 p-3">
            <TacticalSlider label="Frequency" tag="DRAG ↕" height={150} readout={`${freqFromSlider(CAL, s.controls.freq).toFixed(2)}×`} value={s.controls.freq} onChange={(v) => set({ freq: v })} disabled={!tuning} marker={s.hints >= 1 ? { value: targets.freq, band: CAL.window.freq } : undefined} />
            <CloseMeter label="FREQUENCY" c={meters.freq} height={150} />
          </HudPanel>
        </div>
      </div>

      {/* status strip */}
      <footer className="sticky bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 lg:pr-[380px]">
          <TeleChip label="HINTS" value={`${s.hints}/2`} tone={s.hints ? 'gold' : 'mute'} />
          <TeleChip label="NO-LOCK SHOTS" value={String(s.misses)} tone={s.misses ? 'crimson' : 'mute'} />
          <TeleChip label="LOCK" value={align.locked ? 'ACQUIRED' : 'SEARCHING'} tone={align.locked ? 'lock' : 'gold'} />
          <button
            type="button"
            onClick={onFinish}
            disabled={!done}
            className={`tac-btn ml-auto px-6 py-2.5 text-xs font-bold ${done ? 'bg-goat-cyan text-goat-void' : 'bg-goat-mute/20 text-goat-mute'}`}
          >
            {done ? '[ CONTINUE ▸ ]' : '[ ENGAGE TARGETS ]'}
          </button>
        </div>
      </footer>
      <HintDock
        level={s.hints}
        itemLabel={`TARGET ${s.round + 1}/${WAVE_PROFILES.length}`}
        hint1Text={`Aim for AMP ${ampFromSlider(CAL, targets.amp).toFixed(2)}, FREQ ${freqFromSlider(CAL, targets.freq).toFixed(2)}x, PHASE ${Math.round(targets.phase)} deg. The target zones are marked on every control.`}
        hint2Text="The controls were dialled in and fired for you. This target scores 0."
        cost1={cfg.hint1Penalty}
        disabled={!tuning}
        onHint={requestHint}
      />
    </div>
  );
}

/** Closeness meter for ONE control: fills as it gets closer, shows its lock window at the top, turns solid green inside it. */
function CloseMeter({ label, c, height }: { label: string; c: Closeness; height: number }) {
  const pct = Math.round(c.value * 100);
  const fill = c.inside ? '#39ff88' : c.value > 0.45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="font-tele text-[10px] font-bold uppercase tracking-[0.18em] text-goat-mute">{label}</div>
      <div
        className="relative w-10 border border-goat-cyan/40 bg-goat-void"
        style={{ height }}
        role="meter"
        aria-label={`${label} closeness`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={c.inside ? 'inside the lock window' : `${pct} percent`}
      >
        {/* lock window */}
        <div className="absolute inset-x-0 top-0 border-b-2 border-dashed border-goat-lock/80 bg-goat-lock/15" style={{ height: `${(1 - c.zone) * 100}%` }} aria-hidden />
        {/* reading */}
        <div className="absolute inset-x-0.5 bottom-0.5" style={{ height: `calc(${pct}% - 2px)`, background: fill, opacity: c.inside ? 1 : 0.8, boxShadow: c.inside ? '0 0 14px #39ff88' : undefined, transition: 'height 0.1s linear, background-color 0.15s' }} aria-hidden />
      </div>
      <div className={`font-tele text-[10px] font-bold uppercase tracking-widest ${c.inside ? 'text-goat-lock' : 'text-goat-mute'}`}>{c.inside ? '✓ LOCKED' : 'OUT'}</div>
    </div>
  );
}
