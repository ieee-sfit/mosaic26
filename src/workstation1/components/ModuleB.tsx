import { useEffect, useMemo, useRef, useState } from 'react';
import { DIAG_WAVEFORMS, SCORING, WAVE_CALIBRATION as CAL } from '../mockStation1Data';
import { useShake } from '../hooks/useScreenShake';
import { scoreStep } from '../utils/scoring';
import { normDeg, ampFromSlider, freqFromSlider, type Controls } from '../utils/waves';
import {
  CONTROL_KEYS,
  CONTROL_WORDS,
  REASON,
  fixOrder,
  leftoverRatio,
  targetsOf,
  withinTolerance,
  type ControlKey,
} from '../utils/diagnose';
import type { StepResult } from '../types';
import HintDock from '../../core/HintDock';
import { ModuleHeader } from './ModuleHeader';
import { DiagScope, LAB } from './DiagScope';
import { JogControl } from './JogControl';

interface Props {
  operators: [string, string];
  onRecord: (r: StepResult) => void;
  onComplete: () => void;
}

type Stage = 'diagnose' | 'fix' | 'fixed' | 'recap' | 'done';

interface BState {
  wave: 0 | 1;
  step: 0 | 1 | 2;
  controls: Controls;
  fixed: ControlKey[];
  picked: ControlKey | null;
  rejected: ControlKey[];
  reason: string | null;
  hint: 0 | 1 | 2;
  wrongs: number;
  stage: Stage;
}

/** One press = one unit. Holding ramps up (see JogControl). */
const UNIT: Record<ControlKey, number> = { amp: 0.004, freq: 0.004, phase: 0.8 };
const ADVANCE_MS = 1300;

const fresh = (wave: 0 | 1, controls?: Controls): BState => ({
  wave,
  step: 0,
  controls: controls ?? { ...DIAG_WAVEFORMS[wave].start },
  fixed: [],
  picked: null,
  rejected: [],
  reason: null,
  hint: 0,
  wrongs: 0,
  stage: 'diagnose',
});

const readout = (k: ControlKey, c: Controls): string =>
  k === 'amp' ? ampFromSlider(CAL, c.amp).toFixed(2) : k === 'freq' ? `${freqFromSlider(CAL, c.freq).toFixed(2)}×` : `${Math.round(c.phase)}°`;

