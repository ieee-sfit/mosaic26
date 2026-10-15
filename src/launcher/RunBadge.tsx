import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { boardUrl } from '../lib/boardUrl'
import { getStanding, type Standing } from '../lib/kiosk'
import './runbadge.css'

/**
 * Shown over every station's end screen once a run is saved: where to see the leaderboard (URL + QR) and the player's own standing.
 * It sits in a corner, so the station's own debrief and buttons stay untouched.
 */
export default function RunBadge({ playerId, saved }: { playerId: string; saved: boolean }) {
  const url = boardUrl()
  const [svg, setSvg] = useState('')
  const [standing, setStanding] = useState<Standing | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 1, width: 112, color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    if (!saved) return
    let alive = true
    getStanding(playerId).then((s) => alive && setStanding(s))
    return () => {
      alive = false
    }
  }, [playerId, saved])

  if (!open)
    return (
      <button type="button" className="rb-tab" onClick={() => setOpen(true)} aria-label="Show leaderboard link">
        LEADERBOARD
      </button>
    )
  return (
    <aside className="rb-badge" aria-label="Leaderboard">
      <button type="button" className="rb-x" onClick={() => setOpen(false)} aria-label="Hide leaderboard link">×</button>
      <small>LIVE LEADERBOARD</small>
      <span className="rb-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <b className="rb-url">{url.replace(/^https?:\/\//, '')}</b>
      {!saved && <em>SAVING SCORE…</em>}
      {saved && standing?.ok && (
        <p data-testid="standing">
          YOU: <b>{standing.codename}</b>
          <br />
          {standing.rank ? `RANK ${standing.rank} OF ${standing.of} · ${standing.total} PTS${standing.shared ? ' (SHARED)' : ''}` : 'NOT RANKED YET'}
        </p>
      )}
    </aside>
  )
}
