import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc, errText, fmtTime } from './api'
import type { Me, TabKey } from './Desk'

const ST: Record<string, string> = { station1: 'GOAT ANC', station2: 'F1 STREAM', station3: 'eCHALLAN', station4: 'AREA 51' }

export default function Find({ me, go, initialId }: { me: Me; go: (t: TabKey, id?: string) => void; initialId: string }) {
  const [q, setQ] = useState(initialId)
  const [list, setList] = useState<any[]>([])
  const [p, setP] = useState<any>(null)
  const [reasonFor, setReasonFor] = useState<{ run: string; kind: 'refund' | 'void' } | null>(null)
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const open = useCallback(async (id: string) => {
    try {
      const r = await rpc<any>('desk_player', { p_id: id })
      setP(r.ok ? r : null)
    } catch {
      setMsg({ tone: 'bad', text: 'Could not load player.' })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialId) void open(initialId)
  }, [initialId, open])
  useEffect(() => () => clearTimeout(timer.current), [])

  const search = (v: string) => {
    setQ(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (v.trim().length < 2) return setList([])
      try {
        setList(await rpc<any[]>('desk_find', { p_q: v }))
      } catch {
        setList([])
      }
    }, 220)
  }

  const act = async () => {
    if (!reasonFor || !p) return
    try {
      const r = await rpc<any>(reasonFor.kind === 'refund' ? 'desk_refund_run' : 'desk_void_run', { p_run: reasonFor.run, p_reason: reason })
      if (r.ok) {
        setMsg({ tone: 'ok', text: reasonFor.kind === 'refund' ? `Refunded. Balance now ${r.balance}.` : 'Run voided (no credit returned).' })
        setReasonFor(null)
        setReason('')
        await open(p.player.id)
      } else setMsg({ tone: 'bad', text: errText(r.error) })
    } catch {
      setMsg({ tone: 'bad', text: 'Network problem. Try again.' })
    }
  }

  return (
    <section className="dk-card">
      <h2>Find player</h2>
      <label>ID, phone, name or PID<input value={q} onChange={(e) => search(e.target.value)} autoComplete="off" name="q" placeholder="e.g. 4821 · 98765 · Asha" /></label>
      {!p && (
        <ul className="dk-list">
          {list.map((x) => (
            <li key={x.id}>
              <button className="dk-rowbtn" onClick={() => open(x.id)}>
                <b>{x.id}</b> <span>{x.name}</span> <span className="dk-dim">{x.college} · {x.phone}</span> <i>{x.balance} cr</i>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && list.length === 0 && <li className="dk-dim">No matches.</li>}
        </ul>
      )}
      {msg && <div className={msg.tone === 'ok' ? 'dk-ok' : 'dk-err'} role="status">{msg.text}</div>}
      {p && (
        <div className="dk-detail">
          <button className="dk-linkbtn" onClick={() => { setP(null); setMsg(null) }}>← results</button>
          <h3>{p.player.name} <small className="dk-dim">ID {p.player.id}</small></h3>
          <p className="dk-dim">{p.player.college}{p.player.is_internal ? ' (ours)' : ''} · {p.player.year} · {p.player.department} · {p.player.phone}{p.player.pid ? ` · PID ${p.player.pid}` : ''}</p>
          <p>Leaderboard name: <b>{p.player.codename}</b>{p.standing ? ` · rank ${p.standing.rank}${p.standing.shared ? ' (shared)' : ''} · total ${p.standing.total}` : ' · not ranked yet'}</p>
          <div className="dk-bal">Balance: <b data-testid="balance">{p.balance}</b> credit(s) <button className="dk-btn dk-sm" onClick={() => go('topup', p.player.id)}>Top-up</button></div>
          <h4>Runs ({me.attempt_cap} per station)</h4>
          <ul className="dk-list">
            {p.runs.map((r: any) => (
              <li key={r.run_id} className={`dk-run st-${r.state}`}>
                <span>{ST[r.station] ?? r.station}</span>
                <b>{r.state}</b>
                <span>{r.raw ?? '–'}{r.raw != null ? `/140 · ${r.hints}h ${r.wrong}w · ${r.time_left}s left` : ''}</span>
                <span className="dk-dim">{fmtTime(r.started_at)}{r.lobby_id ? ' · versus' : ''}{r.reason ? ` · ${r.reason}` : ''}</span>
                {(r.state === 'started' || r.state === 'completed') && (
                  <span className="dk-actions">
                    <button className="dk-btn dk-sm" onClick={() => setReasonFor({ run: r.run_id, kind: 'refund' })}>Refund</button>
                    <button className="dk-btn dk-sm" onClick={() => setReasonFor({ run: r.run_id, kind: 'void' })}>Void</button>
                  </span>
                )}
              </li>
            ))}
            {p.runs.length === 0 && <li className="dk-dim">No runs yet.</li>}
          </ul>
          {reasonFor && (
            <div className="dk-reason">
              <label>Reason for {reasonFor.kind} (required)<input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus name="reason" autoComplete="off" /></label>
              <button className="dk-btn dk-primary" disabled={reason.trim().length < 3} onClick={act}>Confirm {reasonFor.kind}</button>
              <button className="dk-btn" onClick={() => { setReasonFor(null); setReason('') }}>Cancel</button>
            </div>
          )}
          <h4>Credit history</h4>
          <ul className="dk-list">
            {p.ledger.map((l: any, i: number) => (
              <li key={i}><b className={l.delta > 0 ? 'pos' : 'neg'}>{l.delta > 0 ? '+' : ''}{l.delta}</b> {l.reason}
                {l.amount_inr ? ` · Rs ${l.amount_inr} ${l.mode}${l.payment_ref ? ` (${l.payment_ref})` : ''} · by ${l.received_by}` : ''} <span className="dk-dim">{fmtTime(l.at)}</span></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
