import { useState } from 'react'
import { rpc, errText, fmtTime } from './api'
import { usePoll } from './usePoll'

const ST: Record<string, string> = { station1: 'GOAT ANC', station2: 'F1 STREAM', station3: 'eCHALLAN', station4: 'AREA 51' }

export default function Lobbies() {
  const { data, error, reload } = usePoll<any[]>('desk_lobbies', {}, 5000)
  const [msg, setMsg] = useState<string | null>(null)
  const cancel = async (id: number) => {
    const reason = window.prompt('Reason for cancelling this lobby?', 'cancelled by technical executive')
    if (reason === null) return
    try {
      const r = await rpc<any>('desk_cancel_lobby', { p_lobby: id, p_reason: reason })
      setMsg(r.ok ? 'Lobby cancelled.' : errText(r.error))
      await reload()
    } catch {
      setMsg('Network problem.')
    }
  }
  return (
    <section className="dk-card">
      <h2>Versus lobbies</h2>
      {error && <div className="dk-err">{error}</div>}
      {msg && <div className="dk-ok" role="status">{msg}</div>}
      <ul className="dk-list">
        {(data ?? []).map((l) => (
          <li key={l.id} className={`dk-lobby st-${l.state}`}>
            <b>#{l.number_text}</b> <span>{ST[l.station] ?? l.station}</span> <b>{l.state}</b>
            <span>{(l.players ?? []).map((p: any) => p.name.split(' ')[0]).join(', ') || '–'}</span>
            <span className="dk-dim">{l.state === 'open' ? `expires ${fmtTime(l.expires_at)}` : l.winner ? `winner ${l.winner}${l.medal_awarded ? ' · medal' : ''}` : l.cancel_reason ?? fmtTime(l.created_at)}</span>
            {l.state === 'open' && <button className="dk-btn dk-sm" onClick={() => cancel(l.id)}>Cancel</button>}
          </li>
        ))}
        {data && data.length === 0 && <li className="dk-dim">No lobbies yet.</li>}
      </ul>
    </section>
  )
}
