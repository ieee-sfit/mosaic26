import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './leaderboard.css'

interface Scores { rank: number; stations: number; s1: number; s2: number; s3: number; s4: number; final: number; time_total: number }
interface PlayerRow extends Scores { tag: string }
interface TeamRow extends Scores { tag1: string; tag2: string }
interface Profile extends PlayerRow { total: number; runs: number; partners: number }

const POLL_MS = 10000
const STATIONS = [
  { key: 's1', short: 'GOAT', cls: 'st1' },
  { key: 's2', short: 'F1', cls: 'st2' },
  { key: 's3', short: 'TRACE', cls: 'st3' },
  { key: 's4', short: 'A51', cls: 'st4' },
] as const
const MULT: Record<number, number> = { 4: 1.6, 3: 1.35, 2: 1.15 }
const mult = (n: number) => MULT[n] ?? 1

const ADJ = ['IRON', 'NEON', 'VANTA', 'COBALT', 'SOLAR', 'GHOST', 'APEX', 'ROGUE', 'LUNAR', 'ZENITH', 'EMBER', 'VOID']
const NOUN = ['FALCON', 'SPECTRE', 'RAVEN', 'COMET', 'VIPER', 'WARDEN', 'PILOT', 'ORBIT', 'LYNX', 'BEACON', 'DRIFTER', 'SENTINEL']
const BEST_STATION = [
  'Milano bridge navigator, at home in the noise',
  'pit-wall strategist who keeps the stream alive',
  'midnight interceptor with a radar-sharp eye',
  'airlock warden, calm while the lab burns',
]

function codename(tag: string): string {
  const d = tag.replace(/\D/g, '')
  const n = Number(d) || 0
  return `${ADJ[n % ADJ.length]} ${NOUN[Math.floor(n / 7) % NOUN.length]}`
}

