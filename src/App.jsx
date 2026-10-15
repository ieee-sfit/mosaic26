import { useState } from 'react'
import Station1 from './workstation1'
import Station2 from './workstation2'
import Station3 from './workstation3/Station3'
import Station4 from './workstation4'
import Launcher from './launcher/Launcher'
import Leaderboard from './launcher/Leaderboard'
import LaunchLoader from './launcher/LaunchLoader'
import RunBadge from './launcher/RunBadge'
import { saveRun } from './lib/saveRun'
import { normalizeStation1 } from './core/scoring'
import { SessionContext, createSession } from './session/sessionContext'

const STATION_COMPONENTS = { 1: Station1, 2: Station2, 3: Station3, 4: Station4 }

/** Normalise each station's completion payload and hand it to Supabase (+ localStorage fallback). Resolves once the save was attempted. */
function recordRun(stationId, session, payload) {
  const isGoat = stationId === 1 // Station1 emits its own result shape
  // Station 1 reports points on its own base; rescale to the shared contract: base 100 + frozen speed bonus 20 + Module D 20 = 0..140.
  const norm = isGoat ? normalizeStation1(payload) : { raw_score: payload.raw_score, time_left: payload.time_left }
  return saveRun({
    run_id: session.runId,
    player_id: session.player_id,
    station_id: `station${stationId}`,
    ...norm,
    hints_used: (isGoat ? payload.hintsUsed : payload.hints_used) ?? 0,
    wrong_attempts: (isGoat ? payload.wrongAttempts : payload.wrong_attempts) ?? 0,
  })
}

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('launcher') // 'launcher' | 'leaderboard'
  const [launching, setLaunching] = useState(null) // { id, playerId, runId } during the pre-game countdown
  const [done, setDone] = useState('no') // 'no' | 'saving' | 'saved': the finished run is being sent, or has been sent / queued

  // The session clock starts only once the countdown finishes
  const finishLaunch = () => {
    if (!launching) return
    setDone('no')
    setSession(createSession(launching.id, launching.playerId, launching.runId))
    setLaunching(null)
  }

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
          onComplete={(payload) => {
            setDone('saving')
            recordRun(session.stationId, session, payload).finally(() => setDone('saved'))
          }}
          onNavigateStation={returnToLauncher} // every new attempt goes back through the ID and attempt check
          onOpenStationChooser={returnToLauncher}
        />
        {done !== 'no' && <RunBadge playerId={session.player_id} saved={done === 'saved'} />}
      </SessionContext.Provider>
    )
  }

  if (launching) {
    return <LaunchLoader stationNum={launching.id} playerId={launching.playerId} onComplete={finishLaunch} />
  }

  if (view === 'leaderboard') return <Leaderboard onBack={returnToLauncher} />

  return (
    <Launcher
      onEngage={(id, playerId, runId) => setLaunching({ id, playerId, runId })}
      onOpenLeaderboard={() => setView('leaderboard')}
    />
  )
}

export default App
