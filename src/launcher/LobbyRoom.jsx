import { useCallback, useEffect, useRef, useState } from 'react'
import { lobbyLeave, lobbyStart, lobbyStatus } from '../lib/kiosk'

const POLL_MS = 2000
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

/** Waiting room of a versus lobby. Polls every 2 s (no realtime dependency); the countdown runs on the server's clock. */
export default function LobbyRoom({ station, playerId, lobby, onLeave, onStart }) {
  const [status, setStatus] = useState(null)
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [offset, setOffset] = useState(0) // server clock minus this PC's clock
  const started = useRef(false)

  const poll = useCallback(async () => {
    const s = await lobbyStatus(playerId, lobby.lobby_id)
    if (!s.ok) {
      if (s.error !== 'OFFLINE') setNote(s.error === 'NOT_IN_LOBBY' ? 'YOU ARE NO LONGER IN THIS LOBBY' : 'LOBBY NOT AVAILABLE')
      return
    }
    if (s.server_now) setOffset(new Date(s.server_now).getTime() - Date.now())
    setStatus(s)
  }, [playerId, lobby.lobby_id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll()
    const id = setInterval(() => void poll(), POLL_MS)
    return () => clearInterval(id)
  }, [poll])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const serverNow = now + offset
  const startIn = status?.state === 'running' && status.start_at ? Math.ceil((new Date(status.start_at).getTime() - serverNow) / 1000) : null

  // Everyone leaves the room at the same server instant.
  useEffect(() => {
    if (startIn !== null && startIn <= 0 && status?.run_id && !started.current) {
      started.current = true
      onStart({ runId: status.run_id, lobbyId: lobby.lobby_id, seed: status.seed })
    }
  }, [startIn, status, lobby.lobby_id, onStart])

  const start = async () => {
    setBusy(true)
    setNote(null)
    const r = await lobbyStart(playerId, lobby.lobby_id)
    setBusy(false)
    if (!r.ok) setNote(r.error === 'TOO_FEW_PLAYERS' ? `A LOBBY NEEDS AT LEAST ${r.min ?? 2} PLAYERS` : r.error === 'OFFLINE' ? 'CANNOT REACH THE SERVER. TRY AGAIN' : `COULD NOT START (${r.error})`)
    else void poll()
  }
  const leave = async () => {
    await lobbyLeave(playerId, lobby.lobby_id)
    onLeave()
  }

  const dead = status && (status.state === 'cancelled' || status.state === 'expired')
  const count = status?.players?.length ?? 0
  const expiresIn = status?.expires_at ? Math.max(0, Math.floor((new Date(status.expires_at).getTime() - serverNow) / 1000)) : null

  if (dead)
    return (
      <div className="arc-lobby" data-testid="lobby-dead">
        <p className="arc-confirm__q">LOBBY {status.number_text} CLOSED</p>
        <p className="arc-confirm__meta">{status.state === 'expired' ? 'IT WAS NOT STARTED IN TIME' : (status.cancel_reason ?? 'CANCELLED').toUpperCase()}. NO CREDIT WAS SPENT.</p>
        <button type="button" className="arc-btn arc-btn--engage" onClick={onLeave}>[ BACK ]</button>
      </div>
    )

  if (startIn !== null)
    return (
      <div className="arc-lobby arc-lobby--go" data-testid="lobby-countdown">
        <p className="arc-confirm__q">LOBBY {status.number_text} · ALL PLAYERS LAUNCH TOGETHER</p>
        <b className="arc-lobby__count">{Math.max(1, startIn)}</b>
        <p className="arc-confirm__meta">1 CREDIT SPENT · SAME CHALLENGE FOR EVERYONE</p>
      </div>
    )

  return (
    <div className="arc-lobby" data-testid="lobby-room">
      <p className="arc-confirm__q">VERSUS LOBBY · {station.name}</p>
      <b className="arc-lobby__num" data-testid="lobby-number">{lobby.number_text}</b>
      <p className="arc-confirm__meta">OTHERS AT THIS STATION: CHOOSE JOIN LOBBY AND ENTER {lobby.number_text}</p>
      <ul className="arc-lobby__players" aria-label="Players in the lobby">
        {(status?.players ?? []).map((p, i) => (
          <li key={i}>{p.first_name.toUpperCase()}{p.is_creator ? ' · HOST' : ''}{p.is_you ? ' · YOU' : ''}<small>{p.college}</small></li>
        ))}
      </ul>
      <p className="arc-confirm__meta" data-testid="lobby-count">{count} OF {status?.max_players ?? 5} PLAYERS · NEEDS {status?.min_players ?? 2}+ TO START{expiresIn !== null ? ` · EXPIRES IN ${mmss(expiresIn)}` : ''}</p>
      {note && <div className="arc-note arc-note--bad" role="status">{note}</div>}
      {lobby.isCreator ? (
        <button type="button" className="arc-btn arc-btn--engage" onClick={start} disabled={busy || count < (status?.min_players ?? 2)}>
          {busy ? '[ STARTING... ]' : '[ START · 1 CREDIT EACH ]'}
        </button>
      ) : (
        <p className="arc-confirm__meta">WAITING FOR THE HOST TO START…</p>
      )}
      <button type="button" className="arc-btn arc-btn--abort" onClick={leave} disabled={busy}>[ LEAVE LOBBY ]</button>
    </div>
  )
}