function lore(p: Profile): { title: string; line: string; next: string | null } {
  const scores = [p.s1, p.s2, p.s3, p.s4]
  const best = scores.indexOf(Math.max(...scores))
  const title = ['ROOKIE', 'OPERATOR', 'SPECIALIST', 'ACE', 'LEGEND'][Math.min(p.stations, 4)]
  const line =
    p.stations === 0
      ? 'Registered, but has not cleared a station yet.'
      : `${p.stations === 4 ? 'Cleared every station. ' : ''}Best work so far: ${BEST_STATION[best]}.`
  const raw = scores.reduce((a, b) => a + b, 0)
  let next: string | null = null
  if (p.stations < 4 && p.stations > 0) {
    const gain = Math.round(raw * (mult(p.stations + 1) - mult(p.stations)))
    next = `Clear one more station to unlock x${mult(p.stations + 1).toFixed(2)} (+${gain} pts before the new station's own score).`
  } else if (p.stations === 0) next = 'Clear any station to get on the board.'
  return { title, line, next }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function Pips({ row }: { row: Scores }) {
  return (
    <div className="lb-pips" role="img" aria-label="Score per station">
      {STATIONS.map((s) => {
        const v = row[s.key]
        return (
          <span key={s.key} className={`lb-pip ${s.cls} ${v ? 'on' : ''}`}>
            <i style={{ ['--fill' as string]: `${Math.min(100, (v / 120) * 100)}%` }} />
            <b>{v || '–'}</b>
            <em>{s.short}</em>
          </span>
        )
      })}
    </div>
  )
}

function Card({ rank, label, row, hit }: { rank: number; label: React.ReactNode; row: Scores; hit?: boolean }) {
  return (
    <article className={`lb-card ${rank <= 3 ? `top top-${rank}` : ''} ${hit ? 'hit' : ''}`}>
      <div className="lb-rank">{rank}</div>
      <div className="lb-main">
        <div className="lb-ids">{label}</div>
        <div className="lb-meta">
          <span className="lb-cov">{row.stations}/4 · x{mult(row.stations).toFixed(2)}</span>
          <span>{mmss(row.time_total)} left</span>
        </div>
        <Pips row={row} />
      </div>
      <div className="lb-final"><b>{row.final.toLocaleString()}</b><small>PTS</small></div>
    </article>
  )
}

export default function Leaderboard({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<'teams' | 'players'>('teams')
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState<Profile | null | 'none'>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('LEADERBOARD OFFLINE (SERVER NOT CONFIGURED)')
      setLoaded(true)
      return
    }
    const [t, p] = await Promise.all([
      supabase.rpc('board_teams', { p_limit: 100 }),
      supabase.rpc('board_players', { p_limit: 100 }),
    ])
    if (t.error || p.error) setError((t.error || p.error)!.message.toUpperCase())
    else {
      setError(null)
      setTeams((t.data ?? []) as TeamRow[])
      setPlayers((p.data ?? []) as PlayerRow[])
      setUpdated(new Date())
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const id = setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const onSearch = (raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, 6)
    setInput(v)
    clearTimeout(searchTimer.current)
    if (v.length < 6) {
      setProfile(null)
      return
    }
    setTab('players')
    searchTimer.current = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('player_profile', { p_id: v })
      if (err) return setError(err.message.toUpperCase())
      const row = (data as Profile[] | null)?.[0]
      setProfile(row ?? 'none')
    }, 200)
  }

  const story = useMemo(() => (profile && profile !== 'none' ? lore(profile) : null), [profile])
  const live = !error && loaded

  return (
    <div className="lb-root">
      <header className="lb-header">
        <div className="lb-brandrow">
          {onBack ? <button type="button" className="lb-back" onClick={onBack}>[ ← BACK ]</button> : <span className="lb-brand">MOSAIC<b>//26</b></span>}
          <span className={`lb-live ${live ? 'on' : ''}`}>{live ? 'LIVE' : error ? 'OFFLINE' : 'SYNC'}</span>
        </div>
        <h1 className="lb-title">PUBLIC TELEMETRY</h1>
        <p className="lb-sub">Best run per station, summed, then multiplied for coverage: 2 stations x1.15 · 3 x1.35 · 4 x1.60</p>
        <div className="lb-search">
          <input
            inputMode="numeric"
            maxLength={6}
            value={input}
            placeholder="FIND PLAYER · 6-DIGIT ID"
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search by player ID"
          />
        </div>
        <div className="lb-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'teams'} className={tab === 'teams' ? 'on' : ''} onClick={() => setTab('teams')}>TEAMS</button>
          <button role="tab" aria-selected={tab === 'players'} className={tab === 'players' ? 'on' : ''} onClick={() => setTab('players')}>PLAYERS</button>
        </div>
      </header>

      {error && <div className="lb-error">⚠ {error}</div>}

      <main className="lb-body">
        {tab === 'players' && profile === 'none' && <div className="lb-empty">NO RECORD FOR ID {input}. IT MAY NOT HAVE PLAYED YET.</div>}
        {tab === 'players' && profile && profile !== 'none' && story && (
          <section className="lb-profile">
            <div className="lb-p-head">
              <div>
                <small>OPERATOR DOSSIER · {profile.tag}</small>
                <h2>{codename(profile.tag)}</h2>
                <span className="lb-chip">{story.title}</span>
              </div>
              <div className="lb-p-rank"><b>#{profile.rank}</b><small>OF {profile.total} PLAYERS</small></div>
            </div>
            <p className="lb-p-line">{story.line}</p>
            <Pips row={profile} />
            <dl className="lb-p-stats">
              <div><dt>FINAL SCORE</dt><dd>{profile.final.toLocaleString()}</dd></div>
              <div><dt>STATIONS</dt><dd>{profile.stations}/4</dd></div>
              <div><dt>RUNS PLAYED</dt><dd>{profile.runs}</dd></div>
              <div><dt>PARTNERS</dt><dd>{profile.partners}</dd></div>
            </dl>
            {story.next && <p className="lb-p-next">▶ {story.next}</p>}
            <p className="lb-p-note">Individual rank ignores teams: it is this player's own best score per station against every other player.</p>
          </section>
        )}

        {!loaded && <div className="lb-empty">ACQUIRING TELEMETRY…</div>}
        {loaded && !error && (tab === 'teams' ? teams : players).length === 0 && <div className="lb-empty">NO RUNS RECORDED YET</div>}

        <div className="lb-list">
          {tab === 'teams' &&
            teams.map((r) => (
              <Card key={`${r.tag1}${r.tag2}${r.rank}`} rank={r.rank} row={r} label={<><span>{r.tag1}</span><i>+</i><span>{r.tag2}</span></>} />
            ))}
          {tab === 'players' &&
            players.map((r) => (
              <Card key={`${r.tag}${r.rank}`} rank={r.rank} row={r} hit={!!profile && profile !== 'none' && profile.tag === r.tag} label={<span>{r.tag} <em className="lb-code">{codename(r.tag)}</em></span>} />
            ))}
        </div>
      </main>
      <footer className="lb-foot">{updated ? `UPDATED ${updated.toLocaleTimeString('en-GB')} · REFRESHES EVERY 10 S` : 'CONNECTING…'}</footer>
    </div>
  )
}
