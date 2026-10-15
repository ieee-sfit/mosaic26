import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORY_FONT, storyImage, type StoryBeat } from '../story/story';

interface Props {
  beat: StoryBeat;
  /** Paragraphs appended after the beat's own text (e.g. the Module D line on the success ending). */
  extra?: string[];
  onContinue: () => void;
}

/** Characters revealed per second, and the pause between paragraphs (counted in characters). */
const CPS = 38;
const GAP_CHARS = 14;

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Makes sure the station's story typeface is on the page (the rest of the app already loads Google Fonts the same way). */
function useStoryFont() {
  useEffect(() => {
    if (document.getElementById('goat-story-font')) return;
    const link = document.createElement('link');
    link.id = 'goat-story-font';
    link.rel = 'stylesheet';
    link.href = STORY_FONT.href;
    document.head.appendChild(link);
  }, []);
}

/**
 * Full-screen story beat: picture, dark gradient from the left, speaker tag, typewriter text.
 * Click / tap / Enter completes the text; SKIP leaves at once; CONTINUE fades in when the text is done.
 * The shift clock is paused on every story screen (GoatAnc only arms it on module phases).
 */
const NO_EXTRA: string[] = [];

export function StoryScreen({ beat, extra = NO_EXTRA, onContinue }: Props) {
  useStoryFont();
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
      className={`story story--${beat.tone}`}
      style={{ ['--story-font' as string]: STORY_FONT.family, ['--story-tag-font' as string]: STORY_FONT.tagFamily }}
      onClick={() => {
        if (!doneRef.current) complete();
      }}
    >
      <div className="story-fallback" aria-hidden />
      {imgOk && <img className="story-img" src={storyImage(beat.image)} alt="" draggable={false} onError={() => setImgOk(false)} />}
      <div className="story-shade" aria-hidden />
      <div className="story-hud" aria-hidden>
        <span className="story-feed">
          <i /> {beat.feed}
        </span>
      </div>

      <div className="story-col">
        <div className={`story-tag story-tag--${beat.tone}`}>{beat.tag}</div>
        <div className="story-text" aria-live="off">
          {paragraphs.map((p, i) =>
            shown[i] > 0 || i === active ? (
              <p key={i} className={i === active || (done && i === paragraphs.length - 1) ? 'is-new' : ''}>
                {p.slice(0, shown[i])}
                {(i === active || (done && i === paragraphs.length - 1)) && <span className="story-cursor" aria-hidden />}
              </p>
            ) : null,
          )}
        </div>
        {/* the full text is always available to screen readers */}
        <p className="sr-only">{paragraphs.join(' ')}</p>
      </div>

      <div className="story-foot" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="story-skip" onClick={onContinue}>
          SKIP ▸▸
        </button>
        <button ref={continueBtn} type="button" className={`story-go ${done ? 'is-on' : ''}`} onClick={onContinue} tabIndex={done ? 0 : -1} aria-hidden={!done}>
          CONTINUE ▸
        </button>
      </div>
      {!done && <div className="story-hint" aria-hidden>CLICK · TAP · ENTER TO FINISH THE TEXT</div>}
    </div>
  );
}
