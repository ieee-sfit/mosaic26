import { useEffect, useRef, useState, useCallback } from 'react'
import { initSplashScene } from './splashScene'
import {
  playSectorHoverSfx,
  playWarpEngageSfx,
  setSplashMuted,
  startAmbientDrone,
  stopAmbientDrone,
} from './splashAudio'
import './ctrlFreakSplash.css'

const SECTORS = [
  {
    id: 1,
    code: 'ST-01',
    name: 'GOAT ANC',
    universe: 'GUARDIANS OF THE GALAXY',
    theme: 'Cosmic Tokamak // Acoustics',
    sub: 'Magnetic Containment Core',
    accent: '#00f2fe',
    rgb: '0, 242, 254',
    image: '/launcher/cubes/st1.jpg',
    pitch: 520,
  },
  {
    id: 2,
    code: 'ST-02',
    name: 'F1 0-LAG STREAM',
    universe: 'FORD v FERRARI',
    theme: 'Le Mans Pit Wall // CDN Telemetry',
    sub: 'Route, Telemetry & Data Flow',
    accent: '#dc2626',
    rgb: '220, 38, 38',
    image: '/launcher/cubes/st2.jpg',
    pitch: 440,
  },
  {
    id: 3,
    code: 'ST-03',
    name: 'eCHALLAN TRACE',
    universe: 'BABY DRIVER',
    theme: 'Tokyo Midnight // Radar ANPR',
    sub: 'Forensic License Reconstruction',
    accent: '#facc15',
    rgb: '250, 204, 21',
    image: '/launcher/cubes/st3.jpg',
    pitch: 580,
  },
  {
    id: 4,
    code: 'ST-04',
    name: 'AREA 51 MELTDOWN',
    universe: 'WORLD WAR Z',
    theme: 'Cardiff Airlock // Logic Containment',
    sub: 'Containment Corridor & Escape',
    accent: '#22c55e',
    rgb: '34, 197, 94',
    image: '/launcher/cubes/st4.jpg',
    pitch: 370,
  },
]

