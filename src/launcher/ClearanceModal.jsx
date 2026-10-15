import { useEffect, useRef, useState } from 'react'
import { lookupPlayer, startRun, uuid } from '../lib/kiosk'

const ID_RE = /^\d{4}$/

/** Plain-language messages for every refusal the server can give. */
const MESSAGES = {
  NOT_REGISTERED: ['ID NOT REGISTERED', 'CHECK THE NUMBER ON YOUR SLIP OR SEE THE REGISTRATION DESK'],
  NO_CREDITS: ['NO CREDITS LEFT', 'TOP UP AT THE REGISTRATION DESK, THEN TRY AGAIN. NO NEW REGISTRATION NEEDED'],
  IN_LOBBY: ['YOU ARE IN A VERSUS LOBBY', 'FINISH OR LEAVE THE LOBBY BEFORE PLAYING SOLO'],
  BAD_ID: ['ID MUST BE EXACTLY 4 DIGITS'],
  UNAUTHORIZED_KIOSK: ['THIS TERMINAL IS NOT AUTHORIZED', 'CALL A VOLUNTEER'],
  KIOSK_NOT_CONFIGURED: ['TERMINAL NOT CONFIGURED', 'CALL A VOLUNTEER'],
  OFFLINE: ['CANNOT REACH THE SERVER', 'CHECK THE NETWORK OR CALL A VOLUNTEER. NO CREDIT WAS SPENT'],
  RUN_VOID: ['THIS ATTEMPT WAS CANCELLED', 'CALL A VOLUNTEER'],
}
const capMessage = (cap) => [`ALL ${cap ?? 10} ATTEMPTS ON THIS STATION USED`, 'TRY ANOTHER STATION']

export default function ClearanceModal({ station, onEngage, onAbort }) {
  const [id, setId] = useState('')
  const [step, setStep] = useState('id') // id -> confirm
  const [info, setInfo] = useState(null)
  const [note, setNote] = useState(null) // { tone: 'bad' | 'ok', lines: string[] }
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const runIdRef = useRef(null) // one id per confirmation, so a retry after a lost answer never charges twice
  const stationKey = `station${station.id}`

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onAbort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAbort])

  const bad = (code, cap) => setNote({ tone: 'bad', lines: code === 'CAP' ? capMessage(cap) : MESSAGES[code] ?? ['VERIFICATION FAILED', 'CALL A VOLUNTEER'] })

  const verify = async (e) => {
    e.preventDefault()
    if (!ID_RE.test(id) || busy) return
    setBusy(true)
    setNote(null)
    const res = await lookupPlayer(id, stationKey)
    setBusy(false)
    if (res.ok) {
      setInfo(res)
      setStep('confirm')
    } else bad(res.status, res.cap)
  }

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    setNote(null)
    runIdRef.current ??= uuid()
    const res = await startRun(id, stationKey, runIdRef.current)
    if (res.ok) {
      setNote({ tone: 'ok', lines: [`CREDIT SPENT · ${res.balance ?? 0} LEFT`, `ATTEMPT ${res.attempt_no ?? '?'} OF ${res.cap ?? 10}`] })
      setTimeout(() => onEngage(id, res.run_id ?? runIdRef.current), 800)
      return
    }
    setBusy(false)
    if (res.error === 'OFFLINE') bad('OFFLINE') // keep the same run id: pressing YES again is safe
    else {
      runIdRef.current = null
      bad(res.error, res.cap)
    }
  }

  const reset = () => {
    setStep('id')
    setInfo(null)
    setNote(null)
    runIdRef.current = null
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div
      className="arc-clearance"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-clr-title"
      style={{ '--c1': station.primary, '--c2': station.secondary }}
    >
      <form className="arc-clearance__panel" onSubmit={verify} noValidate>
        <h2 id="arc-clr-title" className="arc-clearance__title">SECURITY CLEARANCE // PROTOCOL</h2>
        <p className="arc-clearance__station">[{station.name} // {station.sector}]</p>

        {step === 'id' && (
          <label className="arc-field">
            <span>PLAYER ID</span>
            <input
              ref={inputRef}
              value={id}
              onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              aria-label="Player ID, 4 digits"
              name="player-id"
            />
          </label>
        )}

        {step === 'confirm' && info && (
          <div className="arc-confirm" data-testid="confirm">
            <p className="arc-confirm__q">IS THIS YOU?</p>
            <p className="arc-confirm__name">{info.first_name?.toUpperCase()}</p>
            <p className="arc-confirm__college">{info.college?.toUpperCase()}</p>
            <p className="arc-confirm__meta">ATTEMPT {(info.runs_used ?? 0) + 1} OF {info.cap ?? 10} · {info.balance} CREDIT{info.balance === 1 ? '' : 'S'} · 1 CREDIT WILL BE SPENT</p>
          </div>
        )}

        {note && (
          <div className={`arc-note arc-note--${note.tone}`} role="status">
            {note.lines.map((l) => <div key={l}>{l}</div>)}
          </div>
        )}

        {step === 'id' && (
          <button type="submit" className="arc-btn arc-btn--engage" disabled={!ID_RE.test(id) || busy}>
            {busy ? '[ VERIFYING... ]' : '[ VERIFY ID ]'}
          </button>
        )}
        {step === 'confirm' && (
          <>
            <button type="button" className="arc-btn arc-btn--engage" onClick={confirm} disabled={busy}>
              {busy ? '[ STARTING... ]' : '[ YES, THAT IS ME · START ]'}
            </button>
            <button type="button" className="arc-btn arc-btn--abort" onClick={reset} disabled={busy}>[ NO, RE-ENTER ID ]</button>
          </>
        )}
        <button type="button" className="arc-btn arc-btn--abort" onClick={onAbort} disabled={busy && step === 'confirm'}>
          [ ABORT ]
        </button>
      </form>
    </div>
  )
}
