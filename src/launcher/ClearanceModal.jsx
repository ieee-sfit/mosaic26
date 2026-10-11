import { useEffect, useRef, useState } from 'react'

const ID_RE = /^\d{6}$/

export default function ClearanceModal({ station, onEngage, onAbort }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const firstRef = useRef(null)
  const valid = ID_RE.test(p1) && ID_RE.test(p2)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onAbort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAbort])

  const submit = (e) => {
    e.preventDefault()
    if (valid) onEngage(p1, p2)
  }

  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, '').slice(0, 6))

  return (
    <div
      className="arc-clearance"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-clr-title"
      style={{ '--c1': station.primary, '--c2': station.secondary }}
    >
      <form className="arc-clearance__panel" onSubmit={submit} noValidate>
        <h2 id="arc-clr-title" className="arc-clearance__title">SECURITY CLEARANCE // PROTOCOL</h2>
        <p className="arc-clearance__station">[{station.name} // {station.sector}]</p>

        <label className="arc-field">
          <span>OPERATOR 1 ID</span>
          <input
            ref={firstRef}
            value={p1}
            onChange={digits(setP1)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="000000"
            aria-label="Operator 1 ID, 6 digits"
          />
        </label>
        <label className="arc-field">
          <span>OPERATOR 2 ID</span>
          <input
            value={p2}
            onChange={digits(setP2)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="000000"
            aria-label="Operator 2 ID, 6 digits"
          />
        </label>

        <button type="submit" className="arc-btn arc-btn--engage" disabled={!valid}>
          [ ENGAGE WORKSTATION ]
        </button>
        <button type="button" className="arc-btn arc-btn--abort" onClick={onAbort}>
          [ ABORT ]
        </button>
      </form>
    </div>
  )
}
