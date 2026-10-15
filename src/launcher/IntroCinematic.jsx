import { useEffect, useRef, useState } from 'react'
import './introCinematic.css'

export default function IntroCinematic({ onComplete }) {
  const [fadingOut, setFadingOut] = useState(false)
  const ieeeVideoRef = useRef(null)
  const wieVideoRef = useRef(null)

  const handleFinish = () => {
    if (fadingOut) return
    setFadingOut(true)
    setTimeout(() => {
      onComplete?.()
    }, 650)
  }

  // Allow ESC, Space, or Enter to skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault()
        handleFinish()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fadingOut])

  // When the longer video (IEEE ~5.6s) finishes, pause a moment on resolved logos, then fade into splash
  const handleIeeeEnded = () => {
    setTimeout(() => {
      handleFinish()
    }, 600)
  }

  return (
    <div
      className={`cfs-intro-root ${fadingOut ? 'is-fading-out' : ''}`}
      onClick={handleFinish}
      role="banner"
    >
      {/* Background Ambience */}
      <div className="cfs-intro-scanlines" />
      <div className="cfs-intro-vignette" />

      {/* Top Header */}
      <header className="cfs-intro-header">
        <div className="cfs-intro-brand">
          <span>MOSAIC<b>//26</b></span>
          <span className="cfs-intro-sep">·</span>
          <span>PRESENTED BY</span>
        </div>

        <button
          type="button"
          className="cfs-intro-skip-btn"
          onClick={(e) => {
            e.stopPropagation()
            handleFinish()
          }}
        >
          [ SKIP INTRO → ]
        </button>
      </header>

      {/* Center Side-by-Side Arena */}
      <div className="cfs-intro-center">
        {/* IEEE SFIT Animation */}
        <div className="cfs-intro-panel cfs-panel-ieee">
          <div className="cfs-intro-video-box">
            <video
              ref={ieeeVideoRef}
              src="/intro/ieee_animation.mp4"
              autoPlay
              muted
              playsInline
              onEnded={handleIeeeEnded}
              className="cfs-intro-video"
            />
          </div>
          <div className="cfs-intro-label">
            <span className="cfs-intro-dot cfs-dot-cyan" />
            <span>IEEE SFIT STUDENT BRANCH</span>
          </div>
        </div>

        {/* The Collaboration X Symbol */}
        <div className="cfs-intro-cross-wrap">
          <span className="cfs-intro-cross">×</span>
          <span className="cfs-intro-collab-sub">COLLABORATION</span>
        </div>

        {/* IEEE WIE Animation */}
        <div className="cfs-intro-panel cfs-panel-wie">
          <div className="cfs-intro-video-box">
            <video
              ref={wieVideoRef}
              src="/intro/wie_animation.mp4"
              autoPlay
              muted
              playsInline
              className="cfs-intro-video"
            />
          </div>
          <div className="cfs-intro-label">
            <span className="cfs-intro-dot cfs-dot-purple" />
            <span>IEEE WIE AFFINITY GROUP</span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Hint */}
      <footer className="cfs-intro-footer">
        <span>CLICK ANYWHERE OR PRESS <b>[SPACE]</b> TO ENTER</span>
      </footer>
    </div>
  )
}
