import { useEffect, useState } from 'react'
import { lobbyStatus, type LobbyStatus } from '../lib/kiosk'
import './runbadge.css'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Match result of a versus lobby, shown on the end screen once every run is in. */
export default function LobbyResult({ playerId, lobbyId }: { playerId: string; lobbyId: number }) {
  const [s, setS] = useState<LobbyStatus | null>(null)
  useEffect(() => {
    let alive = true
    const tick = async () => {
      const r = await lobbyStatus(playerId, lobbyId)
      if (alive && r.ok) setS(r)
    }
    void tick()
    const id = setInterval(() => (s?.state !== 'finished' ? void tick() : undefined), 3000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [playerId, lobbyId, s?.state])

  return (
    <aside className="rb-result" aria-label="Versus result" data-testid="lobby-result">
      <small>VERSUS · LOBBY {s?.number_text ?? ''}</small>
      {s?.state !== 'finished' && <em>WAITING FOR THE OTHER PLAYERS TO FINISH…</em>}
      {s?.state === 'finished' && (
        <>
          {s.winner_is_you && <p className="rb-win">{s.medal_awarded ? '🏅 YOU WON · MATCH MEDAL. COLLECT IT AT THE DESK' : 'YOU WON THE MATCH'}</p>}
          <ol>
            {(s.results ?? []).map((r) => (
              <li key={r.rank} className={r.is_you ? 'me' : ''}>
                <b>{r.rank}</b> {r.first_name.toUpperCase()} <span>{r.score} · {r.hints}h {r.wrong}w · {mmss(r.time_left)}</span>
              </li>
            ))}
          </ol>
          {!s.winner_is_you && (s.results ?? []).length > 0 && <em>MEDAL: WINNER NEEDS 70+ POINTS</em>}
        </>
      )}
    </aside>
  )
}
