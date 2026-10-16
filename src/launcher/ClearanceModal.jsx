import { useEffect, useRef, useState } from 'react'
import { checkPlayers } from '../lib/kiosk'

const ID_RE = /^\d{6}$/

export default function ClearanceModal({ station, onEngage, onAbort }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const firstRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null) // { tone: 'bad' | 'ok', lines: string[] }
  const valid = ID_RE.test(p1) && ID_RE.test(p2) && p1 !== p2

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onAbort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAbort])

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setNote(null)
    try {
      const res = await checkPlayers(p1, p2, `station${station.id}`)
      const names = [res?.p1?.name, res?.p2?.name].filter(Boolean)
      const attempt = Math.max(res?.p1?.runs ?? 0, res?.p2?.runs ?? 0) + 1
      if (names.length > 0) {
        setNote({
          tone: 'ok',
          lines: [`VERIFIED: ${names.join(' + ').toUpperCase()}`, `ATTEMPT ${attempt} OF ${res?.cap ?? 4}`],
        })
      } else {
        setNote({
          tone: 'ok',
          lines: ['CLEARANCE GRANTED // ENGAGING WORKSTATION...'],
        })
      }
    } catch {
      setNote({
        tone: 'ok',
        lines: ['CLEARANCE GRANTED // ENGAGING WORKSTATION...'],
      })
    }
    setTimeout(() => onEngage(p1, p2), 600)
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

        {note && (
          <div className={`arc-note arc-note--${note.tone}`} role="status">
            {note.lines.map((l) => <div key={l}>{l}</div>)}
          </div>
        )}
        <button type="submit" className="arc-btn arc-btn--engage" disabled={!valid || busy}>
          {busy ? '[ VERIFYING... ]' : '[ ENGAGE WORKSTATION ]'}
        </button>
        <button type="button" className="arc-btn arc-btn--abort" onClick={onAbort}>
          [ ABORT ]
        </button>
      </form>
    </div>
  )
}
