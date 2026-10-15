import { useState } from 'react'
import { rpc } from './api'

export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const [oldPw, setOld] = useState('')
  const [newPw, setNew] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await rpc<any>('desk_change_password', { p_old: oldPw, p_new: newPw })
      setMsg(r.ok ? { tone: 'ok', text: 'Password changed. Use it next time you sign in.' } : { tone: 'bad', text: r.error === 'WRONG_PASSWORD' ? 'Current password is wrong.' : 'New password needs at least 8 characters.' })
      if (r.ok) { setOld(''); setNew('') }
    } catch {
      setMsg({ tone: 'bad', text: 'Network problem. Try again.' })
    }
    setBusy(false)
  }
  return (
    <form className="dk-card dk-form" onSubmit={submit} style={{ margin: '12px 16px' }}>
      <h2>Change my password</h2>
      <div className="dk-grid">
        <label>Current password<input type="password" value={oldPw} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" name="oldpw" /></label>
        <label>New password (8+ characters)<input type="password" value={newPw} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" name="newpw" /></label>
      </div>
      {msg && <div className={msg.tone === 'ok' ? 'dk-ok' : 'dk-err'} role="status">{msg.text}</div>}
      <div className="dk-row">
        <button className="dk-btn dk-primary" disabled={busy || !oldPw || newPw.length < 8}>Change password</button>
        <button type="button" className="dk-btn" onClick={onClose}>Close</button>
      </div>
    </form>
  )
}
