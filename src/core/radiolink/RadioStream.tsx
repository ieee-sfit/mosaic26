import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RESEND_ANSWER } from './types';
import type { CodeEntry, Frame, RadioStream as Stream, StageSpec } from './types';
import './radiolink.css';

/** What happened to one command. `chosen` is a codebook index, RESEND_ANSWER, or null when the window was missed. */
export interface AnswerResult {
  index: number;
  frame: Frame;
  chosen: number | null;
  correct: boolean;
  missed: boolean;
}

interface Props {
  stream: Stream;
  spec: StageSpec;
  codebook: readonly CodeEntry[];
  resendLabel?: string;
  /** Multiplies the stream speed (Hint 1 sets 0.5). */
  speedScale?: number;
  /** While true the line freezes and keys are ignored (an intro card is up). */
  paused?: boolean;
  /** Text above the pointer. */
  pointerLabel?: string;
  className?: string;
  onWindowOpen?: (index: number) => void;
  onAnswer: (r: AnswerResult) => void;
  /** Called once every window has closed. */
  onEnd: () => void;
  /** Extra content under the line, e.g. a themed feedback slot. */
  footer?: ReactNode;
}

const PAD = 16; // idle cells rendered beyond each end of the stream
const HOLD_MS = 600; // freeze mode: how long the verdict shows before the line moves on
const TAIL_BITS = 3; // the stage ends this many bit-times after the last window closes

const bitAt = (bits: readonly number[], i: number) => {
  if (i >= 0 && i < bits.length) return bits[i];
  if (i < 0) return (bits[0] + -i) % 2;
  return (bits[bits.length - 1] + (i - bits.length + 1)) % 2;
};

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The generic RADIO LINK stage: bits scroll right to left past a fixed pointer, the player answers while the window is open.
 * Scroll position is derived from timestamps (requestAnimationFrame), never from counting ticks.
 */
