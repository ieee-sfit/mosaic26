import { useEffect, useRef } from 'react'

const VIALS = 8

/**
 * Top-down centrifuge. `engaged` = clamps snapped in (0-8), `speed` = target deg/s,
 * `lidClosed` runs the hydraulic lid animation. Rotation is rAF-driven so
 * acceleration between steps is smooth rather than restarting a CSS animation.
 */
export default function Centrifuge({ engaged, speed, lidClosed, pressure }) {
  const rotorRef = useRef(null)
  const state = useRef({ angle: 0, vel: 20, target: 20 })

  useEffect(() => { state.current.target = speed }, [speed])

  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      s.vel += (s.target - s.vel) * Math.min(1, dt * 1.6)
      s.angle = (s.angle + s.vel * dt) % 360
      if (rotorRef.current) rotorRef.current.style.transform = `rotate(${s.angle}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const vials = Array.from({ length: VIALS }, (_, i) => i)
  return (
    <div className={`mz-centrifuge ${lidClosed ? 'is-sealed' : ''}`}>
      <div className="mz-cf-ring">
        <div className="mz-cf-rotor" ref={rotorRef}>
          <div className="mz-cf-hub" />
          {vials.map((i) => (
            <div key={i} className="mz-cf-arm" style={{ transform: `rotate(${(360 / VIALS) * i}deg)` }}>
              <div className={`mz-cf-vial ${i < engaged ? 'is-locked' : ''}`}>
                <i style={{ height: `${Math.max(25, 100 - pressure * 0.55)}%` }} />
              </div>
              <div className={`mz-cf-clamp ${i < engaged ? 'is-locked' : ''}`} />
            </div>
          ))}
        </div>
        <div className="mz-cf-lid">
          <span className="mz-cf-jaw mz-cf-jaw-l" />
          <span className="mz-cf-jaw mz-cf-jaw-r" />
          <span className="mz-cf-lidtext">{lidClosed ? 'SEALED' : ''}</span>
        </div>
      </div>
      <div className="mz-cf-readout">
        <span>ROTOR {Math.round(speed * 1.6)} RPM</span>
        <span>CLAMPS {engaged}/8</span>
      </div>
    </div>
  )
}
