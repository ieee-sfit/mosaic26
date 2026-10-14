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
  const [stationIdx, setStationIdx] = useState(0)

  const STATIONS_INFO = [
    { code: 'ST-01', name: 'GOAT ANC', sector: 'MILANO BRIDGE // COSMIC TOKAMAK', color: '#00f2fe' },
    { code: 'ST-02', name: 'F1 0-LAG STREAM', sector: 'LE MANS // PIT WALL', color: '#dc2626' },
    { code: 'ST-03', name: 'eCHALLAN TRACE', sector: 'TOKYO-MIDNIGHT // EXPRESSWAY', color: '#facc15' },
    { code: 'ST-04', name: 'AREA 51 MELTDOWN', sector: 'CARDIFF // QUARANTINE AIRLOCK', color: '#22c55e' },
  ]

  // Initialize Three.js 3D canvas
  useEffect(() => {
    if (!containerRef.current) return
    const scene = initSplashScene(containerRef.current, (nextIdx) => {
      setStationIdx(nextIdx)
    })
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

  const curStation = STATIONS_INFO[stationIdx] || STATIONS_INFO[0]

  return (
    <div className="cfs-root" onClick={(e) => {
      // Allow clicking the 3D canvas to engage
      if (e.target.closest('button')) return
      handleEngage()
    }}>
      {/* Three.js 3D Viewport */}
      <div ref={containerRef} className="cfs-canvas" />

      {/* Retro Sci-Fi CRT Texture Layers */}
      <div className="cfs-scanlines" />
      <div className="cfs-vignette" />

      {/* Interactive HUD Overlay */}
      <div className="cfs-hud">
        {/* Top Header */}
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

        {/* Top Floating Logo Banner (Pinned above the cube) */}
        <div className="cfs-top-banner">
          <img
            src="/ctrlfreak_logo.png"
            alt="CtrlFreak: Critical Point"
            className="cfs-logo-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="cfs-sector-indicator" style={{ '--accent-color': curStation.color }}>
            <span className="cfs-sector-dot" />
            <span className="cfs-sector-code">{curStation.code}</span>
            <span className="cfs-sector-sep">//</span>
            <span className="cfs-sector-name">{curStation.name}</span>
            <span className="cfs-sector-loc">({curStation.sector})</span>
          </div>
        </div>

        {/* Bottom Floating Prompt: Press Space or Click */}
        <div className="cfs-bottom-dock" onClick={handleEngage} role="button" tabIndex={0}>
          <div className="cfs-engage-pill" style={{ '--accent-color': curStation.color }}>
            <span className="cfs-key-badge">SPACE</span>
            <span className="cfs-engage-text">PRESS SPACE TO ENGAGE</span>
          </div>
          <span className="cfs-cta-hint">OR CLICK ANYWHERE TO ENTER TERMINAL</span>
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
