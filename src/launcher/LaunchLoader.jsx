import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './branding.css'

const COUNTDOWN_SECONDS = 5
const TICK_MS = 100

const STATUS_LINES = [
  'ESTABLISHING UPLINK',
  'BUFFERING TELEMETRY',
  'CALIBRATING SUBSYSTEMS',
  'TELEMETRY BUFFER LOCKED',
  'ENGAGE',
]

export default function LaunchLoader({ stationNum, p1, p2, onComplete }) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsedMs((ms) => ms + TICK_MS), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const done = elapsedMs >= COUNTDOWN_SECONDS * 1000

  useEffect(() => {
    if (done) onComplete()
  }, [done, onComplete])

  const progress = Math.min(100, (elapsedMs / (COUNTDOWN_SECONDS * 1000)) * 100)
  const remaining = Math.max(1, COUNTDOWN_SECONDS - Math.floor(elapsedMs / 1000))
  const statusIdx = Math.min(STATUS_LINES.length - 1, Math.floor(progress / 22))

  return (
    <motion.div
      className="mosaic-loader-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.img
        src="/ctrlfreak_logo.png"
        alt="CtrlFreak: Critical Point"
        className="mosaic-loader-logo"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      />

      <div className="mosaic-loader-station">
        STATION {String(stationNum).padStart(2, '0')} // LAUNCH SEQUENCE
      </div>

      <div className="mosaic-loader-ops">OP1: {p1} // OP2: {p2}</div>

      <div className="mosaic-loader-count-wrap">
          <motion.span
            key={remaining}
            className="mosaic-loader-count"
            initial={{ opacity: 0.2, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            {remaining}
          </motion.span>
      </div>

      <div className="mosaic-loader-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="mosaic-loader-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="arc-committee" aria-hidden="true">
        <img src="/committee_logo.png" alt="" />
      </div>

      <div className="mosaic-loader-status">
        {STATUS_LINES[statusIdx]} // {Math.round(progress)}%
      </div>
    </motion.div>
  )
}
