import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { SCORING } from '../core/scoring'
import './leaderboard.css'

interface OverallRow {
  rank: number
  shared: boolean
  codename: string
  s1: number
  s2: number
  s3: number
  s4: number
  total: number
  hints: number
  wrong: number
  time_left: number
  attempts: number
}
interface StationRow { rank: number; codename: string; score: number; hints: number; wrong: number; time_left: number; finished_at: string }
interface Winner { codename: string; total: number; status: 'won' | 'toss' }
interface WindowRow { id: number; label: string; starts_at: string; ends_at: string; medals: number; closed: boolean; winners: Winner[] }
interface WindowsData {
  now: string
  live: { id: number; label: string; ends_at: string; seconds_left: number; medals: number; leader: { codename: string; total: number; tied: boolean } | null } | null
  next: { label: string; starts_at: string } | null
  windows: WindowRow[]
}
interface FoundRow { rank: number; shared: boolean; codename: string; total: number; of_players: number }

const POLL_MS = 10000
const STATIONS = [
  { key: 's1', id: 'station1', short: 'GOAT', long: 'GOAT ANC', cls: 'st1' },
  { key: 's2', id: 'station2', short: 'F1', long: 'F1 STREAM', cls: 'st2' },
  { key: 's3', id: 'station3', short: 'TRACE', long: 'eCHALLAN', cls: 'st3' },
  { key: 's4', id: 'station4', short: 'A51', long: 'AREA 51', cls: 'st4' },
] as const
type Tab = 'overall' | 'stations' | 'medals'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })

function Pips({ row }: { row: Pick<OverallRow, 's1' | 's2' | 's3' | 's4'> }) {
  return (
    <div className="lb-pips" role="img" aria-label="Best score per station">
      {STATIONS.map((s) => {
        const v = row[s.key]
        return (
          <span key={s.key} className={`lb-pip ${s.cls} ${v ? 'on' : ''}`}>
            <i style={{ ['--fill' as string]: `${Math.min(100, (v / SCORING.rawMax) * 100)}%` }} />
            <b>{v || '–'}</b>
            <em>{s.short}</em>
          </span>
        )
      })}
    </div>
  )
}

const Rank = ({ n, shared }: { n: number; shared?: boolean }) => (
  <div className="lb-rank">
    {n}
    {shared && <small className="lb-shared" title="Tied on every tiebreaker: shared rank, decided by a live coin toss">SHARED</small>}
  </div>
)

function Card({ rank, shared, name, total, meta, pips, hit }: { rank: number; shared?: boolean; name: string; total: number; meta: string; pips?: OverallRow; hit?: boolean }) {
  return (
    <article className={`lb-card ${rank <= 3 ? `top top-${rank}` : ''} ${hit ? 'hit' : ''}`}>
      <Rank n={rank} shared={shared} />
      <div className="lb-main">
        <div className="lb-ids"><span>{name}</span></div>
        <div className="lb-meta"><span>{meta}</span></div>
        {pips && <Pips row={pips} />}
      </div>
      <div className="lb-final"><b>{total.toLocaleString()}</b><small>PTS</small></div>
    </article>
  )
}

