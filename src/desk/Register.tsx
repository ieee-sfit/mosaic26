import { useEffect, useRef, useState } from 'react'
import { rpc, uuid, errText, boardUrl } from './api'
import type { Me, TabKey } from './Desk'
import Qr from './Qr'
import PayFields, { type Pay } from './PayFields'

const YEARS = ['FE', 'SE', 'TE', 'BE', 'PG', 'Other']
const DEPTS = ['CSE', 'IT', 'AI&DS', 'ENTC', 'ELECTRICAL', 'MECHANICAL', 'CIVIL', 'Other']

interface Done { id: string; name: string; codename: string; balance: number }

export default function Register({ me, go }: { me: Me; go: (t: TabKey, id?: string) => void }) {
  const [f, setF] = useState({ name: '', college: '', internal: false, pid: '', year: '', dept: '', phone: '', notes: '' })
  const [pay, setPay] = useState<Pay>({ credits: 1, mode: 'cash', ref: '', by: me.first_name })
  const [sugg, setSugg] = useState<string[]>([])
  const [err, setErr] = useState<{ text: string; id?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const reqId = useRef(uuid())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => () => clearTimeout(timer.current), [])
  const onCollege = (v: string) => {
    set('college', v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (v.trim().length < 1) return setSugg([])
      rpc<string[]>('desk_college_suggest', { p_q: v }).then(setSugg).catch(() => setSugg([]))
    }, 180)
  }

  const phoneOk = f.phone.replace(/\D/g, '').length >= 10
  const ready = f.name.trim() && f.college.trim() && f.year && f.dept.trim() && phoneOk && pay.credits >= 1

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !ready) return
    setBusy(true)
    setErr(null)
    try {
      const r = await rpc<any>('desk_register', {
        p_name: f.name, p_college: f.college, p_is_internal: f.internal, p_pid: f.pid, p_year: f.year, p_department: f.dept, p_phone: f.phone,
        p_amount_inr: pay.credits * me.price_inr, p_mode: pay.mode, p_payment_ref: pay.ref, p_received_by: pay.by, p_notes: f.notes, p_request_id: reqId.current,
      })
      if (r.ok) {
        setDone({ id: r.id, name: f.name.trim(), codename: r.codename, balance: r.balance })
        reqId.current = uuid()
      } else if (r.error === 'DUPLICATE_PHONE' || r.error === 'DUPLICATE_PID') {
        setErr({ text: `${r.error === 'DUPLICATE_PHONE' ? 'This phone number' : 'This PID'} is already registered to ${r.existing_name} (ID ${r.existing_id}).`, id: r.existing_id })
      } else setErr({ text: errText(r.error) })
    } catch (ex) {
      setErr({ text: 'Network problem. Nothing was saved twice; press Register again to retry safely.' })
      console.warn(ex)
    }
    setBusy(false)
  }

  const reset = () => {
    setF({ name: '', college: '', internal: false, pid: '', year: '', dept: '', phone: '', notes: '' })
    setPay({ credits: 1, mode: 'cash', ref: '', by: me.first_name })
    setDone(null)
    setErr(null)
  }

  if (done)
    return (
      <section className="dk-card dk-slip-wrap">
        <div className="dk-slip" id="dk-slip">
          <small>MOSAIC//26 · ARENA PASS</small>
          <h2>{done.name}</h2>
          <div className="dk-slip-id" aria-label="Player ID">{done.id}</div>
          <p>Enter this ID at any station. Rs {me.price_inr} = 1 run (12 minutes).</p>
          <p className="dk-slip-bal">Credits: <b>{done.balance}</b></p>
          <p>Leaderboard name: <b>{done.codename}</b></p>
          <Qr text={boardUrl()} size={120} />
          <p className="dk-slip-url">{boardUrl().replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="dk-row no-print">
          <button className="dk-btn dk-primary" onClick={() => window.print()}>Print slip</button>
          <button className="dk-btn" onClick={() => go('topup', done.id)}>Top-up</button>
          <button className="dk-btn" onClick={reset}>Register next</button>
        </div>
      </section>
    )

  return (
    <form className="dk-card dk-form" onSubmit={submit} noValidate>
      <h2>Register player</h2>
      <div className="dk-grid">
        <label>Name *<input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" name="name" /></label>
        <label>Phone *<input value={f.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" autoComplete="off" name="phone" placeholder="10 digits" /></label>
        <label>
          College *
          <input value={f.college} onChange={(e) => onCollege(e.target.value)} list="dk-colleges" autoComplete="off" name="college" />
          <datalist id="dk-colleges">{sugg.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <fieldset className="dk-seg">
          <legend>Our college?</legend>
          <label><input type="radio" name="internal" checked={f.internal} onChange={() => set('internal', true)} /> Yes</label>
          <label><input type="radio" name="internal" checked={!f.internal} onChange={() => set('internal', false)} /> No</label>
        </fieldset>
        <label>Year *
          <select value={f.year} onChange={(e) => set('year', e.target.value)} name="year">
            <option value="">Select…</option>{YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <label>Department *
          <input value={f.dept} onChange={(e) => set('dept', e.target.value)} list="dk-depts" autoComplete="off" name="department" />
          <datalist id="dk-depts">{DEPTS.map((d) => <option key={d} value={d} />)}</datalist>
        </label>
        <label>PID (optional)<input value={f.pid} onChange={(e) => set('pid', e.target.value)} autoComplete="off" name="pid" /></label>
        <label>Notes<input value={f.notes} onChange={(e) => set('notes', e.target.value)} autoComplete="off" name="notes" /></label>
      </div>
      <h3>First top-up</h3>
      <PayFields price={me.price_inr} value={pay} onChange={setPay} />
      {err && (
        <div className="dk-err" role="alert">
          {err.text} {err.id && <button type="button" className="dk-linkbtn" onClick={() => go('find', err.id)}>Open existing record</button>}
        </div>
      )}
      <button className="dk-btn dk-primary dk-big" disabled={busy || !ready}>{busy ? 'Saving…' : `Register · collect Rs ${pay.credits * me.price_inr}`}</button>
    </form>
  )
}
