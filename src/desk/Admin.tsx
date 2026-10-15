import { useState } from 'react'
import { rpc, errText, fmtTime } from './api'
import { usePoll } from './usePoll'

const SETTINGS: { key: string; label: string; hint: string }[] = [
  { key: 'price_inr', label: 'Price per run (Rs)', hint: '1 credit = 1 run' },
  { key: 'attempt_cap', label: 'Max runs per player per station', hint: '' },
  { key: 'match_medal_min_raw', label: 'Match medal needs at least (of 140)', hint: '70 = half marks' },
  { key: 'lobby_ttl_minutes', label: 'Lobby expires after (minutes)', hint: '' },
]

/** Admin only: team accounts, event settings, audit log. The server re-checks the role on every call. */
export default function Admin() {
  const members = usePoll<any[]>('admin_members', {}, 20000)
  const cfg = usePoll<Record<string, number>>('admin_config', {}, 30000)
  const audit = usePoll<any[]>('admin_audit', { p_limit: 60 }, 15000)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [pw, setPw] = useState<Record<string, string>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [vals, setVals] = useState<Record<string, string>>({})

  const run = async (fn: string, args: Record<string, unknown>, ok: string, after?: () => Promise<unknown>) => {
    try {
      const r = await rpc<any>(fn, args)
      setMsg(r.ok ? { tone: 'ok', text: ok } : { tone: 'bad', text: r.error === 'OUT_OF_RANGE' ? `Allowed range: ${r.min} to ${r.max}.` : r.error === 'WEAK_PASSWORD' ? 'Password needs at least 8 characters.' : errText(r.error) })
      if (r.ok && after) await after()
    } catch {
      setMsg({ tone: 'bad', text: 'Network problem or not an admin.' })
    }
  }

  return (
    <div className="dk-stack">
      {msg && <div className={msg.tone === 'ok' ? 'dk-ok' : 'dk-err'} role="status">{msg.text}</div>}

      <section className="dk-card">
        <h2>Team accounts</h2>
        <ul className="dk-list">
          {(members.data ?? []).map((m) => (
            <li key={m.user_id} className={m.active ? '' : 'st-voided'}>
              <b>{m.username}</b> <span className="dk-dim">{m.role}{m.active ? '' : ' · DISABLED'}</span>
              <input aria-label={`Display name for ${m.username}`} value={names[m.user_id] ?? m.display_name} onChange={(e) => setNames({ ...names, [m.user_id]: e.target.value })} style={{ maxWidth: 180 }} />
              <button className="dk-btn dk-sm" onClick={() => run('admin_member_update', { p_user: m.user_id, p_display_name: names[m.user_id] ?? m.display_name, p_active: m.active }, `Saved ${m.username}.`, members.reload)}>Save name</button>
              <button className="dk-btn dk-sm" onClick={() => run('admin_member_update', { p_user: m.user_id, p_display_name: names[m.user_id] ?? m.display_name, p_active: !m.active }, m.active ? `${m.username} disabled.` : `${m.username} enabled.`, members.reload)}>{m.active ? 'Disable' : 'Enable'}</button>
              <input aria-label={`New password for ${m.username}`} type="text" placeholder="new password" autoComplete="off" value={pw[m.user_id] ?? ''} onChange={(e) => setPw({ ...pw, [m.user_id]: e.target.value })} style={{ maxWidth: 150 }} />
              <button className="dk-btn dk-sm" disabled={(pw[m.user_id] ?? '').length < 8} onClick={() => run('admin_set_password', { p_user: m.user_id, p_password: pw[m.user_id] }, `Password reset for ${m.username}.`, async () => setPw({ ...pw, [m.user_id]: '' }))}>Reset password</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="dk-card">
        <h2>Event settings</h2>
        <div className="dk-grid">
          {SETTINGS.map((s) => (
            <div key={s.key} className="dk-stepper">
              <span>{s.label}{s.hint ? ` · ${s.hint}` : ''}</span>
              <div>
                <input aria-label={s.label} type="number" value={vals[s.key] ?? String(cfg.data?.[s.key] ?? '')} onChange={(e) => setVals({ ...vals, [s.key]: e.target.value })} style={{ maxWidth: 110 }} />
                <button className="dk-btn dk-sm" onClick={() => run('admin_config_set', { p_key: s.key, p_value: Number(vals[s.key] ?? cfg.data?.[s.key]) }, `${s.label} saved.`, cfg.reload)}>Save</button>
              </div>
            </div>
          ))}
        </div>
        <p className="dk-dim">Price changes apply to the next registration or top-up; credits already issued keep their value.</p>
      </section>

      <section className="dk-card">
        <h2>Audit log</h2>
        <div className="dk-scroll">
          <table className="dk-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Subject</th></tr></thead>
            <tbody>{(audit.data ?? []).map((a, i) => <tr key={i}><td>{fmtTime(a.at)}</td><td>{a.who}</td><td>{a.action}</td><td>{a.subject}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
