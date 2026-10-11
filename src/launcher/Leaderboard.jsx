const KEYS = [
  ['ws1_game_results_cache', 'ST-01'],
  ['ws4_game_results_cache', 'ST-04'],
]

function loadRows() {
  const rows = []
  for (const [key, tag] of KEYS) {
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(list)) list.forEach((r) => rows.push({ ...r, tag }))
    } catch {
      /* ignore corrupt cache */
    }
  }
  return rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

export default function Leaderboard({ onBack }) {
  const rows = loadRows()
  return (
    <div className="arc-board">
      <header>
        <h1>PUBLIC TELEMETRY // LEADERBOARD</h1>
        <button type="button" className="arc-hud" onClick={onBack}>[ BACK TO LAUNCHER ]</button>
      </header>
      <table>
        <thead>
          <tr><th>#</th><th>STATION</th><th>OPERATOR</th><th>SCORE</th><th>TIME LEFT</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5}>NO TRANSMISSIONS RECORDED</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              <td>{i + 1}</td>
              <td>{r.tag}</td>
              <td>{r.operator ?? '—'}</td>
              <td>{r.score ?? 0}</td>
              <td>{r.timeRemainingSeconds ?? 0}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
