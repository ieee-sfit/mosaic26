import { useEffect, useState } from 'react'
import { TELEMETRY_BASELINE } from '../mockStation4Data'

/** The arcade launcher has already verified the player's ID, so this screen is just the charging countdown. */
export default function LaunchScreen({ onLaunch }) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    const t = setTimeout(() => (count > 1 ? setCount(count - 1) : onLaunch()), 900)
    return () => clearTimeout(t)
  }, [count, onLaunch])

  return (
    <div className="mz-launch mz-center-all">
      <div className="mz-countdown" key={count}>
        <small>CONTAINMENT FIELD CHARGING</small>
        <b className="mz-glitch" data-text={count}>{count}</b>
        <small className="mz-red mz-blink">PATHOGEN_LOAD: {TELEMETRY_BASELINE.pathogenLoad}%</small>
      </div>
    </div>
  )
}
