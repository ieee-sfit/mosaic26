import { useState } from 'react'
import Station1 from './workstation1'
import Station2 from './workstation2'
import Station3 from './workstation3/Station3'
import Station4 from './workstation4'
import Launcher from './launcher/Launcher'
import Leaderboard from './launcher/Leaderboard'
import LaunchLoader from './launcher/LaunchLoader'
import RunBadge from './launcher/RunBadge'
import LobbyResult from './launcher/LobbyResult'
import CtrlFreakSplash from './launcher/CtrlFreakSplash'
import IntroCinematic from './launcher/IntroCinematic'
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
  const [view, setView] = useState('intro') // 'intro' | 'splash' | 'launcher' | 'leaderboard'
  const [launching, setLaunching] = useState(null) // { id, playerId, runId } during the pre-game countdown
  const [initialStation, setInitialStation] = useState(null)
  const [done, setDone] = useState('no') // 'no' | 'saving' | 'saved': the finished run is being sent, or has been sent / queued

  // The session clock starts only once the countdown finishes
  const begin = (stationId, playerId, runId, extra) => {
    setDone('no')
    setSession(createSession(stationId, playerId, runId, extra))
    setLaunching(null)
  }
  const finishLaunch = () => launching && begin(launching.id, launching.playerId, launching.runId)

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
          onComplete={(payload) => {
            setDone('saving')
            recordRun(session.stationId, session, payload).finally(() => setDone('saved'))
          }}
          onNavigateStation={returnToLauncher} // every new attempt goes back through the ID and attempt check
          onOpenStationChooser={returnToLauncher}
        />
        {done !== 'no' && (
          <div className="rb-dock">
            <RunBadge playerId={session.player_id} saved={done === 'saved'} />
            {done === 'saved' && session.lobbyId && <LobbyResult playerId={session.player_id} lobbyId={session.lobbyId} />}
          </div>
        )}
      </SessionContext.Provider>
    )
  }

  if (launching) {
    return <LaunchLoader stationNum={launching.id} playerId={launching.playerId} onComplete={finishLaunch} />
  }

  if (view === 'intro') {
    return (
      <IntroCinematic
        onComplete={() => setView('splash')}
      />
    )
  }

  if (view === 'splash') {
    return (
      <CtrlFreakSplash
        onEnterTerminal={() => {
          setInitialStation(null)
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
      // A versus lobby has already run its own synchronized countdown, so it starts the session at once
      onEngage={(id, playerId, runId, extra) => (extra?.lobbyId ? begin(id, playerId, runId, extra) : setLaunching({ id, playerId, runId }))}
      onOpenLeaderboard={() => setView('leaderboard')}
      onBackToIntro={returnToSplash}
    />
  )
}

export default App
