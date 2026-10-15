import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storyImage } from '../story/story';
import type { StoryBeat } from '../story/story';

interface Props {
  beat: StoryBeat;
  /** Paragraphs appended after the beat's own text (e.g. the Module D line on the success ending). */
  extra?: string[];
  onContinue: () => void;
}

/** Characters revealed per second, and the pause between paragraphs (counted in characters). */
const CPS = 38;
const GAP_CHARS = 14;
const NO_EXTRA: string[] = [];

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Full-screen story beat: picture, dark gradient from the left, speaker tag, typewriter text (about 38 characters a second).
 * Click / tap / Enter completes the text; SKIP leaves at once; CONTINUE fades in when the text is done.
 * The shift clock is paused on every story screen (Station2 only runs it while a module is on screen). No audio.
 */
export default function StoryScreen({ beat, extra = NO_EXTRA, onContinue }: Props) {
  const paragraphs = useMemo(() => [...beat.paragraphs, ...extra], [beat, extra]);
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length + GAP_CHARS, 0), [paragraphs]);
  const reduced = useMemo(reducedMotion, []);
  const [budget, setBudget] = useState(() => (reduced ? Infinity : 0));
  const [imgOk, setImgOk] = useState(true);
  const startedAt = useRef(0);
  const doneRef = useRef(reduced);
  const continueBtn = useRef<HTMLButtonElement | null>(null);

  // typewriter clock: timestamp driven, so a throttled tab still finishes on time
  useEffect(() => {
    if (reduced) return undefined;
    startedAt.current = performance.now();
    const id = window.setInterval(() => {
      const n = ((performance.now() - startedAt.current) / 1000) * CPS;
      setBudget((prev) => Math.max(prev, n)); // never moves back after a click completed the text
      if (n >= total) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [reduced, total]);

  // how much of each paragraph is visible
  let left = budget;
  const shown = paragraphs.map((p) => {
    const take = Math.max(0, Math.min(p.length, Math.floor(left)));
    left -= p.length + GAP_CHARS;
    return take;
  });
  const done = budget >= total - GAP_CHARS;
  const active = shown.findIndex((n, i) => n < paragraphs[i].length);

  useEffect(() => {
    doneRef.current = done;
    if (done) continueBtn.current?.focus();
  }, [done]);

  const complete = useCallback(() => setBudget(Infinity), []);
  // Enter / Space completes the text while it is typing (once done, the focused CONTINUE button takes Enter itself)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !doneRef.current) {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [complete]);

  return (
    <div
      className={`ws2-story ws2-story--${beat.tone}`}
      data-beat={beat.id}
      onClick={() => {
        if (!doneRef.current) complete();
      }}
    >
      <div className="ws2-story__fallback" aria-hidden />
      {imgOk && (
        <img
          className="ws2-story__img" src={storyImage(beat.image)} alt="" draggable={false} onError={() => setImgOk(false)}
          style={{ objectPosition: beat.focus, transform: beat.shift ? `translateX(${beat.shift}%)` : undefined }}
        />
      )}
      <div className="ws2-story__shade" aria-hidden />
      <div className="ws2-story__hud" aria-hidden>
        <span className="ws2-story__feed"><i /> {beat.feed}</span>
      </div>

      <div className="ws2-story__col">
        <div className={`ws2-story__tag ws2-story__tag--${beat.tone}`}>{beat.tag}</div>
        <div className="ws2-story__text" aria-live="off">
          {paragraphs.map((p, i) =>
            shown[i] > 0 || i === active ? (
              <p key={i} className={i === active || (done && i === paragraphs.length - 1) ? 'is-new' : ''}>
                {p.slice(0, shown[i])}
                {(i === active || (done && i === paragraphs.length - 1)) && <span className="ws2-story__cursor" aria-hidden />}
              </p>
            ) : null,
          )}
        </div>
        {/* the full text is always available to screen readers */}
        <p className="ws2-sr">{paragraphs.join(' ')}</p>
      </div>

      <div className="ws2-story__foot" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ws2-story__skip" onClick={onContinue}>SKIP ▸▸</button>
        <button ref={continueBtn} type="button" className={`ws2-story__go ${done ? 'is-on' : ''}`} onClick={onContinue} tabIndex={done ? 0 : -1} aria-hidden={!done}>
          CONTINUE ▸
        </button>
      </div>
      {!done && <div className="ws2-story__hint" aria-hidden>CLICK · TAP · ENTER TO FINISH THE TEXT</div>}
    </div>
  );
}
