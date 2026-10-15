import { useEffect, useRef, useState } from 'react'
import { lookupPlayer, startRun, lobbyCreate, lobbyJoin, uuid } from '../lib/kiosk'
import LobbyRoom from './LobbyRoom'

const ID_RE = /^\d{4}$/

/** Plain-language messages for every refusal the server can give. */
const MESSAGES = {
  NOT_REGISTERED: ['ID NOT REGISTERED', 'CHECK THE NUMBER ON YOUR SLIP OR SEE THE REGISTRATION DESK'],
  NO_CREDITS: ['NO CREDITS LEFT', 'TOP UP AT THE REGISTRATION DESK, THEN TRY AGAIN. NO NEW REGISTRATION NEEDED'],
  IN_LOBBY: ['YOU ARE IN A VERSUS LOBBY', 'FINISH OR LEAVE THAT LOBBY FIRST'],
  BAD_ID: ['ID MUST BE EXACTLY 4 DIGITS'],
  UNAUTHORIZED_KIOSK: ['THIS TERMINAL IS NOT AUTHORIZED', 'CALL A VOLUNTEER'],
  KIOSK_NOT_CONFIGURED: ['TERMINAL NOT CONFIGURED', 'CALL A VOLUNTEER'],
  OFFLINE: ['CANNOT REACH THE SERVER', 'CHECK THE NETWORK OR CALL A VOLUNTEER. NO CREDIT WAS SPENT'],
  RUN_VOID: ['THIS ATTEMPT WAS CANCELLED', 'CALL A VOLUNTEER'],
  LOBBY_NOT_FOUND: ['NO OPEN LOBBY WITH THAT NUMBER', 'CHECK THE NUMBER ON THE HOST SCREEN. LOBBIES EXPIRE AFTER 10 MINUTES'],
  LOBBY_FULL: ['THAT LOBBY IS FULL', 'MAXIMUM 5 PLAYERS'],
  LOBBY_STARTED: ['THAT LOBBY HAS ALREADY STARTED', 'PLAY SOLO OR START A NEW LOBBY'],
  WRONG_STATION: ['THAT LOBBY IS ON A DIFFERENT STATION', 'GO TO THE STATION THE HOST IS PLAYING'],
}
const capMessage = (cap) => [`ALL ${cap ?? 10} ATTEMPTS ON THIS STATION USED`, 'TRY ANOTHER STATION']

