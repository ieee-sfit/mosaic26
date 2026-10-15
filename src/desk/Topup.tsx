import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc, uuid, errText } from './api'
import type { Me } from './Desk'
import PayFields, { type Pay } from './PayFields'

export default function Topup({ me, initialId }: { me: Me; initialId: string }) {
  const [idIn, setIdIn] = useState(initialId)
  const [p, setP] = useState<any>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [pay, setPay] = useState<Pay>({ credits: 1, mode: 'cash', ref: '', by: me.first_name })
  const [busy, setBusy] = useState(false)
  const reqId = useRef(uuid())

  const lookup = useCallback(async (id: string) => {
    if (!/^\d{4}$/.test(id)) return setP(null)
    try {
      const r = await rpc<any>('desk_player', { p_id: id })
      setP(r.ok ? r : null)
      if (!r.ok) setMsg({ tone: 'bad', text: errText(r.error) })
    } catch {
      setMsg({ tone: 'bad', text: 'Lookup failed.' })
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialId) void lookup(initialId)
  }, [initialId, lookup])

  const onId = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    setIdIn(d)
    setMsg(null)
    void lookup(d)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!p || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await rpc<any>('desk_topup', { p_id: p.player.id, p_amount_inr: pay.credits * me.price_inr, p_mode: pay.mode, p_payment_ref: pay.ref, p_received_by: pay.by, p_request_id: reqId.current })
      if (r.ok) {
        setMsg({ tone: 'ok', text: `Added ${r.credits_added ?? pay.credits} credit(s). New balance: ${r.balance}.` })
        reqId.current = uuid()
        setPay({ ...pay, credits: 1, ref: '' })
        await lookup(p.player.id)
      } else setMsg({ tone: 'bad', text: errText(r.error) })
    } catch {
      setMsg({ tone: 'bad', text: 'Network problem. Press the button again; the top-up is only applied once.' })
    }
    setBusy(false)
  }

  return (
    <form className="dk-card dk-form" onSubmit={submit}>
      <h2>Top-up (replay)</h2>
      <label>Player ID<input value={idIn} onChange={(e) => onId(e.target.value)} inputMode="numeric" autoComplete="off" name="playerid" placeholder="4 digits" /></label>
      {p && (
        <div className="dk-player">
          <b>{p.player.name}</b> <span className="dk-dim">{p.player.college}</span>
          <div className="dk-bal">Balance: <b data-testid="balance">{p.balance}</b></div>
        </div>
      )}
      {p && <PayFields price={me.price_inr} value={pay} onChange={setPay} />}
      {msg && <div className={msg.tone === 'ok' ? 'dk-ok' : 'dk-err'} role="status">{msg.text}</div>}
      <button className="dk-btn dk-primary dk-big" disabled={!p || busy}>{busy ? 'Saving…' : p ? `Add ${pay.credits} credit(s) · collect Rs ${pay.credits * me.price_inr}` : 'Enter a player ID'}</button>
    </form>
  )
}
