import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './leaderboard.css'

interface Standing {
  op1: string
  op2: string
  stations_cleared: number
  s1_score: number
  s2_score: number
  s3_score: number
  s4_score: number
  raw_total: number
  total_time_left: number
  final_score: number
}

const POLL_MS = 8000
const MULTIPLIERS: Record<number, number> = { 4: 1.6, 3: 1.35, 2: 1.15 }
const multiplier = (n: number) => MULTIPLIERS[n] ?? 1
const SEGMENTS = [
  { key: 's1_score', label: 'S1', cls: 'seg-s1' },
  { key: 's2_score', label: 'S2', cls: 'seg-s2' },
  { key: 's3_score', label: 'S3', cls: 'seg-s3' },
  { key: 's4_score', label: 'S4', cls: 'seg-s4' },
] as const

function ScoreBar({ row }: { row: Standing }) {
  const total = SEGMENTS.reduce((a, s) => a + (row[s.key] || 0), 0)
  return (
    <div className="lb-bar" role="img" aria-label="Score distribution across stations">
      {total === 0 && <div className="lb-seg seg-empty" style={{ width: '100%' }} />}
      {SEGMENTS.map((s) => {
        const v = row[s.key] || 0
        if (!v) return null
        return (
          <div
            key={s.key}
            className={`lb-seg ${s.cls}`}
            style={{ width: `${(v / total) * 100}%` }}
            title={`${s.label}: ${v}`}
          />
        )
      })}
    </div>
  )
}

function Badge({ row }: { row: Standing }) {
  return (
    <span className="lb-badge">
      {row.stations_cleared}/4 [{multiplier(row.stations_cleared).toFixed(2)}x]
    </span>
  )
}

export default function Leaderboard({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<Standing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('SUPABASE NOT CONFIGURED — SET VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
      setLoaded(true)
      return
    }
    let cancelled = false
    const load = async () => {
      const { data, error: err } = await supabase.from('leaderboard_standings').select('*')
      if (cancelled) return
      if (err) setError(err.message.toUpperCase())
      else {
        setError(null)
        setRows((data ?? []) as Standing[])
      }
      setLoaded(true)
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Debounced filter: applies when exactly 6 digits are typed, or cleared.
  const onSearch = (raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, 6)
    setInput(v)
    clearTimeout(timer.current)
    if (v.length === 6 || v.length === 0) timer.current = setTimeout(() => setQuery(v), 250)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows])
  const match = query ? ranked.find((r) => r.op1 === query || r.op2 === query) : undefined
  const top = ranked.slice(0, 50)

  return (
    <div className="lb-root">
      <header className="lb-header">
        <button type="button" className="lb-back" onClick={onBack}>[ &lt; RETURN TO TERMINALS ]</button>
        <h1 className="lb-title">PUBLIC TELEMETRY // LEADERBOARD</h1>
        <input
          className="lb-search"
          inputMode="numeric"
          maxLength={6}
          value={input}
          placeholder="[ SEARCH OPERATOR ID ]"
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search operator ID"
        />
      </header>

      {error && <div className="lb-error">⚠ {error}</div>}

      {query && (
        <section className="lb-pinned">
          {match ? (
            <>
              <div className="lb-pinned-tag">OPERATOR {query} LOCATED</div>
              <div className="lb-pinned-main">
                <span className="lb-rank">#{match.rank}</span>
                <span className="lb-ids">OP1: {match.op1} | OP2: {match.op2}</span>
                <Badge row={match} />
                <span className="lb-score">{Number(match.final_score).toLocaleString()}</span>
              </div>
              <div className="lb-pinned-sub">
                STATIONS CLEARED {match.stations_cleared}/4 · MULTIPLIER {multiplier(match.stations_cleared).toFixed(2)}x
              </div>
              <ScoreBar row={match} />
            </>
          ) : (
            <div className="lb-pinned-tag">NO TEAM FOUND FOR OPERATOR {query}</div>
          )}
        </section>
      )}

      <div className="lb-legend">
        {SEGMENTS.map((s) => (
          <span key={s.key}><i className={`lb-dot ${s.cls}`} />{s.label}</span>
        ))}
      </div>

      <div className="lb-table">
        <div className="lb-row lb-head">
          <span>#</span><span>OPERATORS</span><span>CLEARED</span><span>SCORE DISTRIBUTION</span><span>FINAL</span>
        </div>
        {!loaded && <div className="lb-empty">ACQUIRING TELEMETRY…</div>}
        {loaded && top.length === 0 && !error && <div className="lb-empty">NO RUNS RECORDED YET</div>}
        {top.map((r) => (
          <div key={`${r.op1}-${r.op2}`} className={`lb-row${match?.rank === r.rank ? ' lb-hit' : ''}`}>
            <span className="lb-rank">{r.rank}</span>
            <span className="lb-ids">OP1: {r.op1} | OP2: {r.op2}</span>
            <Badge row={r} />
            <ScoreBar row={r} />
            <span className="lb-score">{Number(r.final_score).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
