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

const THEMES = [
  {
    id: 1,
    name: 'COSMIC TOKAMAK',
    code: 'SECTOR-01',
    accent: '#00f2fe',
    rgb: '0, 242, 254',
    image: '/launcher/parallax/theme_tokamak.jpg',
    pitch: 520,
  },
  {
    id: 2,
    name: '0-LAG STREAM',
    code: 'SECTOR-02',
    accent: '#dc2626',
    rgb: '220, 38, 38',
    image: '/launcher/parallax/theme_racing.jpg',
    pitch: 440,
  },
  {
    id: 3,
    name: 'FORENSIC TRACE',
    code: 'SECTOR-03',
    accent: '#facc15',
    rgb: '250, 204, 21',
    image: '/launcher/parallax/theme_forensic.jpg',
    pitch: 580,
  },
  {
    id: 4,
    name: 'MELTDOWN AIRLOCK',
    code: 'SECTOR-04',
    accent: '#22c55e',
    rgb: '34, 197, 94',
    image: '/launcher/parallax/theme_meltdown.jpg',
    pitch: 370,
  },
]

export default function CtrlFreakSplash({ onEnterTerminal, onOpenLeaderboard }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [themeIdx, setThemeIdx] = useState(0)
  const [isWarping, setIsWarping] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  // Trigger quick micro-glitch burst on theme change
  const triggerGlitchBurst = useCallback(() => {
    setIsGlitching(true)
    const t = setTimeout(() => setIsGlitching(false), 340)
    return () => clearTimeout(t)
  }, [])

  // Auto-cycle through the 4 themes every 5.5s
  useEffect(() => {
    if (isWarping) return
    const timer = setInterval(() => {
      setThemeIdx((prev) => {
        const next = (prev + 1) % THEMES.length
        triggerGlitchBurst()
        sceneRef.current?.setThemeColor(THEMES[next].accent)
        return next
      })
    }, 5500)
    return () => clearInterval(timer)
  }, [isWarping, triggerGlitchBurst])

  // Mouse move listener for letter interior parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      setMouse({ x: nx, y: ny })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Initialize Three.js 3D canvas
  useEffect(() => {
    if (!containerRef.current) return
    const scene = initSplashScene(containerRef.current)
    sceneRef.current = scene

    // Initial ambient core tint
    scene.setThemeColor(THEMES[0].accent)

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

  // Keyboard controls: [Space] or [Enter] to engage, [1..4] to switch theme
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isWarping) return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleEngage()
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const id = parseInt(e.code.replace('Digit', ''), 10)
        const idx = id - 1
        if (idx >= 0 && idx < THEMES.length) {
          setThemeIdx(idx)
          triggerGlitchBurst()
          sceneRef.current?.setThemeColor(THEMES[idx].accent)
          playSectorHoverSfx(THEMES[idx].pitch)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isWarping, themeIdx, triggerGlitchBurst])

  const curTheme = THEMES[themeIdx] || THEMES[0]

  return (
    <div
      className={`cfs-root ${isWarping ? 'is-warping' : ''}`}
      onClick={(e) => {
        if (e.target.closest('button')) return
        handleEngage()
      }}
    >
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
            <span
              className="cfs-status-pill"
              style={{
                borderColor: `rgba(${curTheme.rgb}, 0.5)`,
                color: curTheme.accent,
              }}
            >
              <span
                className="cfs-status-dot"
                style={{
                  background: curTheme.accent,
                  boxShadow: `0 0 10px ${curTheme.accent}`,
                }}
              />
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

        {/* Center Stage: Parallax-Masked Logo + Camera Zoom Dive + Single Direct CTA */}
        <div className="cfs-center">
          <div
            className={`cfs-logo-stage ${isWarping ? 'is-warping-dive' : ''} ${isGlitching ? 'is-glitching' : ''}`}
            style={{
              '--accent-color': curTheme.accent,
              '--accent-rgb': curTheme.rgb,
            }}
          >
            {/* The Stencil Mask Portal: Logo cutout reveals multi-layer interior parallax */}
            <div className="cfs-logo-mask-portal">
              {/* Layer 1: Background Thematic Chamber Texture */}
              <div
                className="cfs-portal-layer cfs-layer-bg"
                style={{
                  backgroundImage: `url(${curTheme.image})`,
                  transform: `translate3d(${mouse.x * 12}px, ${mouse.y * 8}px, 0) scale(1.18)`,
                }}
              />

              {/* Layer 2: Midground Glowing Thematic Details with extra saturation */}
              <div
                className="cfs-portal-layer cfs-layer-mid"
                style={{
                  backgroundImage: `url(${curTheme.image})`,
                  transform: `translate3d(${mouse.x * 24}px, ${mouse.y * 16}px, 0) scale(1.36)`,
                }}
              />

              {/* Layer 3: Foreground Optical Flares & Laser Grid Stream */}
              <div
                className="cfs-portal-layer cfs-layer-fore"
                style={{
                  transform: `translate3d(${mouse.x * 40}px, ${mouse.y * 28}px, 0) scale(1.52)`,
                }}
              />

              {/* Subtle Horizontal Glitch Jitter Slice */}
              {isGlitching && <div className="cfs-portal-glitch-slice" />}
            </div>

            {/* Logo Rim Overlay: Crisp chrome highlights & metallic letter contours */}
            <img
              src="/ctrlfreak_logo.png"
              alt="CtrlFreak: Critical Point"
              className="cfs-logo-overlay"
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
            style={{
              '--accent-color': curTheme.accent,
              '--accent-rgb': curTheme.rgb,
            }}
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