export default function CtrlFreakSplash({ onEnterTerminal, onOpenLeaderboard }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [activeSectorId, setActiveSectorId] = useState(1)
  const [isGlitching, setIsGlitching] = useState(false)
  const [isWarping, setIsWarping] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [isUserHovering, setIsUserHovering] = useState(false)

  // Trigger a brief 350ms glitch burst
  const triggerGlitchBurst = useCallback(() => {
    setIsGlitching(true)
    const t = setTimeout(() => setIsGlitching(false), 380)
    return () => clearTimeout(t)
  }, [])

  // Auto-cycle through the 4 station themes when user is idle
  useEffect(() => {
    if (isUserHovering || isWarping) return
    const timer = setInterval(() => {
      setActiveSectorId((prev) => {
        const next = prev >= 4 ? 1 : prev + 1
        triggerGlitchBurst()
        const sec = SECTORS.find((s) => s.id === next)
        if (sec && sceneRef.current) {
          sceneRef.current.setStationColor(sec.accent)
        }
        return next
      })
    }, 4800)
    return () => clearInterval(timer)
  }, [isUserHovering, isWarping, triggerGlitchBurst])

  // Initialize Three.js particle canvas
  useEffect(() => {
    if (!containerRef.current) return
    const scene = initSplashScene(containerRef.current)
    sceneRef.current = scene

    // Initial scene light tint to sector 1
    scene.setStationColor(SECTORS[0].accent)

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

  // Focus a sector on hover
  const handleSectorHover = (sec) => {
    if (isWarping) return
    setIsUserHovering(true)
    if (sec.id !== activeSectorId) {
      setActiveSectorId(sec.id)
      triggerGlitchBurst()
      sceneRef.current?.setStationColor(sec.accent)
      playSectorHoverSfx(sec.pitch)
    }
  }

  const handleSectorMouseLeave = () => {
    setIsUserHovering(false)
  }

  // Trigger Warp Dive into Terminal
  const handleEngage = (stationId = activeSectorId) => {
    if (isWarping) return
    setIsWarping(true)
    playWarpEngageSfx()
    stopAmbientDrone()

    sceneRef.current?.triggerWarp(() => {
      onEnterTerminal?.(stationId)
    })
  }

  // Keyboard controls: [Space] or [Enter] to engage, [1..4] for station selection
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isWarping) return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleEngage(activeSectorId)
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const id = parseInt(e.code.replace('Digit', ''), 10)
        const sec = SECTORS.find((s) => s.id === id)
        if (sec) {
          setActiveSectorId(sec.id)
          triggerGlitchBurst()
          sceneRef.current?.setStationColor(sec.accent)
          playSectorHoverSfx(sec.pitch)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSectorId, isWarping, triggerGlitchBurst])

  const curSector = SECTORS.find((s) => s.id === activeSectorId) || SECTORS[0]

  return (
    <div
      className={`cfs-root ${isWarping ? 'is-warping' : ''}`}
      onClick={(e) => {
        // Clicking outside interactive buttons/cards engages warp
        if (e.target.closest('button') || e.target.closest('.cfs-sector-card')) return
        handleEngage(curSector.id)
      }}
    >
      {/* 3D Volumetric Particle Canvas */}
      <div ref={containerRef} className="cfs-canvas" />

      {/* CRT Scanline and Vignette Atmospheric Overlays */}
      <div className="cfs-scanlines" />
      <div className="cfs-vignette" />

      {/* HUD Content Layer */}
      <div className="cfs-hud">
        {/* Top Navigation / Brand Bar */}
        <header className="cfs-header">
          <div className="cfs-brand">
            <span>MOSAIC<b>//26</b></span>
            <span className="cfs-sep">·</span>
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

        {/* Center Hero: CTRLFREAK Title with Thematic Image Fill & Subtle Glitch */}
        <div className="cfs-center">
          <div className="cfs-kicker-wrap">
            <span className="cfs-kicker-dot" style={{ background: curSector.accent }} />
            <span className="cfs-kicker">MOSAIC &apos;26 // EMERGENCY MULTIVERSE TRIAGE SIMULATION</span>
          </div>

          <div
            className="cfs-title-wrapper"
            onMouseEnter={triggerGlitchBurst}
            role="banner"
          >
            <h1
              className={`cfs-glitch-title ${isGlitching ? 'is-bursting' : ''}`}
              data-text="CTRL-FREAK"
              style={{
                '--cfs-bg-image': `url(${curSector.image})`,
                '--cfs-accent': curSector.accent,
                '--cfs-accent-rgb': curSector.rgb,
              }}
            >
              CTRL-FREAK
            </h1>
          </div>

          {/* Subtitle with High-Tech Status HUD */}
          <div className="cfs-sub-banner" style={{ '--accent-color': curSector.accent }}>
            <span className="cfs-sub-bracket">[</span>
            <span className="cfs-subtitle-strong">CRITICAL POINT</span>
            <span className="cfs-sub-bracket">]</span>
            <span className="cfs-sub-sep">//</span>
            <span className="cfs-active-station-badge">
              <span className="cfs-badge-dot" />
              <span className="cfs-badge-code">{curSector.code}</span>
              <span className="cfs-badge-name">{curSector.name}</span>
              <span className="cfs-badge-theme">({curSector.sub})</span>
            </span>
          </div>

          <p className="cfs-tagline">
            FOUR CRITICAL SYSTEM FAILURES DETECTED. ZERO CODE BARRIERS. 12-MINUTE TIMEOUT ENFORCED.
          </p>

          {/* Primary Action Button */}
          <div className="cfs-actions-row">
            <button
              type="button"
              className="cfs-cta-primary"
              style={{ '--accent-color': curSector.accent, '--accent-rgb': curSector.rgb }}
              onClick={() => handleEngage(curSector.id)}
            >
              <span className="cfs-cta-glare" />
              <span className="cfs-key-pill">SPACE</span>
              <span className="cfs-cta-label">OVERRIDE TERMINAL // ENTER ARENA</span>
              <span className="cfs-cta-arrow">→</span>
            </button>
          </div>

          <div className="cfs-quick-hint">
            <span>PRESS <b>[SPACE]</b> OR CLICK ANYWHERE TO INITIALIZE</span>
          </div>
        </div>

        {/* Bottom Dock: 4 Sector Switcher Cards & Footer */}
        <div className="cfs-bottom">
          <div
            className="cfs-sectors-dock"
            onMouseLeave={handleSectorMouseLeave}
          >
            {SECTORS.map((sec) => {
              const isSelected = curSector.id === sec.id
              return (
                <div
                  key={sec.id}
                  className={`cfs-sector-card ${isSelected ? 'is-active' : ''}`}
                  style={{
                    '--c-accent': sec.accent,
                    '--c-rgb': sec.rgb,
                  }}
                  onMouseEnter={() => handleSectorHover(sec)}
                  onClick={() => handleEngage(sec.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cfs-sec-top">
                    <span className="cfs-sec-code">{sec.code}</span>
                    <span className="cfs-sec-class">{sec.universe}</span>
                  </div>
                  <h3 className="cfs-sec-name">{sec.name}</h3>
                  <span className="cfs-sec-sub">{sec.theme}</span>
                  <div className="cfs-sec-status">
                    <span className="cfs-sec-status-dot" />
                    <span>{isSelected ? 'ACTIVE THEME' : 'SELECT THEME'}</span>
                  </div>
                </div>
              )
            })}
          </div>

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
    </div>
  )
}
