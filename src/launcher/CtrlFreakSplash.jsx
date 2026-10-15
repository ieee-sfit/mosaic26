import { useEffect, useRef, useState } from 'react'
import { initSplashScene } from './splashScene'
import {
  playWarpEngageSfx,
  setSplashMuted,
  startAmbientDrone,
  stopAmbientDrone,
} from './splashAudio'
import './ctrlFreakSplash.css'

export default function CtrlFreakSplash({ onEnterTerminal, onOpenLeaderboard }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [isWarping, setIsWarping] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  // Initialize Three.js 3D canvas
  useEffect(() => {
    if (!containerRef.current) return
    const scene = initSplashScene(containerRef.current)
    sceneRef.current = scene

    const handleFirstTouch = () => {
      startAmbientDrone()
      window.removeEventListener('pointerdown', handleFirstTouch)
      window.removeEventListener('keydown', handleFirstTouch)
    }
    window.addEventListener('pointerdown', handleFirstTouch)
    window.addEventListener('keydown', handleFirstTouch)

    return () => {
      window.removeEventListener('pointerdown', handleFirstTouch)
      window.removeEventListener('keydown', handleFirstTouch)
      stopAmbientDrone()
      scene.dispose()
    }
  }, [])

  const toggleAudio = () => {
    const next = !audioMuted
    setAudioMuted(next)
    setSplashMuted(next)
  }

  // Trigger Warp Dive into Terminal
  const handleEngage = () => {
    if (isWarping) return
    setIsWarping(true)
    playWarpEngageSfx()
    stopAmbientDrone()

    sceneRef.current?.triggerWarp(() => {
      onEnterTerminal?.()
    })
  }

  // Keyboard controls: [Space] or [Enter] to engage
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isWarping) return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleEngage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isWarping])

  return (
    <div className="cfs-root">
      {/* Three.js 3D Viewport */}
      <div ref={containerRef} className="cfs-canvas" />

      {/* Retro Sci-Fi CRT Texture Layers */}
      <div className="cfs-scanlines" />
      <div className="cfs-vignette" />

      {/* Interactive HUD Overlay */}
      <div className="cfs-hud">
        {/* Header */}
        <header className="cfs-header">
          <div className="cfs-brand">
            <span>MOSAIC<b>//26</b></span>
            <span>·</span>
            <span>TECHNICAL ARENA</span>
            <span className="cfs-status-pill">
              <span className="cfs-status-dot" />
              SYSTEM ALERT // 87% CRITICAL
            </span>
          </div>

          <div className="cfs-header-actions">
            <button
              type="button"
              className="cfs-btn-ghost"
              onClick={toggleAudio}
              aria-label="Toggle Audio"
            >
              {audioMuted ? '[ AUDIO: OFF ]' : '[ AUDIO: ON ]'}
            </button>
            <button
              type="button"
              className="cfs-btn-ghost"
              onClick={onOpenLeaderboard}
            >
              [ PUBLIC TELEMETRY / LEADERBOARD ]
            </button>
          </div>
        </header>

        {/* Center Stage: Logo + Single Direct CTA */}
        <div className="cfs-center">
          <div className="cfs-logo-wrap">
            <img
              src="/ctrlfreak_logo.png"
              alt="CtrlFreak: Critical Point"
              className="cfs-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          <p className="cfs-subtitle">
            FOUR CRITICAL SECTORS UNDER EMERGENCY PROTOCOL.
            <br />
            12-MINUTE CONTAINMENT WINDOW.
          </p>

          <button
            type="button"
            className="cfs-cta"
            onClick={handleEngage}
          >
            <span>[ CHOOSE STATION → ]</span>
          </button>
          <span className="cfs-cta-hint">PRESS [SPACE] OR CLICK TO ENTER TERMINAL</span>
        </div>

        {/* Minimal Footer */}
        <footer className="cfs-footer">
          <span>IEEE SFIT STUDENT BRANCH × IEEE WIE AFFINITY GROUP</span>
          <div className="cfs-footer-logos">
            <img
              src="/committee_logo.png"
              alt="IEEE x WIE"
              className="cfs-comm-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </footer>
      </div>
    </div>
  )
}
