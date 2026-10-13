import { useState } from 'react'
import Station1 from './workstation1'
import Station2 from './workstation2'
import Station3 from './workstation3/Station3'
import Station4 from './workstation4'
import Launcher from './launcher/Launcher'
import Leaderboard from './launcher/Leaderboard'
import LaunchLoader from './launcher/LaunchLoader'
import CtrlFreakSplash from './launcher/CtrlFreakSplash'
import { saveRun } from './lib/saveRun'
import { normalizeStation1 } from './core/scoring'
import { SessionContext, createSession } from './session/sessionContext'

const STATION_COMPONENTS = { 1: Station1, 2: Station2, 3: Station3, 4: Station4 }

const ID_RE = /^\d{6}$/

/** Normalise each station's completion payload and hand it to Supabase (+ localStorage fallback). */
function recordRun(stationId, session, payload) {
  const isGoat = stationId === 1 // Station1 emits its own result shape
  const ops = isGoat ? payload?.operators ?? [] : []
  const pick = (own, fallback) => (ID_RE.test(own ?? '') ? own : fallback)
  // Station 1 reports on a 0-1000 scale; rescale to the shared 0-120 contract (base 100 + speed bonus 20).
  const norm = isGoat ? normalizeStation1(payload) : { raw_score: payload.raw_score, time_left: payload.time_left }
  saveRun({
    p1_id: isGoat ? pick(ops[0], session.p1_id) : payload.p1_id,
    p2_id: isGoat ? pick(ops[1], session.p2_id) : payload.p2_id,
    station_id: `station${stationId}`,
    ...norm,
  })
}

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('splash') // 'splash' | 'launcher' | 'leaderboard'
  const [launching, setLaunching] = useState(null) // { id, p1, p2 } during the pre-game countdown
  const [initialStation, setInitialStation] = useState(null)

  // The session clock starts only once the countdown finishes
  const finishLaunch = () => {
    if (!launching) return
    setSession(createSession(launching.id, launching.p1, launching.p2))
    setLaunching(null)
  }

  const returnToLauncher = () => {
    setSession(null)
    setInitialStation(null)
    setView('launcher')
  }

  const returnToSplash = () => {
    setSession(null)
    setInitialStation(null)
    setView('splash')
  }

  if (session) {
    const Station = STATION_COMPONENTS[session.stationId]
    return (
      <SessionContext.Provider value={session}>
        <Station
          key={session.startedAt}
          onComplete={(payload) => recordRun(session.stationId, session, payload)}
          onNavigateStation={returnToLauncher} // every new attempt goes back through the ID and attempt check
          onOpenStationChooser={returnToLauncher}
        />
      </SessionContext.Provider>
    )
  }

  if (launching) {
    return (
      <LaunchLoader
        stationNum={launching.id}
        p1={launching.p1}
        p2={launching.p2}
        onComplete={finishLaunch}
      />
    )
  }

  if (view === 'splash') {
    return (
      <CtrlFreakSplash
        onEnterTerminal={(stationId) => {
          setInitialStation(stationId)
          setView('launcher')
        }}
        onOpenLeaderboard={() => setView('leaderboard')}
      />
    )
  }

  if (view === 'leaderboard') return <Leaderboard onBack={returnToLauncher} />

  return (
    <Launcher
      initialSelectedStation={initialStation}
      onEngage={(id, p1, p2) => setLaunching({ id, p1, p2 })}
      onOpenLeaderboard={() => setView('leaderboard')}
      onBackToIntro={returnToSplash}
    />
  )
}

export default App
