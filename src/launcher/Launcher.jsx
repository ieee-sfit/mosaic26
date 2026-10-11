import { useState } from 'react'
import { STATIONS } from './stations'
import Emblem from './Emblem'
import ClearanceModal from './ClearanceModal'
import './launcher.css'

export default function Launcher({ onEngage, onOpenLeaderboard }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const selectedStation = STATIONS.find((s) => s.id === selected)

  return (
    <main className="arc-launcher">
      <header className="arc-header">
        <span className="arc-brand">MOSAIC<b>//26</b> ARENA TERMINAL</span>
        <button type="button" className="arc-hud" onClick={onOpenLeaderboard}>
          [PUBLIC TELEMETRY / LEADERBOARD]
        </button>
      </header>

      <div className="arc-slices" onMouseLeave={() => setHovered(null)}>
        {STATIONS.map((s) => {
          const state =
            selected === s.id ? 'is-selected' : hovered === s.id ? 'is-open' : hovered ? 'is-squeezed' : ''
          return (
            <section
              key={s.id}
              className={`arc-slice ${state} ${selected && selected !== s.id ? 'is-away' : ''}`}
              style={{ '--c1': s.primary, '--c2': s.secondary }}
              onMouseEnter={() => !selected && setHovered(s.id)}
              onFocus={() => !selected && setHovered(s.id)}
            >
              <div className="arc-slice__dust" />
              <div className="arc-slice__scan" />
              <button
                type="button"
                className="arc-slice__hit"
                onClick={() => setSelected(s.id)}
                aria-label={`Initialize ${s.name}`}
              />
              <div className="arc-slice__rest">
                <span className="arc-badge">{s.code}</span>
                <span className="arc-sector">{s.sector}</span>
                <h2 className="arc-slice__name">{s.name}</h2>
              </div>
              <div className="arc-slice__intel">
                <Emblem type={s.emblem} />
                <p className="arc-class">{s.classification}</p>
                <p className="arc-brief">{s.brief}</p>
                <span className="arc-btn arc-btn--cta">[INITIALIZE TERMINAL]</span>
              </div>
            </section>
          )
        })}
      </div>

      {selectedStation && (
        <ClearanceModal
          station={selectedStation}
          onAbort={() => setSelected(null)}
          onEngage={(p1, p2) => onEngage(selectedStation.id, p1, p2)}
        />
      )}
    </main>
  )
}
