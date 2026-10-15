import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { storyImage } from './story'
import './story.css'

/** Characters revealed per second (35-40), and the pause between paragraphs (counted in characters). */
const CPS = 38
const GAP_CHARS = 4
const NO_EXTRA = []

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Full-screen story beat: picture, dark gradient from the left, speaker tag, typewriter text with a blinking cursor and a
 * subtle scan-line flicker. Click / tap / Enter completes the text; SKIP leaves at once; CONTINUE fades in when the text is
 * done. prefers-reduced-motion shows the whole text at once. No audio. The shift clock is paused on every story screen.
 */
export default function StoryScreen({ beat, extra = NO_EXTRA, onContinue }) {
  const paragraphs = useMemo(() => [...beat.paragraphs, ...extra], [beat, extra])
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length + GAP_CHARS, 0), [paragraphs])
  const [reduced] = useState(reducedMotion)
  const [budget, setBudget] = useState(() => (reduced ? Infinity : 0))
  const [imgOk, setImgOk] = useState(true)
  const startedAt = useRef(0)
  const doneRef = useRef(reduced)
  const continueBtn = useRef(null)

  // typewriter clock: timestamp driven, so a throttled tab still finishes on time
  useEffect(() => {
    if (reduced) return undefined
    startedAt.current = performance.now()
    const id = window.setInterval(() => {
      const n = ((performance.now() - startedAt.current) / 1000) * CPS
      setBudget((prev) => Math.max(prev, n)) // never moves back after a click completed the text
      if (n >= total) window.clearInterval(id)
    }, 30)
    return () => window.clearInterval(id)
  }, [reduced, total])

  // how much of each paragraph is visible
  let left = budget
  const shown = paragraphs.map((p) => {
    const take = Math.max(0, Math.min(p.length, Math.floor(left)))
    left -= p.length + GAP_CHARS
    return take
  })
  const done = budget >= total - GAP_CHARS
  const active = shown.findIndex((n, i) => n < paragraphs[i].length)

  useEffect(() => {
    doneRef.current = done
    if (done) continueBtn.current?.focus()
  }, [done])

  const complete = useCallback(() => setBudget(Infinity), [])
  // Enter / Space completes the text while it is typing (once done, the focused CONTINUE button takes Enter itself)
  useEffect(() => {
    const key = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !doneRef.current) {
        e.preventDefault()
        complete()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [complete])

  return (
    <div
      className={`mz-story mz-story--${beat.tone}`}
      data-story={beat.id}
      data-done={done ? '1' : '0'}
      style={{ '--shade': beat.shade }}
      onClick={() => { if (!doneRef.current) complete() }}
    >
      <div className="mz-story-fallback" aria-hidden="true" />
      {imgOk && <img className="mz-story-img" src={storyImage(beat.image)} alt="" draggable={false} style={{ objectPosition: beat.focus }} onError={() => setImgOk(false)} />}
      <div className="mz-story-shade" aria-hidden="true" />
      <div className="mz-story-flicker" aria-hidden="true" />

      <div className="mz-story-col">
        <div className={`mz-story-tag mz-story-tag--${beat.tone}`}>{beat.tag}</div>
        <div className="mz-story-text" aria-live="off">
          {paragraphs.map((p, i) => {
            const cursor = i === active || (done && i === paragraphs.length - 1)
            return shown[i] > 0 || i === active ? (
              <p key={i} className={cursor ? 'is-new' : ''}>
                {p.slice(0, shown[i])}
                {cursor && <span className="mz-story-cursor" aria-hidden="true" />}
              </p>
            ) : null
          })}
        </div>
        {/* the full text is always available to screen readers */}
        <p className="mz-sr">{paragraphs.join(' ')}</p>
      </div>

      <div className="mz-story-foot" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mz-story-skip" onClick={onContinue} data-story-skip>SKIP ▸▸</button>
        <button ref={continueBtn} type="button" className={`mz-story-go ${done ? 'is-on' : ''}`} onClick={onContinue} tabIndex={done ? 0 : -1} aria-hidden={!done} data-story-continue>
          CONTINUE ▸
        </button>
      </div>
      {!done && <div className="mz-story-hint" aria-hidden="true">CLICK · TAP · ENTER TO FINISH THE TEXT</div>}
    </div>
  )
}
