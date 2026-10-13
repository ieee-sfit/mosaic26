import { useEffect, useRef, useState } from 'react'
import { fillScene } from './script'
import { cue, setAmbience, setMusic, setMuted, speakLines, stopVoice, unlockAudio } from './soundscape'
import './cinematic.css'

export default function Cinematic({ sceneId, tokens, muted, onMute, onDone, gateStart }) {
  const scene = fillScene(sceneId, tokens)
  const [line, setLine] = useState(0)
  const [ready, setReady] = useState(!gateStart)
  const [broken, setBroken] = useState(false)
  const doneOnce = useRef(false)
  const skipRef = useRef(null)
  const muteRef = useRef(muted)
  muteRef.current = muted
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    doneOnce.current = false
    setLine(0)
    setBroken(false)
    setReady(!gateStart)
  }, [sceneId, gateStart])

  useEffect(() => {
    if (!scene || !ready) {
      skipRef.current = () => {
        if (!doneOnce.current) {
          doneOnce.current = true
          onDoneRef.current?.()
        }
      }
      return undefined
    }
    unlockAudio()
    setMusic(scene.music)
    setAmbience(scene.amb)
    if (scene.enterSfx) cue(scene.enterSfx)
    let hold = 0
    const stop = speakLines(scene.lines, {
      getMuted: () => muteRef.current,
      onLine: setLine,
      onDone: () => {
        hold = window.setTimeout(() => {
          if (!doneOnce.current) {
            doneOnce.current = true
            onDoneRef.current?.()
          }
        }, scene.holdMs ?? 600)
      },
    })
    skipRef.current = () => {
      stop()
      window.clearTimeout(hold)
      stopVoice()
      if (!doneOnce.current) {
        doneOnce.current = true
        onDoneRef.current?.()
      }
    }
    return () => {
      stop()
      window.clearTimeout(hold)
    }
  }, [sceneId, ready])

  if (!scene) return null

  const start = () => {
    unlockAudio()
    setReady(true)
  }

  return (
    <div className={`mz-cine mz-cine--${scene.ken} ${scene.id === 'escape' ? 'is-exit' : ''} ${scene.alert ? 'is-alert' : ''} ${scene.celebrate ? 'is-win' : ''} ${scene.info ? 'is-info' : ''}`}>
      <div className="mz-cine-stage" aria-hidden="true">
        {scene.src && !broken ? (
          <img
            className="mz-cine-art"
            src={scene.src}
            alt=""
            onError={() => setBroken(true)}
          />
        ) : (
          <div className={`mz-cine-fallback mz-cine-fallback--${scene.art || 'void'}`} />
        )}
        <div className="mz-cine-grade" />
        <div className="mz-cine-scan" />
        {scene.alert && <div className="mz-cine-flash" />}
        {scene.celebrate && <div className="mz-cine-sparks" />}
      </div>

      <div className="mz-cine-copy">
        {scene.kicker && <p className="mz-cine-kicker">{scene.kicker}</p>}
        <h1 className="mz-cine-title">{scene.title}</h1>
        {scene.subtitle ? <p className="mz-cine-sub">{scene.subtitle}</p> : null}
        {scene.info && (
          <div className="mz-cine-dir" aria-hidden="true">
            <span>WORKSTATION 4</span>
            <i />
          </div>
        )}
      </div>

      {ready && (
        <p className="mz-cine-cap" aria-live="polite">
          {scene.lines[Math.min(line, scene.lines.length - 1)]}
        </p>
      )}

      <div className="mz-cine-bar">
        <button type="button" className="mz-btn mz-btn-ghost" onClick={() => onMute?.(!muted)}>
          {muted ? '[ UNMUTE ]' : '[ MUTE ]'}
        </button>
        <button
          type="button"
          className="mz-btn mz-btn-amber"
          onClick={() => { unlockAudio(); skipRef.current?.() }}
        >
          {scene.info ? '[ CONTINUE ]' : '[ SKIP CINEMATIC ]'}
        </button>
      </div>

      {!ready && (
        <div className="mz-cine-gate">
          <p>Audio requires a click in this browser.</p>
          <button type="button" className="mz-btn mz-btn-green mz-big" onClick={start}>
            [ START EXPERIENCE ]
          </button>
        </div>
      )}
    </div>
  )
}

export function CineDock({ muted, onMute }) {
  return (
    <button type="button" className="mz-cine-dock" onClick={() => { unlockAudio(); onMute?.(!muted) }}>
      {muted ? 'AUDIO OFF' : 'AUDIO ON'}
    </button>
  )
}
