import { useEffect, useState } from 'react'
import { rpc, errText, fmtTime, toLocalInput, fromLocalInput } from './api'
import { usePoll } from './usePoll'

const ST: Record<string, string> = { station1: 'GOAT ANC', station2: 'F1 STREAM', station3: 'eCHALLAN', station4: 'AREA 51' }

export default function Medals() {
  const un = usePoll<any>('desk_medals_unclaimed', {}, 8000)
  const wins = usePoll<any[]>('desk_windows', {}, 8000)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [picks, setPicks] = useState<Record<number, string[]>>({})
  const [edit, setEdit] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirm, setConfirm] = useState<{ w: any; cands: any[] | null } | null>(null)
  useEffect(() => { rpc<any>('desk_me', {}).then((r) => setIsAdmin(r?.role === 'admin')).catch(() => {}) }, [])
  const askClose = async (w: any) => {
    setConfirm({ w, cands: null })
    try {
      const r = await rpc<any>('desk_window_preview', { p_id: w.id })
      setConfirm({ w, cands: r.ok ? r.candidates : [] })
    } catch { setConfirm({ w, cands: [] }) }
  }
  const refresh = () => Promise.all([un.reload(), wins.reload()])
  const run = async (fn: string, args: Record<string, unknown>, okText: string) => {
    try {
      const r = await rpc<any>(fn, args)
      setMsg(r.ok ? { tone: 'ok', text: okText } : { tone: 'bad', text: errText(r.error) })
      await refresh()
    } catch {
      setMsg({ tone: 'bad', text: 'Network problem. Try again.' })
    }
  }
  const saveEdit = () =>
    run('desk_window_save', { p_id: edit.id, p_label: edit.label, p_starts: fromLocalInput(edit.starts), p_ends: fromLocalInput(edit.ends), p_medals: Number(edit.medals) }, 'Window saved.').then(() => setEdit(null))

  return (
    <div className="dk-stack">
      {msg && <div className={msg.tone === 'ok' ? 'dk-ok' : 'dk-err'} role="status">{msg.text}</div>}

      {(un.data?.tosses ?? []).map((t: any) => (
        <section key={t.window_id} className="dk-card dk-toss">
          <h2>Coin toss · {t.label}</h2>
          <p>Tied on every tiebreaker. Toss live, then pick {t.slots} winner(s):</p>
          {t.players.map((p: any) => (
            <label key={p.player_id} className="dk-check">
              <input type="checkbox" checked={(picks[t.window_id] ?? []).includes(p.player_id)}
                onChange={(e) => setPicks((x) => ({ ...x, [t.window_id]: e.target.checked ? [...(x[t.window_id] ?? []), p.player_id] : (x[t.window_id] ?? []).filter((i) => i !== p.player_id) }))} />
              {p.name} <span className="dk-dim">ID {p.player_id}</span>
            </label>
          ))}
          <button className="dk-btn dk-primary" disabled={(picks[t.window_id] ?? []).length !== t.slots}
            onClick={() => run('desk_resolve_toss', { p_window: t.window_id, p_winners: picks[t.window_id] }, 'Toss recorded.')}>Record result</button>
        </section>
      ))}

      <section className="dk-card">
        <h2>Unclaimed medals</h2>
        <h4>Window medals</h4>
        <ul className="dk-list">
          {(un.data?.window ?? []).map((m: any) => (
            <li key={m.result_id}>
              <b>{m.name}</b> <span className="dk-dim">ID {m.player_id} · {m.college} · {m.label} · {m.total} pts</span>
              <button className="dk-btn dk-sm" onClick={() => run('desk_claim_window_medal', { p_result: m.result_id }, `Marked claimed: ${m.name}.`)}>Mark claimed</button>
            </li>
          ))}
          {un.data && un.data.window.length === 0 && <li className="dk-dim">None waiting.</li>}
        </ul>
        <h4>Match medals (versus)</h4>
        <ul className="dk-list">
          {(un.data?.match ?? []).map((m: any) => (
            <li key={m.player_id + m.station}>
              <b>{m.name}</b> <span className="dk-dim">ID {m.player_id} · {ST[m.station] ?? m.station} · {m.raw}/140</span>
              <button className="dk-btn dk-sm" onClick={() => run('desk_claim_match_medal', { p_player: m.player_id, p_station: m.station }, `Marked claimed: ${m.name}.`)}>Mark claimed</button>
            </li>
          ))}
          {un.data && un.data.match.length === 0 && <li className="dk-dim">None waiting.</li>}
        </ul>
      </section>

      <section className="dk-card">
        <h2>Medal windows</h2>
        <div className="dk-scroll">
          <table className="dk-table">
            <thead><tr><th>Window</th><th>Starts</th><th>Ends</th><th>Medals</th><th>Winners</th><th /></tr></thead>
            <tbody>
              {(wins.data ?? []).map((w) => (
                <tr key={w.id} className={w.closed ? 'closed' : ''}>
                  <td>{w.label}</td><td>{fmtTime(w.starts_at)}</td><td>{fmtTime(w.ends_at)}</td><td>{w.medals}</td>
                  <td>{w.results.filter((r: any) => r.status !== 'lost').map((r: any) => `${r.name}${r.status === 'toss' ? ' (toss)' : ''}${r.claimed ? ' ✓' : ''}`).join(', ') || (w.closed ? '–' : '')}</td>
                  <td className="dk-actions">
                    {!w.closed && w.ended && <button className="dk-btn dk-sm dk-primary" onClick={() => askClose(w)}>Close &amp; award medals</button>}
                    {w.closed && w.results.length === 0 && isAdmin && <button className="dk-btn dk-sm" onClick={() => run('admin_reopen_window', { p_id: w.id }, `Re-opened ${w.label}.`)}>Re-open</button>}
                    {!w.closed && <button className="dk-btn dk-sm" onClick={() => setEdit({ id: w.id, label: w.label, starts: toLocalInput(w.starts_at), ends: toLocalInput(w.ends_at), medals: w.medals })}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dk-dim">Medals are never awarded automatically. When you say so, press “Close &amp; award medals” on an ended window.</p>
        {confirm && (
          <div className="dk-reason dk-confirm">
            <h3>Award medals for {confirm.w.label}?</h3>
            <p>This is final. Any earlier window that is still open is closed and awarded first. Current top players:</p>
            {confirm.cands === null ? <p className="dk-dim">Loading…</p> : (
              <ol>{confirm.cands.map((c: any) => <li key={c.player_id}>{c.name} <span className="dk-dim">ID {c.player_id} · {c.total} pts{c.tied ? ' · tied' : ''}</span></li>)}
                {confirm.cands.length === 0 && <li className="dk-dim">Nobody has played in this window.</li>}</ol>
            )}
            <button className="dk-btn dk-primary" onClick={() => { const w = confirm.w; setConfirm(null); run('desk_close_window', { p_id: w.id }, `Closed ${w.label}.`) }}>Yes, close and award</button>
            <button className="dk-btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        )}
        <button className="dk-btn" onClick={() => setEdit({ id: null, label: '', starts: '2026-10-16T10:00', ends: '2026-10-16T10:15', medals: 1 })}>Add window</button>
        {edit && (
          <div className="dk-reason">
            <label>Label<input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} name="wlabel" /></label>
            <label>Starts (IST)<input type="datetime-local" value={edit.starts} onChange={(e) => setEdit({ ...edit, starts: e.target.value })} name="wstart" /></label>
            <label>Ends (IST)<input type="datetime-local" value={edit.ends} onChange={(e) => setEdit({ ...edit, ends: e.target.value })} name="wend" /></label>
            <label>Medals<input type="number" min={0} value={edit.medals} onChange={(e) => setEdit({ ...edit, medals: e.target.value })} name="wmedals" /></label>
            <button className="dk-btn dk-primary" onClick={saveEdit}>Save window</button>
            <button className="dk-btn" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  )
}