/** Module B · DIAGNOSE THE LEFTOVER. Read the leftover line, name the wrong control, fix it by hand. */
export function ModuleB({ operators, onRecord, onComplete }: Props) {
  const cfg = SCORING.moduleB;
  const shake = useShake();
  const [s, setS] = useState<BState>(() => fresh(0));
  const [flash, setFlash] = useState<{ kind: 'bad' | 'ok'; n: number } | null>(null);
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });

  const wave = DIAG_WAVEFORMS[s.wave];
  const orders = useMemo(() => DIAG_WAVEFORMS.map((w) => fixOrder(CAL, w).order), []);
  const expected = orders[s.wave][s.step];
  const remaining = CONTROL_KEYS.filter((k) => !s.fixed.includes(k));
  const live = s.stage === 'diagnose' || s.stage === 'fix';
  const ratio = leftoverRatio(CAL, wave, s.controls);
  const stepsDone = s.wave * 3 + (s.stage === 'fixed' || s.stage === 'recap' || s.stage === 'done' ? s.step + 1 : s.step);

  const mark = (kind: 'bad' | 'ok') => setFlash((f) => ({ kind, n: (f?.n ?? 0) + 1 }));

  /** The control is fixed: score the step, snap the control exactly onto its target and show FIXED. */
  const completeStep = (hint: 0 | 1 | 2, wrongs: number, key: ControlKey) => {
    const cur = latest.current;
    const t = targetsOf(CAL, DIAG_WAVEFORMS[cur.wave]);
    const snapped: Controls = { ...cur.controls, [key]: t[key] };
    onRecord({
      waveId: DIAG_WAVEFORMS[cur.wave].id,
      stepIndex: cur.step,
      control: key,
      wrongAttempts: wrongs,
      hintsUsed: hint,
      points: scoreStep(cfg, cur.step, wrongs, hint),
      maxPoints: cfg.stepPoints[cur.step],
    });
    mark('ok');
    setS({ ...cur, controls: snapped, fixed: [...cur.fixed, key], picked: key, hint, reason: null, stage: 'fixed' });
  };

  // after FIXED, move on automatically
  useEffect(() => {
    if (s.stage !== 'fixed') return undefined;
    const id = window.setTimeout(() => {
      const cur = latest.current;
      if (cur.step < 2) {
        const nextStep = (cur.step + 1) as 1 | 2;
        const left = CONTROL_KEYS.filter((k) => !cur.fixed.includes(k));
        setS({
          ...cur,
          step: nextStep,
          picked: left.length === 1 ? left[0] : null,
          rejected: [],
          reason: left.length === 1 ? `Only ${CONTROL_WORDS[left[0]].plain} is left.` : null,
          hint: 0,
          wrongs: 0,
          stage: left.length === 1 ? 'fix' : 'diagnose',
        });
      } else {
        setS({ ...cur, stage: cur.wave === 0 ? 'recap' : 'done' });
      }
    }, ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [s.stage, s.wave, s.step]);

  const choose = (k: ControlKey) => {
    const cur = latest.current;
    if (cur.stage !== 'diagnose' || cur.fixed.includes(k) || cur.rejected.includes(k)) return;
    if (k === orders[cur.wave][cur.step]) {
      setS({ ...cur, picked: k, reason: null, stage: 'fix' });
      return;
    }
    mark('bad');
    shake('light');
    setS({ ...cur, rejected: [...cur.rejected, k], wrongs: cur.wrongs + 1, reason: REASON[orders[cur.wave][cur.step]] });
  };

  const jog = (units: number) => {
    const cur = latest.current;
    if (cur.stage !== 'fix' || !cur.picked) return;
    const k = cur.picked;
    const next: Controls = { ...cur.controls };
    if (k === 'phase') next.phase = normDeg(next.phase + units * UNIT.phase);
    else next[k] = Math.min(1, Math.max(0, next[k] + units * UNIT[k]));
    latest.current = { ...cur, controls: next };
    if (withinTolerance(CAL, cfg.tolerance, DIAG_WAVEFORMS[cur.wave], next, k)) {
      completeStep(cur.hint, cur.wrongs, k);
    } else {
      setS({ ...cur, controls: next });
    }
  };

  /** Hint 1 names the dominant error and says why; Hint 2 fixes the step for 0 points. */
  const requestHint = (next: 1 | 2) => {
    const cur = latest.current;
    if (!(cur.stage === 'diagnose' || cur.stage === 'fix') || cur.hint >= next) return;
    const exp = orders[cur.wave][cur.step];
    if (next === 1) {
      setS({ ...cur, hint: 1, reason: REASON[exp] });
      return;
    }
    latest.current = { ...cur, picked: exp };
    completeStep(2, cur.wrongs, exp);
  };

  const startWave2 = () => setS(fresh(1));

  const hintTextFor = `${CONTROL_WORDS[expected].name} · ${CONTROL_WORDS[expected].plain} is the control to fix. ${REASON[expected]}`;
  const guided = wave.guided;
  const solvedGlow = s.stage === 'fixed' || s.stage === 'done';
  const picked = s.picked;

  return (
    <div className="flex min-h-screen flex-col">
      <ModuleHeader code="MODULE B" title="Diagnose the Leftover" tag="LEFTOVER_LAB" operators={operators} steps={3} active={1} />
      {flash && <div key={`${flash.kind}${flash.n}`} className={flash.kind === 'bad' ? 'hull-flash' : 'lab-flash'} />}

      <div className="grid flex-1 items-stretch gap-3 p-3 pb-24 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
        {/* ── lab notebook: graph paper ── */}
        <section className={`lab-paper ${solvedGlow ? 'is-fixed' : ''}`} aria-label="Lab notebook graph">
          <header className="lab-paper-head">
            <div>
              <span className="lab-tag">{wave.id}</span>
              <b>{wave.label}</b>
              <em>{guided ? 'GUIDED' : 'ON YOUR OWN'}</em>
            </div>
            <div className="lab-keys" aria-label="Colour key">
              <span><i style={{ background: LAB.noise }} />NOISE</span>
              <span><i style={{ background: LAB.anti }} />YOUR WAVE</span>
              <span><i style={{ background: LAB.silver, boxShadow: `0 0 0 2px ${LAB.silverEdge}` }} />LEFTOVER</span>
            </div>
          </header>
          <div className="lab-plot">
            <DiagScope wave={wave} cal={CAL} controls={s.controls} ticks={guided} />
            {s.stage === 'fixed' && (
              <div className="lab-stamp goat-rise" role="status">✓ FIXED · {CONTROL_WORDS[picked ?? expected].plain}</div>
            )}
            {s.stage === 'done' && (
              <div className="lab-stamp goat-rise" role="status">✓ LEFTOVER FLAT · BOTH WAVES CLEAR</div>
            )}
            {s.stage === 'recap' && (
              <div className="lab-recap goat-rise" role="dialog" aria-label="What you learned">
                <small>WAVEFORM 1 CLEAR</small>
                <h3>READ THE LEFTOVER</h3>
                <ul>
                  <li><b>Swells and shrinks</b> = PITCH</li>
                  <li><b>Peaks line up</b> = LOUDNESS</li>
                  <li><b>Peaks between</b> = TIMING</li>
                </ul>
                <button type="button" className="lab-go" onClick={startWave2}>[ WAVEFORM 2 ▸ NO GUIDES ]</button>
              </div>
            )}
          </div>
          {guided && (
            <div className="lab-legend" aria-label="Tick legend">
              <span><svg width="14" height="12" aria-hidden><path d="M7 11 L1 1 L13 1 Z" fill={LAB.noise} stroke={LAB.silverEdge} /></svg> noise peak</span>
              <span><svg width="14" height="12" aria-hidden><path d="M7 1 L1 11 L13 11 Z" fill={LAB.silver} stroke={LAB.silverEdge} /></svg> leftover peak</span>
              <span>dotted line = where the noise peaks</span>
            </div>
          )}
        </section>

        {/* ── diagnosis + hand controls ── */}
        <section className="lab-side">
          <div className="lab-rail" aria-label={`Waveform ${s.wave + 1} of 2, step ${s.step + 1} of 3`}>
            <span className="lab-rail-title">WAVEFORM {s.wave + 1}/2 · STEP {s.step + 1}/3</span>
            <div>
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} className={i < stepsDone ? 'is-done' : i === stepsDone ? 'is-live' : ''} />
              ))}
            </div>
          </div>

          <h3 className="lab-q">{s.stage === 'diagnose' ? 'WHICH CONTROL IS OFF?' : s.stage === 'fix' ? 'NUDGE IT UNTIL THE LEFTOVER SHRINKS' : s.stage === 'fixed' ? 'FIXED' : s.stage === 'recap' ? 'WAVEFORM 1 CLEAR' : 'ALL CLEAR'}</h3>

          <div className="lab-picks" role="group" aria-label="Which control is off">
            {(['amp', 'phase', 'freq'] as ControlKey[]).map((k) => {
              const isFixed = s.fixed.includes(k);
              const isRej = s.rejected.includes(k);
              const isPicked = picked === k && !isFixed;
              const hinted = s.hint >= 1 && live && expected === k && !isFixed;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={s.stage !== 'diagnose' || isFixed || isRej}
                  onClick={() => choose(k)}
                  className={`lab-pick ${isFixed ? 'is-fixed' : ''} ${isRej ? 'is-rej' : ''} ${isPicked ? 'is-picked' : ''} ${hinted ? 'is-hint' : ''}`}
                >
                  <b>{CONTROL_WORDS[k].name}</b>
                  <span>{CONTROL_WORDS[k].plain}</span>
                  {isFixed && <em>✓ FIXED</em>}
                  {isRej && <em>✗ NOT THIS ONE</em>}
                  {isPicked && s.stage === 'fix' && <em>◂ NUDGE THIS</em>}
                </button>
              );
            })}
          </div>

          <div className="lab-reason" aria-live="polite">{s.reason ? `▸ ${s.reason}` : s.stage === 'diagnose' ? `Look at the silver line. ${remaining.length} control${remaining.length > 1 ? 's' : ''} still off.` : ''}</div>

          {s.stage === 'fix' && picked && (
            <JogControl
              label={`${CONTROL_WORDS[picked].name} · ${CONTROL_WORDS[picked].plain}`}
              readout={readout(picked, s.controls)}
              onJog={jog}
            />
          )}

          <div className="lab-meter" aria-label="Leftover level">
            <span>LEFTOVER</span>
            <div><i style={{ width: `${Math.min(100, ratio * 80)}%` }} /></div>
            <b>{Math.round(Math.min(1.5, ratio) * 100)}%</b>
          </div>
        </section>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-goat-gold/60 bg-goat-void/95">
        <div className="hazard-stripe h-1 w-full opacity-70" aria-hidden />
        <div className="flex items-center gap-3 px-3 py-2.5 lg:pr-[380px]">
          <span className="font-tele text-[11px] uppercase tracking-widest text-goat-mute">
            {s.stage === 'done' ? '● BOTH WAVEFORMS CLEAR — MODULE C NEXT' : `◌ FIX ALL THREE CONTROLS ON BOTH WAVEFORMS (${stepsDone}/6)`}
          </span>
          <button
            type="button"
            onClick={onComplete}
            disabled={s.stage !== 'done'}
            className={`tac-btn ml-auto px-6 py-3 text-xs font-bold ${s.stage === 'done' ? 'bg-goat-cyan text-goat-void' : 'bg-goat-mute/20 text-goat-mute'}`}
          >
            {s.stage === 'done' ? '[ PROCEED ▸ MODULE C ]' : '[ MODULE C LOCKED ]'}
          </button>
        </div>
      </footer>
      {(s.stage === 'diagnose' || s.stage === 'fix' || s.stage === 'fixed') && (
        <HintDock
          level={s.hint}
          itemLabel={`${wave.id} · STEP ${s.step + 1}/3`}
          hint1Text={hintTextFor}
          hint2Text="The control was fixed for you. This step scores 0."
          cost1={cfg.hint1Penalty}
          disabled={s.stage === 'fixed'}
          onHint={requestHint}
        />
      )}
    </div>
  );
}