export default function RadioStream({
  stream, spec, codebook, resendLabel = 'RESEND', speedScale = 1, paused = false, pointerLabel = 'RX',
  className = '', onWindowOpen, onAnswer, onEnd, footer,
}: Props) {
  const entries = useMemo(() => codebook.slice(0, spec.active), [codebook, spec.active]);
  // every answer is always on screen with one fixed number (1 = first codebook entry ... RESEND last); the ones this stage does not use are dimmed
  const buttons = useMemo(
    () => [
      ...codebook.map((e, i) => ({ id: e.id, label: e.label, value: i, on: i < spec.active })),
      { id: 'resend', label: resendLabel, value: RESEND_ANSWER, on: spec.resend },
    ],
    [codebook, spec.active, spec.resend, resendLabel],
  );

  const view$ = useRef<HTMLDivElement | null>(null);
  const bar$ = useRef<HTMLDivElement | null>(null);
  const span$ = useRef<HTMLDivElement | null>(null);
  const head = useRef(0);
  const holdUntil = useRef(0); // freeze mode: short beat after an answer before the line moves again
  const last = useRef(0);
  const state = useRef<Array<'wait' | 'open' | 'done'>>(stream.frames.map(() => 'wait'));
  const openIdx = useRef(-1);
  const ended = useRef(false);
  const live = useRef({ speedScale, paused, onWindowOpen, onAnswer, onEnd });
  useEffect(() => { live.current = { speedScale, paused, onWindowOpen, onAnswer, onEnd }; });

  const [open, setOpen] = useState(-1);
  const [last$, setLast] = useState<AnswerResult | null>(null);
  const [flash, setFlash] = useState<'ok' | 'bad' | ''>('');
  const flashTimer = useRef<number | null>(null);
  useEffect(() => () => { if (flashTimer.current) window.clearTimeout(flashTimer.current); }, []);

  const settle = useCallback((index: number, chosen: number | null) => {
    if (state.current[index] === 'done') return;
    state.current[index] = 'done';
    if (openIdx.current === index) { openIdx.current = -1; setOpen(-1); }
    const frame = stream.frames[index];
    const correct = chosen !== null && chosen === frame.answer;
    const r: AnswerResult = { index, frame, chosen, correct, missed: chosen === null };
    setLast(r);
    setFlash(correct ? 'ok' : 'bad');
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 520);
    holdUntil.current = performance.now() + HOLD_MS;
    live.current.onAnswer(r);
  }, [stream]);

  // the clock: head = how many bits have passed the pointer, advanced by real elapsed time
  useEffect(() => {
    let raf = 0;
    last.current = performance.now();
    const still = reducedMotion();
    const frames = stream.frames;
    const freeze = !!spec.freeze;
    const endHead = frames[frames.length - 1].end + (freeze ? 0 : spec.windowBits) + TAIL_BITS;
    const tick = (now: number) => {
      const dt = Math.min(0.25, Math.max(0, (now - last.current) / 1000));
      last.current = now;
      const waiting = freeze && (openIdx.current >= 0 || now < holdUntil.current);
      if (!live.current.paused && !ended.current && !waiting) head.current += dt * spec.bps * live.current.speedScale;
      if (freeze) {
        // stop exactly on the closing bit of the next unanswered command
        const nx = frames.findIndex((f, i) => state.current[i] !== 'done' && head.current >= f.end);
        if (nx >= 0) head.current = frames[nx].end;
      }
      const h = head.current;
      view$.current?.style.setProperty('--head', String(still ? Math.floor(h) : h));
      frames.forEach((f, i) => {
        if (state.current[i] === 'done') return;
        if (!freeze && h >= f.end + spec.windowBits) { settle(i, null); return; }
        if (h >= f.end && state.current[i] === 'wait') {
          state.current[i] = 'open';
          openIdx.current = i;
          setOpen(i);
          live.current.onWindowOpen?.(i);
        }
      });
      const oi = openIdx.current;
      if (bar$.current) bar$.current.style.transform = `scaleX(${oi >= 0 && !freeze ? Math.max(0, 1 - (h - frames[oi].end) / spec.windowBits) : 0})`;
      if (span$.current) {
        // while the line is stopped, underline the command so the player can count its run
        const f = oi >= 0 ? frames[oi] : null;
        span$.current.style.opacity = f ? '1' : '0';
        if (f) { span$.current.style.setProperty('--from', String(f.start - h)); span$.current.style.setProperty('--len', String(f.end - f.start + 1)); }
      }
      if (!ended.current && h >= endHead && state.current.every((s) => s === 'done')) {
        ended.current = true;
        live.current.onEnd();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stream, spec, settle]);

  const answer = useCallback((value: number) => {
    if (live.current.paused || openIdx.current < 0) return;
    settle(openIdx.current, value);
  }, [settle]);
  const buttonsRef = useRef(buttons);
  useEffect(() => { buttonsRef.current = buttons; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      const b = Number.isInteger(n) && n >= 1 ? buttonsRef.current[n - 1] : undefined;
      if (b) { e.preventDefault(); if (b.on) answer(b.value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  const cells = useMemo(() => {
    const out: Array<{ i: number; b: number }> = [];
    for (let i = -PAD; i < stream.bits.length + PAD; i++) out.push({ i, b: bitAt(stream.bits, i) });
    return out;
  }, [stream]);

  const f = last$?.frame;
  const entryOf = (v: number | null) => (v === null ? '' : v === RESEND_ANSWER ? resendLabel : entries[v]?.label ?? '');

  return (
    <div className={`rl ${className}`} data-open={open >= 0 ? open : ''} data-stage-bps={spec.bps}>
      <div ref={view$} className={`rl-view ${open >= 0 ? 'is-open' : ''} ${flash ? `is-${flash}` : ''}`} style={{ ['--pad' as string]: PAD }} aria-hidden>
        <div className="rl-track">
          {cells.map(({ i, b }) => <i key={i} className={b ? 'one' : 'zero'}>{b}</i>)}
        </div>
        <div className="rl-past" />
        <div className="rl-pointer"><span>{pointerLabel}</span></div>
        <div className="rl-span" ref={span$} />
        <div className="rl-bar"><div ref={bar$} /></div>
      </div>

      <div className="rl-feed" role="status" aria-live="polite">
        {last$ && f && (
          <>
            <div className={`rl-verdict ${last$.correct ? 'ok' : 'bad'}`}>
              <b>{last$.correct ? '✓' : last$.missed ? '— MISSED' : '✗'}</b>
              <span>
                {last$.correct && (f.corrupted ? `${resendLabel} · CORRUPTED` : entryOf(f.answer))}
                {!last$.correct && !last$.missed && `${entryOf(last$.chosen)} · ${f.corrupted ? 'IT WAS CORRUPTED' : `IT WAS ${entryOf(f.answer)}`}`}
                {last$.missed && (f.corrupted ? 'CORRUPTED · WANTED ' + resendLabel : `WAS ${entryOf(f.answer)}`)}
              </span>
            </div>
            {f.corrupted && (
              <div className="rl-teach" aria-label={`Sent ${f.sent.join('')}, got ${f.got.join('')}`}>
                <div><small>SENT</small><span>{f.sent.map((b, k) => <i key={k} className={b ? 'one' : 'zero'}>{b}</i>)}</span></div>
                <div><small>GOT</small><span>{f.got.map((b, k) => <i key={k} className={`${b ? 'one' : 'zero'} ${f.flips.includes(k) ? 'flip' : ''}`}>{b}</i>)}</span></div>
                <em>{f.flips.length === 1 ? `BIT ${f.flips[0] + 1} FLIPPED` : `BITS ${f.flips.map((k) => k + 1).join(' + ')} FLIPPED`}</em>
              </div>
            )}
          </>
        )}
      </div>

      {footer}

      <div className="rl-keys" role="group" aria-label="Answers">
        {buttons.map((b, n) => (
          <button
            key={b.id} type="button" className={`rl-key ${b.value === RESEND_ANSWER ? 'is-resend' : ''} ${b.on ? '' : 'is-off'} ${last$ && last$.chosen === b.value && flash ? `is-${flash}` : ''}`}
            data-armed={open >= 0 && b.on ? '1' : '0'} aria-disabled={!b.on || open < 0 || paused} onClick={() => { if (b.on) answer(b.value); }}
          >
            <kbd>{n + 1}</kbd><span>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
