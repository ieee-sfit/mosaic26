import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { rpc } from './api'
import Login from './Login'
import Register from './Register'
import Topup from './Topup'
import Find from './Find'
import Lobbies from './Lobbies'
import Medals from './Medals'
import CashReport from './CashReport'
import Admin from './Admin'
import ChangePassword from './ChangePassword'
import './desk.css'

export interface Me { username: string; display_name: string; first_name: string; role: 'desk' | 'admin'; price_inr: number; attempt_cap: number }
export type TabKey = 'register' | 'topup' | 'find' | 'lobbies' | 'medals' | 'cash' | 'admin'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'register', label: 'REGISTER' },
  { key: 'topup', label: 'TOP-UP' },
  { key: 'find', label: 'FIND' },
  { key: 'lobbies', label: 'LOBBIES' },
  { key: 'medals', label: 'MEDALS' },
  { key: 'cash', label: 'CASH REPORT' },
]
const ADMIN_TAB = { key: 'admin' as TabKey, label: 'ADMIN' }

export default function Desk() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [me, setMe] = useState<Me | null>(null)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState<TabKey>('register')
  const [focusId, setFocusId] = useState('')
  const [pwOpen, setPwOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setMe(null)
      setDenied(false)
      return
    }
    let alive = true
    rpc<Me & { ok: boolean }>('desk_me')
      .then((m) => alive && setMe(m))
      .catch(() => alive && setDenied(true))
    return () => {
      alive = false
    }
  }, [session])

  /** Jump to a tab, optionally carrying a player ID (FIND / TOP-UP open on it). */
  const go = useCallback((t: TabKey, id = '') => {
    setFocusId(id)
    setTab(t)
  }, [])

  if (session === undefined) return <div className="dk-root"><p className="dk-dim dk-pad">Loading…</p></div>
  if (!session) return <div className="dk-root"><Login /></div>
  if (denied)
    return (
      <div className="dk-root dk-login">
        <div className="dk-card">
          <h1>NOT A COMMITTEE ACCOUNT</h1>
          <p className="dk-dim">This login is not allowed to use the desk.</p>
          <button className="dk-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    )
  if (!me) return <div className="dk-root"><p className="dk-dim dk-pad">Loading…</p></div>

  return (
    <div className="dk-root">
      <header className="dk-head">
        <div>
          <b className="dk-brand">MOSAIC<i>//26</i> DESK</b>
          <span className="dk-dim"> · {me.display_name}{me.role === 'admin' ? ' (admin)' : ''} · Rs {me.price_inr}/run</span>
        </div>
        <div className="dk-head-r">
          <a className="dk-link" href="#/">Leaderboard</a>
          <button className="dk-btn dk-sm" onClick={() => setPwOpen(!pwOpen)}>Password</button>
          <button className="dk-btn dk-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      <nav className="dk-tabs" role="tablist">
        {(me.role === 'admin' ? [...TABS, ADMIN_TAB] : TABS).map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => go(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="dk-main">
        {tab === 'register' && <Register me={me} go={go} />}
        {tab === 'topup' && <Topup me={me} initialId={focusId} />}
        {tab === 'find' && <Find me={me} go={go} initialId={focusId} />}
        {tab === 'lobbies' && <Lobbies />}
        {tab === 'medals' && <Medals />}
        {tab === 'cash' && <CashReport />}
        {tab === 'admin' && me.role === 'admin' && <Admin />}
      </main>
    </div>
  )
}
