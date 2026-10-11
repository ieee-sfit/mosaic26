import { useState } from 'react'
import Station1 from './workstation1'
import Station2 from './workstation2'
import Station3 from './workstation3/Station3'
import Station4 from './workstation4'
import Launcher from './launcher/Launcher'
import Leaderboard from './launcher/Leaderboard'
import { SessionContext, createSession } from './session/sessionContext'

const STATION_COMPONENTS = { 1: Station1, 2: Station2, 3: Station3, 4: Station4 }

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('launcher') // 'launcher' | 'leaderboard'

  const returnToLauncher = () => {
    setSession(null)
    setView('launcher')
  }

  if (session) {
    const Station = STATION_COMPONENTS[session.stationId]
    return (
      <SessionContext.Provider value={session}>
        <Station
          key={session.startedAt}
          onNavigateStation={(id) => setSession({ ...createSession(id, session.p1_id, session.p2_id) })}
          onOpenStationChooser={returnToLauncher}
        />
      </SessionContext.Provider>
    )
  }

  if (view === 'leaderboard') return <Leaderboard onBack={returnToLauncher} />

  return (
    <Launcher
      onEngage={(id, p1, p2) => setSession(createSession(id, p1, p2))}
      onOpenLeaderboard={() => setView('leaderboard')}
    />
  )
}

export default App
