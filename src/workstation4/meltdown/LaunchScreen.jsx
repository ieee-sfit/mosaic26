import { useEffect, useState } from 'react'
import { STATION4_CONFIG, TELEMETRY_BASELINE } from '../mockStation4Data'

const digits = (v) => v.replace(/\D/g, '').slice(0, 6)

export default function LaunchScreen({ onLaunch, onOpenStationChooser }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [touched, setTouched] = useState(false)
  const [count, setCount] = useState(null)

  const re = STATION4_CONFIG.operatorIdPattern
  const err =
    !re.test(p1) || !re.test(p2) ? 'BOTH OPERATOR IDs MUST BE EXACTLY 6 DIGITS'
      : p1 === p2 ? 'OPERATOR IDs MUST BE DIFFERENT' : ''

  useEffect(() => {
    if (count === null) return undefined
    const t = setTimeout(() => (count > 1 ? setCount(count - 1) : onLaunch(p1, p2)), 900)
    return () => clearTimeout(t)
  }, [count, onLaunch, p1, p2])

  const go = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!err) setCount(3)
  }

  if (count !== null) {
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

  return (
    <div className="mz-launch mz-center-all">
      <form className="mz-panel mz-chamfer mz-launch-card" onSubmit={go} noValidate>
        <header className="mz-panel-head">
          <span>{TELEMETRY_BASELINE.facility}</span>
          <span className="mz-red mz-blink">● BREACH ACTIVE</span>
        </header>
        <div className="mz-launch-body">
          <div className="mz-hazard-strip" />
          <h1 className="mz-title mz-glitch" data-text="AREA 51 MELTDOWN">AREA 51 MELTDOWN</h1>
          <p className="mz-sub">STATION 04 // QUARANTINE BREAKOUT PROTOCOL</p>
          <p className="mz-dim mz-lead">
            Specimen vault D-7 has failed. You have <b className="mz-amber">12:00</b> to verify protocols,
            stabilise the centrifuge and lock the infected behind the airlock. Two operators. One shot.
          </p>

          <div className="mz-telemetry">
            <span>CONTAINMENT_SEAL: LEVEL-4</span>
            <span className="mz-red">PATHOGEN_LOAD: {TELEMETRY_BASELINE.pathogenLoad}%</span>
            <span>OPERATORS: 2</span>
          </div>

          <div className="mz-idgrid">
            {[['Operator 1 ID', p1, setP1, 'mz-op1'], ['Operator 2 ID', p2, setP2, 'mz-op2']].map(([lab, val, set, id]) => (
              <label key={id} className="mz-field" htmlFor={id}>
                <span>{lab.toUpperCase()}</span>
                <input id={id} className={`mz-input ${touched && !re.test(val) ? 'is-bad' : ''}`}
                  inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000"
                  value={val} onChange={(e) => set(digits(e.target.value))} />
              </label>
            ))}
          </div>
          {touched && err && <div className="mz-error" role="alert">⚠ {err}</div>}

          <div className="mz-launch-actions">
            <button type="submit" className="mz-btn mz-btn-green mz-big">[ INITIATE QUARANTINE PROTOCOL ]</button>
            {onOpenStationChooser && (
              <button type="button" className="mz-btn mz-btn-ghost" onClick={onOpenStationChooser}>[ STATION SELECT ]</button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