export default function ClearanceModal({ station, onEngage, onAbort }) {
  const [id, setId] = useState('')
  const [step, setStep] = useState('id') // id -> confirm -> mode -> (join | room)
  const [info, setInfo] = useState(null)
  const [note, setNote] = useState(null) // { tone: 'bad' | 'ok', lines: string[] }
  const [busy, setBusy] = useState(false)
  const [number, setNumber] = useState('')
  const [lobby, setLobby] = useState(null) // { lobby_id, number_text, isCreator }
  const inputRef = useRef(null)
  const runIdRef = useRef(null) // one id per solo start, so a retry after a lost answer never charges twice
  const stationKey = `station${station.id}`

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !lobby) onAbort()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAbort, lobby])

  const bad = (code, cap) => setNote({ tone: 'bad', lines: code === 'CAP' ? capMessage(cap) : MESSAGES[code] ?? ['SOMETHING WENT WRONG', 'CALL A VOLUNTEER'] })

  const verify = async (e) => {
    e.preventDefault()
    if (step !== 'id' || !ID_RE.test(id) || busy) return
    setBusy(true)
    setNote(null)
    const res = await lookupPlayer(id, stationKey)
    setBusy(false)
    if (res.ok) {
      setInfo(res)
      setStep('confirm')
    } else bad(res.status, res.cap)
  }

  const playSolo = async () => {
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
    if (res.error === 'OFFLINE') bad('OFFLINE') // keep the same run id: pressing again is safe
    else {
      runIdRef.current = null
      bad(res.error, res.cap)
    }
  }

  const create = async () => {
    setBusy(true)
    setNote(null)
    const r = await lobbyCreate(id, stationKey)
    setBusy(false)
    if (r.ok) {
      setLobby({ lobby_id: r.lobby_id, number_text: r.number_text, isCreator: true })
      setStep('room')
    } else bad(r.error, info?.cap)
  }

  const join = async (e) => {
    e.preventDefault()
    const n = Number(number)
    if (!n || busy) return
    setBusy(true)
    setNote(null)
    const r = await lobbyJoin(id, n, stationKey)
    setBusy(false)
    if (r.ok) {
      setLobby({ lobby_id: r.lobby_id, number_text: String(r.number).padStart(3, '0'), isCreator: false })
      setStep('room')
    } else bad(r.error, info?.cap)
  }

  const reset = () => {
    setStep('id')
    setInfo(null)
    setNote(null)
    setLobby(null)
    setNumber('')
    runIdRef.current = null
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const header = (
    <>
      <h2 id="arc-clr-title" className="arc-clearance__title">SECURITY CLEARANCE // PROTOCOL</h2>
      <p className="arc-clearance__station">[{station.name} // {station.sector}]</p>
    </>
  )

  if (step === 'room' && lobby)
    return (
      <div className="arc-clearance" role="dialog" aria-modal="true" aria-labelledby="arc-clr-title" style={{ '--c1': station.primary, '--c2': station.secondary }}>
        <div className="arc-clearance__panel">
          {header}
          <LobbyRoom
            station={station}
            playerId={id}
            lobby={lobby}
            onLeave={reset}
            onStart={({ runId, lobbyId, seed }) => onEngage(id, runId, { lobbyId, seed })}
          />
        </div>
      </div>
    )

  return (
    <div
      className="arc-clearance"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-clr-title"
      style={{ '--c1': station.primary, '--c2': station.secondary }}
    >
      <form className="arc-clearance__panel" onSubmit={step === 'join' ? join : verify} noValidate>
        {header}

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

        {step !== 'id' && info && (
          <div className="arc-confirm" data-testid="confirm">
            {step === 'confirm' && <p className="arc-confirm__q">IS THIS YOU?</p>}
            <p className="arc-confirm__name">{info.first_name?.toUpperCase()}</p>
            <p className="arc-confirm__college">{info.college?.toUpperCase()}</p>
            <p className="arc-confirm__meta">ATTEMPT {(info.runs_used ?? 0) + 1} OF {info.cap ?? 10} · {info.balance} CREDIT{info.balance === 1 ? '' : 'S'}</p>
          </div>
        )}

        {step === 'join' && (
          <label className="arc-field">
            <span>LOBBY NUMBER (SHOWN ON THE HOST SCREEN)</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="001"
              aria-label="Lobby number"
              name="lobby-number"
              autoFocus
            />
          </label>
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
            <button type="button" className="arc-btn arc-btn--engage" onClick={() => setStep('mode')}>[ YES, THAT IS ME ]</button>
            <button type="button" className="arc-btn arc-btn--abort" onClick={reset}>[ NO, RE-ENTER ID ]</button>
          </>
        )}
        {step === 'mode' && (
          <>
            <button type="button" className="arc-btn arc-btn--engage" onClick={playSolo} disabled={busy}>
              {busy ? '[ STARTING... ]' : '[ PLAY SOLO · SPENDS 1 CREDIT ]'}
            </button>
            <button type="button" className="arc-btn" onClick={create} disabled={busy}>[ CREATE VERSUS LOBBY ]</button>
            <button type="button" className="arc-btn" onClick={() => { setNote(null); setStep('join') }} disabled={busy}>[ JOIN VERSUS LOBBY ]</button>
          </>
        )}
        {step === 'join' && (
          <>
            <button type="submit" className="arc-btn arc-btn--engage" disabled={!number || busy}>{busy ? '[ JOINING... ]' : '[ JOIN LOBBY ]'}</button>
            <button type="button" className="arc-btn arc-btn--abort" onClick={() => { setNote(null); setStep('mode') }}>[ BACK ]</button>
          </>
        )}
        <button type="button" className="arc-btn arc-btn--abort" onClick={onAbort} disabled={busy && step === 'mode'}>
          [ ABORT ]
        </button>
      </form>
    </div>
  )
}