export default function Leaderboard({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<Tab>('overall')
  const [stationTab, setStationTab] = useState<(typeof STATIONS)[number]['id']>('station1')
  const [overall, setOverall] = useState<OverallRow[]>([])
  const [byStation, setByStation] = useState<StationRow[]>([])
  const [wins, setWins] = useState<WindowsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [input, setInput] = useState('')
  const [found, setFound] = useState<FoundRow[] | null>(null)
  const [, setTick] = useState(0)
  const offset = useRef(0) // server clock minus this device's clock
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refetchedAt = useRef('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('LEADERBOARD OFFLINE (SERVER NOT CONFIGURED)')
      setLoaded(true)
      return
    }
    const [o, w, s] = await Promise.all([
      supabase.rpc('board_overall', { p_limit: 100 }),
      supabase.rpc('public_windows'),
      tab === 'stations' ? supabase.rpc('board_station', { p_station: stationTab, p_limit: 100 }) : Promise.resolve(null),
    ])
    const err = o.error || w.error || s?.error
    if (err) setError(err.message.toUpperCase())
    else {
      setError(null)
      setOverall((o.data ?? []).map((r: OverallRow) => ({ ...r, rank: Number(r.rank) })))
      const wd = w.data as WindowsData
      offset.current = new Date(wd.now).getTime() - Date.now()
      setWins(wd)
      if (s) setByStation((s.data ?? []).map((r: StationRow) => ({ ...r, rank: Number(r.rank) })))
      setUpdated(new Date())
    }
    setLoaded(true)
  }, [tab, stationTab])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const id = setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  // Countdown ticks locally every second; at zero, refresh once so the next window (and the closed result) appears.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const liveLeft = wins?.live ? Math.max(0, Math.floor((new Date(wins.live.ends_at).getTime() - (Date.now() + offset.current)) / 1000)) : null
  useEffect(() => {
    if (wins?.live && liveLeft === 0 && refetchedAt.current !== wins.live.ends_at) {
      refetchedAt.current = wins.live.ends_at
      setTimeout(() => void load(), 1500)
    }
  }, [liveLeft, wins, load])

  const onSearch = (raw: string) => {
    const v = raw.slice(0, 30)
    setInput(v)
    clearTimeout(searchTimer.current)
    if (v.trim().length < 3) return setFound(null)
    searchTimer.current = setTimeout(async () => {
      const { data, error: e } = await supabase.rpc('board_find', { p_q: v })
      if (e) return setError(e.message.toUpperCase())
      setFound(((data ?? []) as FoundRow[]).map((r) => ({ ...r, rank: Number(r.rank), of_players: Number(r.of_players) })))
    }, 250)
  }

  const live = !error && loaded
  const meta = (hints: number, wrong: number, left: number) => `${hints} HINT${hints === 1 ? '' : 'S'} · ${wrong} WRONG · ${mmss(left)} LEFT`
  const closed = (wins?.windows ?? []).filter((w) => w.closed && w.winners.length > 0)

  return (
    <div className="lb-root">
      <header className="lb-header">
        <div className="lb-brandrow">
          {onBack ? <button type="button" className="lb-back" onClick={onBack}>[ ← BACK ]</button> : <span className="lb-brand">MOSAIC<b>//26</b></span>}
          <span className={`lb-live ${live ? 'on' : ''}`}>{live ? 'LIVE' : error ? 'OFFLINE' : 'SYNC'}</span>
        </div>
        <h1 className="lb-title">PUBLIC TELEMETRY</h1>
        <p className="lb-sub">Your score = your best run on each of the four stations, added up (max {SCORING.rawMax * 4}). Playing more only helps if you beat an earlier best.</p>

        {wins?.live ? (
          <section className="lb-rush" aria-label="Live medal window" data-testid="live-window">
            <div className="lb-rush-top"><small>GOLD RUSH · LIVE WINDOW</small><b className="lb-count" data-testid="countdown">{mmss(liveLeft ?? 0)}</b></div>
            <div className="lb-rush-main">
              <span>{wins.live.label} · {wins.live.medals} medal{wins.live.medals === 1 ? '' : 's'}</span>
              <span className="lb-rush-lead">{wins.live.leader ? <>LEADING: <b>{wins.live.leader.codename}</b> · {wins.live.leader.total}{wins.live.leader.tied ? ' (TIED)' : ''}</> : 'NO FINISHED RUN YET: FINISH ONE TO ENTER'}</span>
            </div>
          </section>
        ) : wins?.next ? (
          <section className="lb-rush is-idle" aria-label="Next medal window"><small>NEXT GOLD RUSH WINDOW</small><span>{wins.next.label.replace(/^D\d /, '')} · starts {clock(wins.next.starts_at)}</span></section>
        ) : null}

        <div className="lb-search">
          <input value={input} placeholder="FIND A CODENAME · e.g. IRON FALCON" onChange={(e) => onSearch(e.target.value)} aria-label="Find a codename" />
        </div>
        <div className="lb-tabs" role="tablist">
          {([['overall', 'OVERALL'], ['stations', 'STATIONS'], ['medals', 'MEDALS']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {tab === 'stations' && (
          <div className="lb-subtabs" role="tablist" aria-label="Station">
            {STATIONS.map((s) => (
              <button key={s.id} role="tab" aria-selected={stationTab === s.id} className={`${stationTab === s.id ? 'on' : ''} ${s.cls}`} onClick={() => setStationTab(s.id)}>{s.long}</button>
            ))}
          </div>
        )}
      </header>

      {error && <div className="lb-error">⚠ {error}</div>}

      <main className="lb-body">
        {found && (
          <section className="lb-found" aria-label="Search results">
            {found.length === 0 && <div className="lb-empty">NO CODENAME MATCHES "{input.toUpperCase()}"</div>}
            {found.map((f) => (
              <div key={f.codename} className="lb-found-row"><b>{f.codename}</b><span>RANK {f.rank} OF {f.of_players}{f.shared ? ' (SHARED)' : ''} · {f.total} PTS</span></div>
            ))}
          </section>
        )}

        {!loaded && <div className="lb-empty">ACQUIRING TELEMETRY…</div>}

        {tab === 'overall' && (
          <>
            {loaded && !error && overall.length === 0 && <div className="lb-empty">NO RUNS RECORDED YET</div>}
            <div className="lb-list">
              {overall.map((r) => (
                <Card key={r.codename} rank={r.rank} shared={r.shared} name={r.codename} total={r.total} pips={r} meta={meta(r.hints, r.wrong, r.time_left)}
                  hit={!!found?.some((f) => f.codename === r.codename)} />
              ))}
            </div>
            <p className="lb-note">Ties are broken by: fewer hints, fewer wrong attempts, more time left, fewer attempts used. Still level? SHARED rank, decided by a live coin toss.</p>
          </>
        )}

        {tab === 'stations' && (
          <>
            {loaded && !error && byStation.length === 0 && <div className="lb-empty">NO RUNS ON THIS STATION YET</div>}
            <div className="lb-list">
              {byStation.map((r) => (
                <Card key={r.codename} rank={r.rank} name={r.codename} total={r.score} meta={meta(r.hints, r.wrong, r.time_left)} hit={!!found?.some((f) => f.codename === r.codename)} />
              ))}
            </div>
            <p className="lb-note">Each player's best run on this station. Ties: fewer hints, fewer wrong attempts, more time left, earlier finish.</p>
          </>
        )}

        {tab === 'medals' && (
          <section className="lb-medals" data-testid="medals">
            {closed.length === 0 && <div className="lb-empty">NO MEDAL WINNERS YET. WINDOWS CLOSE ON THE CLOCK.</div>}
            {closed.map((w) => (
              <div key={w.id} className="lb-medal-row">
                <small>{w.label} · {w.medals} medal{w.medals === 1 ? '' : 's'}</small>
                {w.winners.map((x) => (
                  <div key={x.codename}><b>🏅 {x.codename}</b><span>{x.total} PTS{x.status === 'toss' ? ' · COIN TOSS PENDING' : ''}</span></div>
                ))}
              </div>
            ))}
            {(wins?.windows ?? []).some((w) => !w.closed) && <p className="lb-note">One window medal per person. Windows still open or upcoming are not listed until they close.</p>}
          </section>
        )}
      </main>
      <footer className="lb-foot">
        {updated ? `UPDATED ${updated.toLocaleTimeString('en-GB')} · REFRESHES EVERY 10 S` : 'CONNECTING…'}
        {!onBack && <> · <a className="lb-committee" href="#/desk">COMMITTEE</a></>}
      </footer>
    </div>
  )
}
