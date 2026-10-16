import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usernameToEmail } from './api'

export default function Login() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !user.trim() || !pass) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(user), password: pass })
    if (error) {
      const m = error.message || ''
      setErr(/too many|rate|attempts/i.test(m) ? m : 'Wrong username or password.')
      setPass('')
    }
    setBusy(false)
  }

  return (
    <main className="dk-login">
      <form className="dk-card" onSubmit={submit}>
        <h1>COMMITTEE DESK</h1>
        <p className="dk-dim">MOSAIC//26 · sign in with your desk username</p>
        <label>
          Username
          <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="desk01" name="username" />
        </label>
        <label>
          Password
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" name="password" />
        </label>
        {err && <div className="dk-err" role="alert">{err}</div>}
        <button className="dk-btn dk-primary" disabled={busy || !user.trim() || !pass}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="dk-dim dk-back" href="#/">← back to leaderboard</a>
      </form>
    </main>
  )
}
